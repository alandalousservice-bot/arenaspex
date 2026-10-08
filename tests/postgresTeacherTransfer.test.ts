import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Opt-in only. No DB/service is imported in ordinary runs. Both Prisma URLs
// are explicitly overridden for CLI and runtime; repository .env cannot select a DB.
// The operator must first create a NEW local PostgreSQL cluster and empty DB.
const gateUrl = process.env.ARENASPEX_POSTGRES_GATE_URL;
const gateRoot = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
const migrationName = '20261006220000_inspector_assignment_transfers';
const report: Record<string, unknown> = {};
let db: PrismaClient;
let server: Server;
let httpUrl: string;
let service: typeof import('../src/server/assignmentTransferService');
let assignment: typeof import('../src/server/assignmentService');
let signSession: typeof import('../src/server/auth').signSession;
let originalTransaction: PrismaClient['$transaction'];
let migrationSnapshot: Record<string, string>;

// PDF parsing is unrelated; all Prisma clients, transactions, services, routes,
// authentication and authorization below are REAL (no database mocks).
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => { throw new Error('PDF outside PostgreSQL gate'); },
  StudentRosterPdfImportError: class extends Error {},
}));

function cli(args: string[]) {
  return execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), ...args], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, DATABASE_URL: gateUrl!, DIRECT_DATABASE_URL: gateUrl! },
  });
}

async function snapshots() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename NOT IN ('_prisma_migrations', 'InspectorAssignmentTransfer') ORDER BY tablename`;
  const result: Record<string, string> = {};
  for (const { tablename } of tables) {
    const rows = await db.$queryRawUnsafe<unknown[]>(`SELECT to_jsonb(t) AS row FROM "${tablename.replaceAll('"', '""')}" t ORDER BY to_jsonb(t)::text`);
    result[tablename] = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  }
  return result;
}

async function fixture() {
  await db.$executeRawUnsafe('TRUNCATE "InspectorAssignmentTransfer", "InspectorAssignment", "User", "Directorate", "InspectionVisitRecord", "InspectorNote", "LessonPlan", "NotebookEntry" CASCADE');
  for (const suffix of ['a', 'b', 'c']) {
    await db.directorate.create({ data: { id: `dir-${suffix}`, name: `Synthetic Directorate ${suffix}` } });
    await db.inspectionDistrict.create({ data: { id: `district-${suffix}`, name: `Synthetic District ${suffix}`, directorateId: `dir-${suffix}` } });
    await db.municipality.create({ data: { id: `mun-${suffix}`, name: `Synthetic Municipality ${suffix}`, directorateId: `dir-${suffix}` } });
    await db.school.create({ data: { id: `school-${suffix}`, name: `Synthetic School ${suffix}`, municipalityId: `mun-${suffix}`, inspectionDistrictId: `district-${suffix}` } });
  }
  await db.school.create({ data: { id: 'school-a2', name: 'Synthetic alternate school', municipalityId: 'mun-a', inspectionDistrictId: 'district-a' } });
  for (const [id, role, suffix] of [['T', 'teacher', 'a'], ['A', 'inspector', 'a'], ['B', 'inspector', 'b'], ['C', 'inspector', 'c'], ['admin', 'admin', '']] as const) {
    await db.user.create({ data: {
      id, role, username: `synthetic-${id}`, spexId: `synthetic-${id}`, firstName: id, lastName: 'Synthetic',
      email: `${id.toLowerCase()}@example.test`, passwordHash: 'synthetic-not-a-real-password',
      directorateId: suffix ? `dir-${suffix}` : '', districtId: suffix ? `district-${suffix}` : '',
      eduDirectorateId: suffix ? `dir-${suffix}` : null, eduDistrictId: suffix ? `district-${suffix}` : null,
      status: 'active', isApprovedByAdmin: true, accessExpiresAt: new Date('2099-07-31'),
      ...(id === 'T' ? { institutionId: 'school-a', eduSchoolId: 'school-a', schoolName: 'Synthetic School a', municipalityId: 'mun-a' } : {}),
    } });
  }
  await db.inspectorAssignment.create({ data: { id: 'current-T', teacherId: 'T', inspectorId: 'A', status: 'Active', assignedAt: new Date('2026-09-01') } });
  await db.inspectionVisitRecord.create({ data: { id: 'visit-A', inspectorId: 'A', teacherId: 'T', institutionId: 'school-a', createdAt: new Date('2026-09-01'), data: { teacherId: 'T', inspectorId: 'A', officialReportGenerated: true, recommendations: ['Synthetic historical report'] } } });
  await db.inspectorNote.create({ data: { id: 'note-A', authorId: 'A', createdAt: new Date('2026-09-01'), data: { teacherId: 'T', content: 'Synthetic historical note' } } });
  await db.lessonPlan.create({ data: { id: 'memo-T', ownerId: 'T', data: { content: 'Synthetic future private memo' } } });
  await db.notebookEntry.create({ data: { id: 'notebook-T', ownerId: 'T', data: { content: 'Synthetic future private notebook' } } });
}

const initiate = () => service.requestTeacherTransfer({ teacherId: 'T', destinationInspectorId: 'B', destinationInstitutionId: 'school-b', requestedById: 'admin' });
const head = () => db.inspectorAssignment.findUniqueOrThrow({ where: { teacherId: 'T' } });
const teacher = () => db.user.findUniqueOrThrow({ where: { id: 'T' } });
async function request(actor: string, endpoint: string, body?: unknown, method?: string) {
  const role = (await db.user.findUniqueOrThrow({ where: { id: actor } })).role;
  const response = await fetch(httpUrl + endpoint, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', Cookie: `spex_session=${signSession({ userId: actor, role })}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

async function invariant(owner: 'A' | 'B') {
  expect(await db.inspectorAssignment.count({ where: { teacherId: 'T' } })).toBe(1);
  const current = await head();
  expect(current.inspectorId).toBe(owner);
  expect(['Active', 'Changed']).toContain(current.status);
  const t = await teacher();
  const suffix = owner.toLowerCase();
  expect(t.directorateId).toBe(`dir-${suffix}`);
  expect(t.eduDirectorateId).toBe(t.directorateId);
  expect(t.districtId).toBe(`district-${suffix}`);
  expect(t.eduDistrictId).toBe(t.districtId);
  expect(await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'visit-A' } })).toMatchObject({ inspectorId: 'A', teacherId: 'T' });
  expect(await db.inspectorNote.findUniqueOrThrow({ where: { id: 'note-A' } })).toMatchObject({ authorId: 'A' });
}

async function race(id: string, decisions: ('Accepted' | 'Rejected')[]) {
  let firstReads = 0;
  let retries = 0;
  const backends: number[] = [];
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const timer = setTimeout(release, 8000);
  // Test-only observation/barrier around REAL independent transactions. Both
  // initial snapshots must read Pending before either decision writes; retries
  // are never blocked. No isolation downgrade or production failure hook.
  db.$transaction = ((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: unknown) =>
    originalTransaction(async (tx: Prisma.TransactionClient) => {
      const [connection] = await tx.$queryRaw<{ pid: number; isolation: string }[]>`SELECT pg_backend_pid() AS pid, current_setting('transaction_isolation') AS isolation`;
      expect(connection.isolation).toBe('serializable');
      const originalRead = tx.inspectorAssignmentTransfer.findUnique.bind(tx.inspectorAssignmentTransfer);
      tx.inspectorAssignmentTransfer.findUnique = (async (args: Prisma.InspectorAssignmentTransferFindUniqueArgs) => {
        const row = await originalRead(args);
        if (args.where.id === id && firstReads < 2) {
          backends.push(connection.pid);
          firstReads++;
          if (firstReads === 2) release();
          await barrier;
        }
        return row;
      }) as typeof originalRead;
      return callback(tx);
    }, options as { isolationLevel?: Prisma.TransactionIsolationLevel }).catch((error: { code?: string }) => {
      if (error.code === 'P2034') retries++;
      throw error;
    })) as PrismaClient['$transaction'];
  try {
    const results = await Promise.allSettled(decisions.map((decision) => service.decideTeacherTransfer(id, 'B', decision, 'Synthetic concurrent rejection')));
    expect(firstReads).toBe(2);
    expect(new Set(backends).size).toBe(2);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(loser.reason).toMatchObject({ code: 'CONFLICT' });
    expect(retries).toBeGreaterThanOrEqual(1);
    const persisted = await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id } });
    expect(['Accepted', 'Rejected']).toContain(persisted.status);
    expect(persisted.pendingTeacherId).toBeNull();
    expect(persisted.decidedById).toBe('B');
    expect(persisted.effectiveAt !== null).toBe(persisted.status === 'Accepted');
    await invariant(persisted.status === 'Accepted' ? 'B' : 'A');
    report[`race_${decisions.join('_')}`] = { backends, serializationConflicts: retries, winner: persisted.status, terminalDecisions: 1 };
  } finally {
    clearTimeout(timer);
    db.$transaction = originalTransaction;
  }
}

describe.skipIf(!gateUrl)('PO-INS-02 real disposable PostgreSQL gate (explicit opt-in)', () => {
  beforeAll(async () => {
    const target = new URL(gateUrl!);
    if (target.hostname !== '127.0.0.1' || target.port !== '55482' || target.pathname !== '/arenaspex_po_ins_02_disposable' || target.searchParams.get('schema') !== 'public')
      throw new Error('STOP: target is not the dedicated loopback disposable gate DB');
    if (!gateRoot || !path.resolve(gateRoot).startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-')))
      throw new Error('STOP: no dedicated gate cluster directory');
    process.env.DATABASE_URL = gateUrl!;
    process.env.DIRECT_DATABASE_URL = gateUrl!;
    // No import of the runtime singleton before the target has been proven.
    db = new PrismaClient({ datasources: { db: { url: gateUrl! } } });
    const [identity] = await db.$queryRaw<{ database: string; host: string; port: number; directory: string; version: string }[]>`
      SELECT current_database() AS database, host(inet_server_addr()) AS host, inet_server_port() AS port,
      current_setting('data_directory') AS directory, version() AS version`;
    expect(path.resolve(identity.directory).toLowerCase()).toBe(path.resolve(gateRoot, 'data').toLowerCase());
    expect(identity).toMatchObject({ database: 'arenaspex_po_ins_02_disposable', host: '127.0.0.1', port: 55482 });
    expect(await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`).toEqual([]);
    report.isolation = { ...identity, disposable: true, initiallyEmpty: true };

    const currentSchema = readFileSync('prisma/schema.prisma', 'utf8');
    const preSchema = currentSchema.replace(/^\s*(assignmentTransfers|outgoingTransfers|incomingTransfers)\s+InspectorAssignmentTransfer\[\].*$/gm, '')
      .replace(/model InspectorAssignmentTransfer \{[\s\S]*?\n\}/, '');
    const scratch = path.join(gateRoot, 'prisma');
    const baselineDir = path.join(scratch, 'migrations/00000000000000_gate_pre_po_ins_02');
    mkdirSync(baselineDir, { recursive: true });
    const preFile = path.join(scratch, 'schema.prisma');
    writeFileSync(preFile, preSchema);
    writeFileSync(path.join(scratch, 'migrations/migration_lock.toml'), 'provider = "postgresql"\n');
    cli(['migrate', 'diff', '--from-empty', '--to-schema-datamodel', preFile, '--script', '--output', path.join(baselineDir, 'migration.sql')]);
    report.baselineDeploy = cli(['migrate', 'deploy', '--schema', preFile]);
    // Seed BEFORE the target migration, without touching the absent table.
    await db.directorate.create({ data: { id: 'migration-dir', name: 'Synthetic existing directorate' } });
    for (const [id, role] of [['migration-T', 'teacher'], ['migration-A', 'inspector']]) {
      await db.user.create({ data: { id, username: id, spexId: id, firstName: id, lastName: 'Synthetic', email: `${id}@example.test`, passwordHash: 'synthetic', role, directorateId: 'migration-dir', districtId: '' } });
    }
    await db.inspectorAssignment.create({ data: { id: 'migration-head', teacherId: 'migration-T', inspectorId: 'migration-A', status: 'Active' } });
    await db.inspectionVisitRecord.create({ data: { id: 'migration-visit', teacherId: 'migration-T', inspectorId: 'migration-A', data: { synthetic: true } } });
    migrationSnapshot = await snapshots();
    const targetDir = path.join(scratch, 'migrations', migrationName);
    mkdirSync(targetDir);
    const sourceMigration = path.join('prisma/migrations', migrationName, 'migration.sql');
    copyFileSync(sourceMigration, path.join(targetDir, 'migration.sql'));
    expect(readFileSync(path.join(targetDir, 'migration.sql'))).toEqual(readFileSync(sourceMigration));
    writeFileSync(preFile, currentSchema);
    report.migrationDeploy = cli(['migrate', 'deploy', '--schema', preFile]);
    expect(await snapshots()).toEqual(migrationSnapshot);
    report.existingTablesPreserved = Object.keys(migrationSnapshot).length;
    report.migrationSHA256 = createHash('sha256').update(readFileSync(sourceMigration)).digest('hex');
    report.schemaDiff = cli(['migrate', 'diff', '--from-url', gateUrl!, '--to-schema-datamodel', path.resolve('prisma/schema.prisma'), '--exit-code']);
    await db.$disconnect();
    ({ prisma: db } = await import('../src/server/prismaClient'));
    originalTransaction = db.$transaction.bind(db);
    service = await import('../src/server/assignmentTransferService');
    assignment = await import('../src/server/assignmentService');
    const { assignmentRouter } = await import('../src/server/assignmentRouter');
    const { apiRouter } = await import('../src/server/apiRouter');
    const { requireAuth, requireOperationalAccount } = await import('../src/server/middleware/requireAuth');
    ({ signSession } = await import('../src/server/auth'));
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api', apiRouter);
    app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter);
    app.use((error: Error & { code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(error.code === 'P2002' || error.code === 'CONFLICT' ? 409 : 500).json({ error: error.message, code: error.code });
    });
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected loopback HTTP server');
    httpUrl = `http://127.0.0.1:${address.port}`;
  }, 120000);

  beforeEach(async () => { await fixture(); });
  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (db) await db.$disconnect();
    if (gateRoot) writeFileSync(path.join(gateRoot, 'evidence.json'), JSON.stringify(report, null, 2));
  });

  it('applies the exact migration; verifies FKs, indexes, nullability, defaults, preservation and schema', async () => {
    const constraints = await db.$queryRaw<{ name: string; type: string; definition: string }[]>`
      SELECT conname AS name, contype::text AS type, pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE conrelid='"InspectorAssignmentTransfer"'::regclass ORDER BY conname`;
    expect(constraints.filter((c) => c.type === 'f')).toHaveLength(3);
    expect(constraints.filter((c) => c.type === 'p')).toHaveLength(1);
    for (const field of ['teacherId', 'sourceInspectorId', 'destinationInspectorId']) {
      expect(constraints.find((c) => c.name.endsWith(`_${field}_fkey`))?.definition).toContain('ON UPDATE CASCADE ON DELETE RESTRICT');
    }
    const indexes = await db.$queryRaw<{ indexname: string; indexdef: string }[]>`SELECT indexname,indexdef FROM pg_indexes WHERE tablename='InspectorAssignmentTransfer'`;
    expect(indexes).toHaveLength(5);
    expect(indexes.find((i) => i.indexname.endsWith('pendingTeacherId_key'))?.indexdef).toContain('UNIQUE');
    const columns = await db.$queryRaw<{ column_name: string; is_nullable: string; column_default: string | null }[]>`
      SELECT column_name,is_nullable,column_default FROM information_schema.columns WHERE table_name='InspectorAssignmentTransfer' AND table_schema='public'`;
    expect(columns).toHaveLength(21);
    const nullable = ['pendingTeacherId', 'sourceAssignedAt', 'destinationInstitutionId', 'decidedAt', 'decidedById', 'rejectionReason', 'effectiveAt'];
    for (const column of columns) expect(column.is_nullable).toBe(nullable.includes(column.column_name) ? 'YES' : 'NO');
    expect(columns.find((c) => c.column_name === 'status')?.column_default).toBe("'Pending'::text");
    expect(columns.find((c) => c.column_name === 'requestedAt')?.column_default).toBe('CURRENT_TIMESTAMP');
    report.constraints = { constraints, indexes, columns };
    const created = await initiate();
    expect(created).toMatchObject({ status: 'Pending', decidedAt: null, effectiveAt: null });
    await expect(db.inspectorAssignment.create({ data: { teacherId: 'T', inspectorId: 'B' } })).rejects.toMatchObject({ code: 'P2002' });
    const { id: _id, ...duplicate } = created;
    await expect(db.inspectorAssignmentTransfer.create({ data: duplicate as Prisma.InspectorAssignmentTransferUncheckedCreateInput })).rejects.toMatchObject({ code: 'P2002' });
    await expect(db.inspectorAssignmentTransfer.create({ data: { ...duplicate, pendingTeacherId: null, teacherId: 'missing-teacher' } as Prisma.InspectorAssignmentTransferUncheckedCreateInput })).rejects.toMatchObject({ code: 'P2003' });
    // PostgreSQL 18 reports RESTRICT as SQLSTATE 23001; Prisma 6 may expose it
    // as UnknownRequestError rather than P2003. Assert the actual FK rejection.
    await expect(db.user.delete({ where: { id: 'B' } })).rejects.toThrow('InspectorAssignmentTransfer_destinationInspectorId_fkey');
    expect(await db.user.count({ where: { id: 'B' } })).toBe(1);
  });

  it('persists request through the real Admin route; keeps A current, B pending-only and C excluded', async () => {
    const created = await request('admin', '/api/admin/assignments', { teacherId: 'T', inspectorId: 'B' });
    expect(created.status).toBe(200);
    expect(await db.inspectorAssignmentTransfer.count({ where: { status: 'Pending' } })).toBe(1);
    await invariant('A');
    expect(await assignment.canInspectorAccessTeacher('A', 'T')).toBe(true);
    expect(await assignment.canInspectorAccessTeacher('B', 'T')).toBe(false);
    const incoming = (await request('B', '/api/inspector/transfers')).data.transfers;
    expect(incoming).toHaveLength(1);
    expect(incoming[0].snapshot.teacherName).toBe('T Synthetic');
    expect(incoming[0].teacher).toBeUndefined();
    expect((await request('B', '/api/inspector/teachers/T/follow-up')).status).toBe(404);
    expect((await request('C', '/api/inspector/transfers')).data.transfers).toEqual([]);
    for (const action of ['accept', 'reject']) expect((await request('C', `/api/inspector/transfers/${incoming[0].id}/${action}`, {})).status).toBe(403);
    await invariant('A');
  });

  it('accepts through the destination route; synchronizes geography and one authoritative current head', async () => {
    const old = await head();
    const transfer = await initiate();
    expect((await request('B', `/api/inspector/transfers/${transfer.id}/accept`, {})).status).toBe(200);
    await invariant('B');
    expect(await head()).toMatchObject({ id: old.id, status: 'Changed' });
    expect(await teacher()).toMatchObject({ institutionId: 'school-b', eduSchoolId: 'school-b', municipalityId: 'mun-b', schoolName: 'Synthetic School b' });
    expect(await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).toMatchObject({ status: 'Accepted', sourceInspectorId: 'A', sourceAssignmentId: old.id, decidedById: 'B', pendingTeacherId: null });
    expect(await assignment.canInspectorAccessTeacher('A', 'T')).toBe(false);
    expect(await assignment.canInspectorAccessTeacher('B', 'T')).toBe(true);
  });

  it('hides intermediate assignment/geography writes from an independent PostgreSQL observer until COMMIT', async () => {
    const transfer = await initiate();
    const observer = new PrismaClient({ datasources: { db: { url: gateUrl! } } });
    let written!: () => void;
    let release!: () => void;
    const writesReached = new Promise<void>((resolve) => { written = resolve; });
    const continueDecision = new Promise<void>((resolve) => { release = resolve; });
    const timeout = setTimeout(() => { written(); release(); }, 8000);
    let transactionPid = 0;
    db.$transaction = ((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel?: Prisma.TransactionIsolationLevel }) =>
      originalTransaction(async (tx: Prisma.TransactionClient) => {
        const [identity] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
        transactionPid = identity.pid;
        const update = tx.user.update.bind(tx.user);
        tx.user.update = (async (args: Prisma.UserUpdateArgs) => {
          const result = await update(args);
          expect(await tx.inspectorAssignment.findUniqueOrThrow({ where: { teacherId: 'T' } })).toMatchObject({ inspectorId: 'B' });
          expect(result.districtId).toBe('district-b');
          written();
          await continueDecision;
          return result;
        }) as typeof update;
        return callback(tx);
      }, options)) as PrismaClient['$transaction'];
    let decision: ReturnType<typeof service.decideTeacherTransfer> | undefined;
    try {
      decision = service.decideTeacherTransfer(transfer.id, 'B', 'Accepted');
      await writesReached;
      const observed = await observer.$transaction(async (tx) => ({
        identity: await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`,
        head: await tx.inspectorAssignment.findUniqueOrThrow({ where: { teacherId: 'T' } }),
        teacher: await tx.user.findUniqueOrThrow({ where: { id: 'T' } }),
        transfer: await tx.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } }),
        heads: await tx.inspectorAssignment.count({ where: { teacherId: 'T' } }),
      }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      expect(observed.identity[0].pid).not.toBe(transactionPid);
      expect(observed.heads).toBe(1);
      expect(observed.head.inspectorId).toBe('A');
      expect(observed.teacher.districtId).toBe('district-a');
      expect(observed.transfer.status).toBe('Pending');
      release();
      expect((await decision).status).toBe('Accepted');
      await invariant('B');
      report.atomicVisibility = { transactionPid, observerPid: observed.identity[0].pid, beforeCommit: 'A / district-a / Pending / one head', afterCommit: 'B / district-b / Accepted / one head' };
    } finally {
      release();
      clearTimeout(timeout);
      if (decision) await decision.catch(() => undefined);
      db.$transaction = originalTransaction;
      await observer.$disconnect();
    }
  }, 30000);

  it('retains A-owned historical report/note; denies live dossier, schedule, memos, notebook and future reports', async () => {
    const transfer = await initiate();
    await service.decideTeacherTransfer(transfer.id, 'B', 'Accepted');
    await db.inspectionVisitRecord.create({ data: { id: 'future-B', inspectorId: 'B', teacherId: 'T', data: { officialReportGenerated: true, secret: 'Synthetic future B report' } } });
    const archived = await request('A', '/api/inspector/archive?teacherId=unrelated');
    expect(archived.status).toBe(200);
    expect(archived.data.visits.map((v: { id: string }) => v.id)).toEqual(['visit-A']);
    expect(archived.data.notes.map((v: { id: string }) => v.id)).toEqual(['note-A']);
    expect(JSON.stringify(archived.data)).not.toContain('Synthetic future');
    expect(archived.data.visits[0].inspectorId).toBe('A');
    expect(archived.data.notes[0].authorId).toBe('A');
    expect((await request('C', '/api/inspector/archive')).data.visits).toEqual([]);
    expect((await request('A', '/api/inspector/teachers/T/follow-up')).status).toBe(404);
    expect((await request('A', '/api/inspector/teachers/T/weekly-timetable?academicYearId=2026-2027')).status).toBe(403);
    expect((await request('A', '/api/db/users')).data.users.some((u: { id: string }) => u.id === 'T')).toBe(false);
    expect((await request('A', '/api/db/lesson-plans')).data.lessonPlans).toEqual([]);
    expect((await request('A', '/api/db/notebook')).data.dailyNotebook).toEqual([]);
    expect((await request('A', '/api/inspection-visits', { id: 'forbidden-A', teacherId: 'T' })).status).toBe(403);
    expect((await request('B', '/api/db/lesson-plans')).data.lessonPlans).toHaveLength(1);
    expect((await request('B', '/api/inspection-visits', { id: 'allowed-B', teacherId: 'T' })).status).toBe(201);
    expect((await request('B', '/api/db/inspector-notes', { note: { id: 'note-A', teacherId: 'T', authorId: 'B', content: 'forged' } })).status).toBe(403);
    expect((await request('B', '/api/inspection-visits', { id: 'visit-A', teacherId: 'T' })).status).toBe(409);
    await invariant('B');
  });

  it('persists rejection and reason without changing source head or any geographic fields', async () => {
    const transfer = await initiate();
    const before = { head: await head(), teacher: await teacher() };
    expect((await request('B', `/api/inspector/transfers/${transfer.id}/reject`, { reason: 'Synthetic reason' })).status).toBe(200);
    expect(await head()).toEqual(before.head);
    expect(await teacher()).toEqual(before.teacher);
    expect(await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).toMatchObject({ status: 'Rejected', rejectionReason: 'Synthetic reason', pendingTeacherId: null, effectiveAt: null, decidedById: 'B' });
    expect(await assignment.canInspectorAccessTeacher('B', 'T')).toBe(false);
    await invariant('A');
  });

  it.each(['Accepted', 'Rejected'] as const)('prevents all subsequent decisions after %s', async (decision) => {
    const transfer = await initiate();
    await service.decideTeacherTransfer(transfer.id, 'B', decision);
    const before = { head: await head(), teacher: await teacher(), transfer: await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } }) };
    for (const next of ['Accepted', 'Rejected'] as const) await expect(service.decideTeacherTransfer(transfer.id, 'B', next)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await head()).toEqual(before.head);
    expect(await teacher()).toEqual(before.teacher);
    expect(await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).toEqual(before.transfer);
    await invariant(decision === 'Accepted' ? 'B' : 'A');
  });

  it('rejects a stale source revision with all attempted writes rolled back', async () => {
    const transfer = await initiate();
    await db.inspectorAssignment.update({ where: { teacherId: 'T' }, data: { updatedAt: new Date(Date.now() + 1000) } });
    const before = await head();
    await expect(service.decideTeacherTransfer(transfer.id, 'B', 'Accepted')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await head()).toEqual(before);
    expect(await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).toMatchObject({ status: 'Pending', decidedAt: null });
    await invariant('A');
  });

  it('handles concurrent ACCEPT vs ACCEPT on two real SERIALIZABLE connections', async () => { await race((await initiate()).id, ['Accepted', 'Accepted']); }, 30000);
  it('handles concurrent ACCEPT vs REJECT on two real SERIALIZABLE connections', async () => { await race((await initiate()).id, ['Accepted', 'Rejected']); }, 30000);

  it('rolls back a real database failure AFTER the assignment write began', async () => {
    const transfer = await initiate();
    const before = { head: await head(), teacher: await teacher(), archive: await snapshots() };
    await db.$executeRawUnsafe(`CREATE FUNCTION gate_fail_teacher_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.id = 'T' AND NEW."districtId" = 'district-b' THEN
          IF EXISTS (SELECT 1 FROM "InspectorAssignment" WHERE "teacherId"='T' AND "inspectorId"='B') THEN
            RAISE EXCEPTION 'GATE_FORCED_FAILURE_AFTER_ASSIGNMENT_WRITE';
          END IF;
          RAISE EXCEPTION 'GATE_FAILURE_HOOK_ORDER_INVALID';
        END IF;
        RETURN NEW;
      END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER gate_fail_teacher_update BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION gate_fail_teacher_update()');
    try {
      await expect(service.decideTeacherTransfer(transfer.id, 'B', 'Accepted')).rejects.toThrow('GATE_FORCED_FAILURE_AFTER_ASSIGNMENT_WRITE');
      expect(await head()).toEqual(before.head);
      expect(await teacher()).toEqual(before.teacher);
      expect(await snapshots()).toEqual(before.archive);
      expect(await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).toEqual(transfer);
      await invariant('A');
      report.rollback = { failure: 'PostgreSQL trigger verified head switched within transaction before forced error', originalStateRestored: true };
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER gate_fail_teacher_update ON "User"');
      await db.$executeRawUnsafe('DROP FUNCTION gate_fail_teacher_update()');
    }
  });

  it.each(['Active', 'Changed'])('same-district institution update keeps Inspector and %s head through the real Teacher route', async (status) => {
    await db.inspectorAssignment.update({ where: { teacherId: 'T' }, data: { status } });
    const before = await head();
    const response = await request('T', '/api/teacher/professional-data', { directorateId: 'dir-a', districtId: 'district-a', municipalityId: 'mun-a', institutionId: 'school-a2' }, 'PUT');
    expect(response.status).toBe(200);
    expect(await head()).toEqual(before);
    expect((await teacher()).institutionId).toBe('school-a2');
    expect(await db.inspectorAssignmentTransfer.count()).toBe(0);
    await invariant('A');
  });

  it('pending request uniqueness, fresh approval validation and geographic bypass protection hold on PostgreSQL', async () => {
    const transfer = await initiate();
    await expect(initiate()).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(service.updateTeacherProfile('T', { districtId: 'district-b' })).rejects.toMatchObject({ code: 'CONFLICT' });
    await db.user.update({ where: { id: 'B' }, data: { isApprovedByAdmin: false } });
    await expect(service.decideTeacherTransfer(transfer.id, 'B', 'Accepted')).rejects.toMatchObject({ code: 'INVALID' });
    await invariant('A');
    expect(await db.inspectorAssignmentTransfer.count({ where: { status: 'Pending' } })).toBe(1);
  });
});
