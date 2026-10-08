import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Real services/HTTP auth/Prisma, synthetic data only. Ordinary runs skip this
// suite. DB identity and empty-cluster proof precede schema bootstrap/imports.
const gateUrl = process.env.ARENASPEX_POSTGRES_GATE_URL;
const gateRoot = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
let db: PrismaClient;
let server: Server;
let httpUrl: string;
let signSession: typeof import('../src/server/auth').signSession;
let transfer: typeof import('../src/server/assignmentTransferService');
const evidence: Record<string, unknown> = {};
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => { throw new Error('PDF outside integrity gate'); },
  StudentRosterPdfImportError: class extends Error {},
}));
async function request(actor: string, endpoint: string, body?: unknown) {
  const role = (await db.user.findUniqueOrThrow({ where: { id: actor } })).role;
  const response = await fetch(httpUrl + endpoint, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: `spex_session=${signSession({ userId: actor, role })}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
describe.skipIf(!gateUrl)('Inspector integrity against disposable PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(gateUrl!);
    if (target.hostname !== '127.0.0.1' || target.port !== '55482' || target.pathname !== '/arenaspex_po_ins_02_disposable' || target.searchParams.get('schema') !== 'public' || !gateRoot || !path.resolve(gateRoot).startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-'))) throw new Error('STOP: no dedicated disposable target');
    process.env.DATABASE_URL = gateUrl!; process.env.DIRECT_DATABASE_URL = gateUrl!;
    db = new PrismaClient({ datasources: { db: { url: gateUrl! } } });
    const [identity] = await db.$queryRaw<{ directory: string; database: string; host: string; port: number }[]>`SELECT current_setting('data_directory') AS directory,current_database() AS database,host(inet_server_addr()) AS host,inet_server_port() AS port`;
    expect(path.resolve(identity.directory).toLowerCase()).toBe(path.resolve(gateRoot, 'data').toLowerCase());
    expect(identity).toMatchObject({ host: '127.0.0.1', port: 55482, database: 'arenaspex_po_ins_02_disposable' });
    expect(await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`).toEqual([]);
    evidence.isolation = identity;
    // No new migration/history: bootstrap the unchanged schema only on the
    // fresh proven empty disposable database, never a configured .env DB.
    evidence.bootstrap = execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', path.resolve('prisma/schema.prisma'), '--skip-generate'], { encoding: 'utf8', timeout: 60000, env: { ...process.env, DATABASE_URL: gateUrl!, DIRECT_DATABASE_URL: gateUrl! } });
    await db.$disconnect();
    ({ prisma: db } = await import('../src/server/prismaClient'));
    const { apiRouter } = await import('../src/server/apiRouter');
    const { assignmentRouter } = await import('../src/server/assignmentRouter');
    const { requireAuth, requireOperationalAccount } = await import('../src/server/middleware/requireAuth');
    ({ signSession } = await import('../src/server/auth'));
    transfer = await import('../src/server/assignmentTransferService');
    const app = express(); app.use(express.json(), cookieParser());
    app.use('/api', apiRouter);
    app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter);
    app.use((error: Error & { code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(error.code === 'P2002' ? 409 : 500).json({ error: error.message }); });
    server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Not loopback'); httpUrl = `http://127.0.0.1:${address.port}`;
  }, 120000);
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "User", "Directorate", "InspectionVisitRecord", "InspectorNote" CASCADE');
    for (const suffix of ['a', 'b']) {
      await db.directorate.create({ data: { id: `dir-${suffix}`, name: `Synthetic directorate ${suffix}` } });
      await db.inspectionDistrict.create({ data: { id: `district-${suffix}`, name: `Synthetic district ${suffix}`, directorateId: `dir-${suffix}` } });
    }
    for (const [id, role, suffix] of [['T', 'teacher', 'a'], ['A', 'inspector', 'a'], ['B', 'inspector', 'b'], ['admin', 'admin', '']] as const) await db.user.create({ data: { id, username: id, spexId: id, firstName: id, lastName: 'Synthetic', email: `${id}@example.test`, passwordHash: 'synthetic', role, directorateId: suffix ? `dir-${suffix}` : '', districtId: suffix ? `district-${suffix}` : '', eduDirectorateId: suffix ? `dir-${suffix}` : null, eduDistrictId: suffix ? `district-${suffix}` : null, isApprovedByAdmin: true, accessExpiresAt: new Date('2099-07-31') } });
    await db.inspectorAssignment.create({ data: { teacherId: 'T', inspectorId: 'A', status: 'Active' } });
    await db.inspectionVisitRecord.create({ data: { id: 'historical', teacherId: 'T', inspectorId: 'A', data: { id: 'historical', teacherId: 'T', inspectorId: 'A', pedagogicalGrade: 16.5, officialReportGenerated: true, lessonObservedTitle: 'Synthetic historical lesson' } } });
  });
  afterAll(async () => { if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); } if (db) await db.$disconnect(); if (gateRoot) writeFileSync(path.join(gateRoot, 'integrity-evidence.json'), JSON.stringify(evidence, null, 2)); });

  it('records an unmarked visit without an official report even when a client sends a true flag', async () => {
    const before = await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'historical' } });
    const saved = await request('A', '/api/inspection-visits', { id: 'new', teacherId: 'T', officialReportGenerated: true });
    expect(saved.status).toBe(201); expect(saved.data.visit).toMatchObject({ pedagogicalGrade: null, officialReportGenerated: false, inspectorId: 'A' });
    expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'new' } })).data).toMatchObject({ pedagogicalGrade: null, officialReportGenerated: false });
    expect(await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'historical' } })).toEqual(before);
  });
  it('preserves explicitly entered marks including zero; does not overwrite persisted historical marks', async () => {
    for (const mark of [0, 16, 18.5, 20]) {
      const saved = await request('A', '/api/inspection-visits', { id: `explicit-${mark}`, teacherId: 'T', pedagogicalGrade: mark });
      expect(saved.status).toBe(201); expect(saved.data.visit.pedagogicalGrade).toBe(mark);
    }
    const historical = await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'historical' } });
    expect((await request('A', '/api/inspection-visits', { id: 'historical', teacherId: 'T' })).status).toBe(409);
    expect(await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'historical' } })).toEqual(historical);
  });
  it('rejects invalid marks without writing a record', async () => {
    for (const mark of [-1, 21, '16', true]) expect((await request('A', '/api/inspection-visits', { teacherId: 'T', pedagogicalGrade: mark })).status).toBe(400);
    expect(await db.inspectionVisitRecord.count()).toBe(1);
  });
  it('returns recorded visits and historical reports distinctly, while summary zeros come from real counts', async () => {
    await request('A', '/api/inspection-visits', { id: 'recorded', teacherId: 'T' });
    const detail = await request('A', '/api/inspector/teachers/T/follow-up');
    expect(detail.data.visits).toHaveLength(2); expect(detail.data.reports.map((r: { id: string }) => r.id)).toEqual(['historical']);
    expect(detail.data.reports[0].pedagogicalGrade).toBe(16.5);
    const summary = (await request('A', '/api/inspector/summary')).data.summary;
    expect(summary).toMatchObject({ visitsCount: 2, teachersCount: 1, pendingApprovalsCount: null, unreadMessagesCount: 0 });
  });
  it('enforces current assignment, revokes A after accepted transfer and retains A historical authorship/archive', async () => {
    expect((await request('B', '/api/inspection-visits', { teacherId: 'T' })).status).toBe(403);
    expect((await request('T', '/api/inspection-visits', { teacherId: 'T' })).status).toBe(403);
    const pending = await transfer.requestTeacherTransfer({ teacherId: 'T', destinationInspectorId: 'B', requestedById: 'admin' });
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    expect((await request('A', '/api/inspection-visits', { teacherId: 'T' })).status).toBe(403);
    const saved = await request('B', '/api/inspection-visits', { teacherId: 'T', inspectorId: 'A' });
    expect(saved.status).toBe(201); expect(saved.data.visit.inspectorId).toBe('B');
    const archive = await request('A', '/api/inspector/archive');
    expect(archive.data.visits[0]).toMatchObject({ id: 'historical', inspectorId: 'A' });
    expect(archive.data.visits[0].data).toMatchObject({ pedagogicalGrade: 16.5, officialReportGenerated: true });
    expect((await request('A', '/api/inspector/teachers/T/information-card')).status).toBe(403);
    expect((await request('B', '/api/inspector/teachers/T/information-card')).status).toBe(200);
    expect((await request('B', '/api/inspector/teachers/T/supervision-dossier')).status).toBe(200);
  });
});
