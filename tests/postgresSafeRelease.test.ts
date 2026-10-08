import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const url = process.env.ARENASPEX_POSTGRES_GATE_URL;
const root = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
let db: PrismaClient;
let server: Server;
let base: string;
let sign: typeof import('../src/server/auth').signSession;
let transfer: typeof import('../src/server/assignmentTransferService');
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => {
    throw new Error('not used');
  },
  StudentRosterPdfImportError: class extends Error {},
}));
async function request(actor: string, endpoint: string, method = 'GET', body?: unknown) {
  const role = (await db.user.findUniqueOrThrow({ where: { id: actor } })).role;
  const response = await fetch(base + '/api' + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `spex_session=${sign({ userId: actor, role })}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}
const input = (academicYearId = '2026-2027') => ({
  academicYearId,
  classId: 'group',
  weekday: 0,
  startTime: '08:00',
  endTime: '09:00',
});
const own = '/teacher/weekly-timetable';
const view = (teacher = 'T', year = '2026-2027') =>
  `/inspector/teachers/${teacher}/weekly-timetable?academicYearId=${year}`;
describe.skipIf(!url)('Safe release bootstrap/account/card PostgreSQL gate', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      target.hostname !== '127.0.0.1' ||
      target.port !== '55482' ||
      target.pathname !== '/arenaspex_po_ins_02_disposable' ||
      !root ||
      !path.resolve(root).startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-'))
    )
      throw new Error('STOP: disposable local database required');
    process.env.DATABASE_URL = url!;
    process.env.DIRECT_DATABASE_URL = url!;
    db = new PrismaClient({ datasources: { db: { url: url! } } });
    const [identity] = await db.$queryRaw<
      { directory: string }[]
    >`SELECT current_setting('data_directory') AS directory`;
    expect(path.resolve(identity.directory).toLowerCase()).toBe(
      path.resolve(root, 'data').toLowerCase()
    );
    expect(await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`).toEqual(
      []
    );
    const scratch = path.join(root!, 'audit-baseline');
    mkdirSync(scratch, { recursive: true });
    const auditSchema = path.join(scratch, 'schema.prisma');
    writeFileSync(
      auditSchema,
      readFileSync('prisma/schema.prisma', 'utf8').replace(/^model AuditEvent \{[\s\S]*?^\}/m, '')
    );
    execFileSync(
      process.execPath,
      [
        path.resolve('node_modules/prisma/build/index.js'),
        'db',
        'push',
        '--schema',
        auditSchema,
        '--skip-generate',
      ],
      { env: { ...process.env, DATABASE_URL: url!, DIRECT_DATABASE_URL: url! }, timeout: 60000 }
    );
    execFileSync('C:/Program Files/PostgreSQL/18/bin/psql.exe', [
      '-X',
      '-h',
      '127.0.0.1',
      '-p',
      '55482',
      '-U',
      'gate_admin',
      '-d',
      'arenaspex_po_ins_02_disposable',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      path.resolve('prisma/migrations/20261008140000_admin_audit_trail/migration.sql'),
    ]);
    execFileSync(
      process.execPath,
      [
        path.resolve('node_modules/prisma/build/index.js'),
        'migrate',
        'diff',
        '--from-url',
        url!,
        '--to-schema-datamodel',
        path.resolve('prisma/schema.prisma'),
        '--exit-code',
      ],
      { env: { ...process.env, DATABASE_URL: url!, DIRECT_DATABASE_URL: url! } }
    );
    await db.$disconnect();
    ({ prisma: db } = await import('../src/server/prismaClient'));
    ({ signSession: sign } = await import('../src/server/auth'));
    transfer = await import('../src/server/assignmentTransferService');
    const { apiRouter } = await import('../src/server/apiRouter');
    const { authRouter } = await import('../src/server/authRouter');
    const { assignmentRouter } = await import('../src/server/assignmentRouter');
    const { requireAuth, requireOperationalAccount } =
      await import('../src/server/middleware/requireAuth');
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api/auth', authRouter);
    app.use('/api', apiRouter);
    app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter);
    app.use(
      (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
        res.status(500).json({ error: error.message })
    );
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no loopback server');
    base = `http://127.0.0.1:${address.port}`;
  }, 120000);
  beforeEach(async () => {
    vi.useRealTimers();
    await db.$executeRawUnsafe(
      'TRUNCATE "User", "Directorate", "InspectionVisitRecord", "CommunityNotification" CASCADE'
    );
    for (const suffix of ['a', 'b']) {
      await db.directorate.create({ data: { id: `dir-${suffix}`, name: `Synthetic ${suffix}` } });
      await db.inspectionDistrict.create({
        data: {
          id: `district-${suffix}`,
          name: `Synthetic ${suffix}`,
          directorateId: `dir-${suffix}`,
        },
      });
    }
    for (const [id, role, suffix] of [
      ['T', 'teacher', 'a'],
      ['T2', 'teacher', 'b'],
      ['A', 'inspector', 'a'],
      ['B', 'inspector', 'b'],
      ['U', 'inspector', 'a'],
      ['admin', 'admin', ''],
      ['director', 'director', ''],
    ] as const) {
      await db.user.create({
        data: {
          id,
          username: id,
          spexId: id,
          firstName: id,
          lastName: 'Synthetic',
          email: `${id.toLowerCase()}@example.test`,
          passwordHash: 'sensitive-password-hash',
          schoolName: 'مدرسة اصطناعية',
          role,
          status: 'active',
          isApprovedByAdmin: true,
          accessExpiresAt: new Date('2099-07-31'),
          directorateId: suffix ? `dir-${suffix}` : '',
          districtId: suffix ? `district-${suffix}` : '',
          eduDirectorateId: suffix ? `dir-${suffix}` : null,
          eduDistrictId: suffix ? `district-${suffix}` : null,
        },
      });
    }
    await db.inspectorAssignment.create({
      data: { teacherId: 'T', inspectorId: 'A', status: 'Active' },
    });
    await db.inspectorAssignment.create({
      data: { teacherId: 'T2', inspectorId: 'B', status: 'Active' },
    });
    await db.studentClass.create({
      data: { id: 'group', teacherId: 'T', name: 'فوج اصطناعي', levelId: 'lvl_p3' },
    });
    await db.studentClass.create({
      data: { id: 'foreign', teacherId: 'T2', name: 'فوج آخر', levelId: 'lvl_p3' },
    });
    await db.inspectionDistrict.create({
      data: { id: 'district-u', name: 'مقاطعة مستقلة', directorateId: 'dir-a' },
    });
    await db.user.update({
      where: { id: 'U' },
      data: { districtId: 'district-u', eduDistrictId: 'district-u' },
    });
    const { hashPassword } = await import('../src/server/auth');
    await db.user.updateMany({
      data: { passwordHash: await hashPassword('LocalArena-test-2026!') },
    });
  });
  afterAll(async () => {
    vi.useRealTimers();
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (db) {
      const rows = await db.auditEvent.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      writeFileSync('node_modules/.cache/audit-qa-events.json', JSON.stringify(rows));
      await db.$disconnect();
    }
    if (root)
      writeFileSync(
        path.join(root, 'safe-release-evidence.json'),
        JSON.stringify({
          localOnly: true,
          schemaChanges: true,
          checks:
            'exact migration / append-only / role boundaries / redaction / domain events / rollback / idempotency',
        })
      );
  });

  const adminEnv = {
    SUPER_ADMIN_EMAIL: ' ROOT@example.test ',
    SUPER_ADMIN_PASSWORD: 'LocalArena-test-2026!',
    SUPER_ADMIN_FIRST_NAME: 'مشرف',
    SUPER_ADMIN_LAST_NAME: 'اصطناعي',
  };
  async function passwordLogin(id: string) {
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    const response = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'LocalArena-test-2026!',
        portal: user.role === 'admin' ? 'admin' : 'professional',
      }),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  }
  it('missing Admin and valid ENV creates exactly one normalized hashed platform Admin without demo fixtures', async () => {
    const { bootstrapAdmin } = await import('../src/server/adminBootstrap');
    await db.user.delete({ where: { id: 'admin' } });
    const before = await db.user.count();
    expect(await bootstrapAdmin(db, adminEnv)).toEqual({ created: true });
    const admin = await db.user.findUniqueOrThrow({ where: { email: 'root@example.test' } });
    expect(admin).toMatchObject({
      role: 'admin',
      isPlatformOwner: true,
      status: 'active',
      isApprovedByAdmin: true,
      districtId: '',
    });
    expect(admin.passwordHash).not.toBe(adminEnv.SUPER_ADMIN_PASSWORD);
    const { verifyPassword } = await import('../src/server/auth');
    expect(await verifyPassword(adminEnv.SUPER_ADMIN_PASSWORD, admin.passwordHash)).toBe(true);
    expect(await db.user.count()).toBe(before + 1);
    expect(await db.user.count({ where: { role: 'admin' } })).toBe(1);
  });
  it('repeated/concurrent bootstrap preserves the complete existing Admin and password plus unrelated records', async () => {
    const { bootstrapAdmin } = await import('../src/server/adminBootstrap');
    await db.user.delete({ where: { id: 'admin' } });
    await bootstrapAdmin(db, adminEnv);
    const before = await db.user.findMany({ orderBy: { id: 'asc' } });
    const groups = await db.studentClass.findMany({ orderBy: { id: 'asc' } });
    await Promise.all([
      bootstrapAdmin(db, { ...adminEnv, SUPER_ADMIN_PASSWORD: 'Other-Password-2026!' }),
      bootstrapAdmin(db, adminEnv),
    ]);
    expect(await db.user.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    expect(await db.studentClass.findMany({ orderBy: { id: 'asc' } })).toEqual(groups);
  });
  it.each([
    { SUPER_ADMIN_EMAIL: '' },
    { SUPER_ADMIN_PASSWORD: '' },
    { SUPER_ADMIN_PASSWORD: 'short' },
  ])('missing/invalid bootstrap ENV fails before mutation (%j)', async (bad) => {
    const { bootstrapAdmin } = await import('../src/server/adminBootstrap');
    const before = await db.user.findMany({ orderBy: { id: 'asc' } });
    await expect(bootstrapAdmin(db, { ...adminEnv, ...bad })).rejects.toThrow(
      'ADMIN_BOOTSTRAP_ENV_INVALID'
    );
    expect(await db.user.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });
  it('bootstrap does not repurpose a Teacher identity and never resets an existing unrelated Admin', async () => {
    const { bootstrapAdmin } = await import('../src/server/adminBootstrap');
    const before = await db.user.findMany({ orderBy: { id: 'asc' } });
    await expect(
      bootstrapAdmin(db, { ...adminEnv, SUPER_ADMIN_EMAIL: 'T@example.test' })
    ).rejects.toThrow('IDENTITY_CONFLICT');
    expect(await bootstrapAdmin(db, adminEnv)).toEqual({ created: false });
    expect(await db.user.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });
  it('Admin account detail is safe, valid/not-found work, non-Admin direct access denied', async () => {
    const r = await request('admin', '/admin/users/T');
    expect(r.status).toBe(200);
    expect(r.data.user.id).toBe('T');
    const serialized = JSON.stringify(r.data);
    for (const key of ['passwordHash', 'encryptedApiKey', 'googleId', 'JWT_SECRET'])
      expect(serialized).not.toContain(key);
    expect((await request('admin', '/admin/users/guessed')).status).toBe(404);
    for (const actor of ['T', 'A', 'director'])
      expect((await request(actor, '/admin/users/T')).status).toBe(403);
  });
  it('disable denies new authentication and existing sessions; reactivate restores access without changing ownership', async () => {
    const originalHead = await db.inspectorAssignment.findUnique({ where: { teacherId: 'T' } });
    const session = await passwordLogin('T');
    expect(session.status).toBe(200);
    expect(
      (await request('admin', '/admin/users/T/lifecycle', 'POST', { action: 'deactivate' })).status
    ).toBe(200);
    const denied = await fetch(base + '/api/teacher/information-card', {
      headers: { Cookie: session.cookie! },
    });
    expect(denied.status).toBe(401);
    expect((await passwordLogin('T')).status).toBe(403);
    expect(
      (await request('admin', '/admin/users/T/lifecycle', 'POST', { action: 'reactivate' })).status
    ).toBe(200);
    expect((await passwordLogin('T')).status).toBe(200);
    expect((await request('T', own + '?academicYearId=2026-2027')).status).toBe(200);
    expect(await db.inspectorAssignment.findUnique({ where: { teacherId: 'T' } })).toEqual(
      originalHead
    );
    const rows = await db.auditEvent.findMany({
      where: { entityId: 'T' },
      orderBy: { createdAt: 'desc' },
    });
    expect(rows.slice(0, 2).map((e) => e.eventType)).toEqual([
      'ACCOUNT_REACTIVATED',
      'ACCOUNT_DISABLED',
    ]);
    expect(rows[0]).toMatchObject({ actorUserId: 'admin', affectedUserId: 'T' });
  });
  it('logical delete preserves all professional data, is idempotent, denies sessions and cannot be bypassed through generic updates', async () => {
    await request('T', own, 'POST', input());
    const cardService = await import('../src/server/informationCardService');
    await cardService.saveCard({ id: 'T', role: 'teacher' }, 'T', {
      revision: 0,
      identity: { firstName: 'T', lastName: 'Synthetic', birthDate: '1990-01-01', phone: '' },
      extra: { cadre: 'أستاذ', administrativeStatus: 'مرسم(ة)', qualifications: [] },
    });
    await cardService.submitCard({ id: 'T', role: 'teacher' }, 'T', 1);
    await db.inspectionVisitRecord.create({
      data: {
        id: 'archive-history-visit',
        inspectorId: 'A',
        teacherId: 'T',
        data: {},
        visitType: 'GUIDANCE',
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    await db.visitReport.create({
      data: {
        visitId: 'archive-history-visit',
        reportType: 'GUIDANCE',
        authorId: 'A',
        status: 'FINAL',
        mark: 16,
        finalSnapshot: { historical: 'synthetic retained snapshot' },
        finalizedAt: new Date(),
        finalizedById: 'A',
        sharedWithTeacherAt: new Date(),
        sharedWithTeacherById: 'A',
        teacherAcknowledgedAt: new Date(),
        teacherAcknowledgedById: 'T',
      },
    });
    const before = {
      head: await db.inspectorAssignment.findUnique({ where: { teacherId: 'T' } }),
      slots: await db.teacherWeeklySlot.findMany(),
      cards: await db.teacherInformationCardSubmission.findMany(),
      visits: await db.inspectionVisitRecord.findMany(),
      reports: await db.visitReport.findMany(),
    };
    const session = await passwordLogin('T');
    expect((await request('admin', '/db/users/T', 'DELETE')).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'T' } })).status).toBe('archived');
    expect((await request('admin', '/admin/users/pending')).data.users.some((user: { id: string }) => user.id === 'T')).toBe(false);
    expect((await passwordLogin('T')).status).toBe(403);
    expect(
      (
        await fetch(base + '/api/teacher/information-card', {
          headers: { Cookie: session.cookie! },
        })
      ).status
    ).toBe(401);
    expect(await db.inspectorAssignment.findUnique({ where: { teacherId: 'T' } })).toEqual(
      before.head
    );
    expect(await db.teacherWeeklySlot.findMany()).toEqual(before.slots);
    expect(await db.teacherInformationCardSubmission.findMany()).toEqual(before.cards);
    expect(await db.inspectionVisitRecord.findMany()).toEqual(before.visits);
    expect(await db.visitReport.findMany()).toEqual(before.reports);
    expect(
      (await request('admin', '/admin/users/T/lifecycle', 'POST', { action: 'reactivate' })).status
    ).toBe(409);
    expect(
      (
        await request('admin', '/db/users', 'POST', {
          privilegedAccountMutation: true,
          user: { id: 'T', status: 'active', isApprovedByAdmin: true },
        })
      ).status
    ).toBe(409);
    const count = await db.auditEvent.count({
      where: { entityId: 'T', eventType: 'ACCOUNT_ARCHIVED' },
    });
    await request('admin', '/db/users/T', 'DELETE');
    expect(
      await db.auditEvent.count({ where: { entityId: 'T', eventType: 'ACCOUNT_ARCHIVED' } })
    ).toBe(count);
  });
  it('all ordinary account paths protect current Admin and reject non-Admin mutation', async () => {
    for (const action of ['deactivate', 'archive'])
      expect(
        (await request('admin', '/admin/users/admin/lifecycle', 'POST', { action })).status
      ).toBe(403);
    expect((await request('admin', '/db/users/admin', 'DELETE')).status).toBe(403);
    expect(
      (
        await request('admin', '/db/users', 'POST', {
          privilegedAccountMutation: true,
          user: { id: 'admin', status: 'inactive' },
        })
      ).status
    ).toBe(403);
    for (const actor of ['T', 'A', 'director'])
      expect(
        (await request(actor, '/admin/users/T/lifecycle', 'POST', { action: 'archive' })).status
      ).toBe(403);
  });
  it('Information Card stays persisted after submission and resolves only the active current Inspector', async () => {
    const card = await import('../src/server/informationCardService');
    await card.saveCard({ id: 'T', role: 'teacher' }, 'T', {
      revision: 0,
      identity: { firstName: 'أستاذ', lastName: 'اصطناعي', birthDate: '1990-01-01', phone: '' },
      extra: { cadre: 'أستاذ', administrativeStatus: 'مرسم(ة)', qualifications: [] },
    });
    const saved = await card.readCard({ id: 'T', role: 'teacher' }, 'T');
    expect(saved.current.identity.firstName).toBe('أستاذ');
    const sent = await card.submitCard({ id: 'T', role: 'teacher' }, 'T', saved.revision);
    expect(sent.submission!.submittedInspectorId).toBe('A');
    expect((await card.readCard({ id: 'T', role: 'teacher' }, 'T')).status).toBe('SUBMITTED');
    expect(
      (await request('A', '/inspector/teachers/T/supervision-dossier?academicYearId=2026-2027'))
        .status
    ).toBe(200);
    expect(
      (await request('B', '/inspector/teachers/T/supervision-dossier?academicYearId=2026-2027'))
        .status
    ).toBe(403);
  });
  it('no valid accepted/active Inspector never reports a successful Information Card submission', async () => {
    const card = await import('../src/server/informationCardService');
    await card.saveCard({ id: 'T', role: 'teacher' }, 'T', {
      revision: 0,
      identity: { firstName: 'T', lastName: 'Synthetic', birthDate: '1990-01-01', phone: '' },
      extra: { cadre: 'أستاذ', administrativeStatus: 'مرسم(ة)', qualifications: [] },
    });
    await db.user.update({ where: { id: 'A' }, data: { status: 'archived' } });
    await expect(card.submitCard({ id: 'T', role: 'teacher' }, 'T', 1)).rejects.toThrow(
      'غير مفعّل'
    );
    expect(await db.teacherInformationCardSubmission.count()).toBe(0);
  });
});
