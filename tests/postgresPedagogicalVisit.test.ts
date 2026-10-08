import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const gateUrl = process.env.ARENASPEX_POSTGRES_GATE_URL;
const gateRoot = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
let db: PrismaClient; let server: Server; let httpUrl: string;
let signSession: typeof import('../src/server/auth').signSession;
let transfer: typeof import('../src/server/assignmentTransferService');
const evidence: Record<string, unknown> = {};
const migrationName = '20261007120000_pedagogical_visit_lifecycle';
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({ parseStudentRosterPdf: () => { throw new Error('PDF outside Visit gate'); }, StudentRosterPdfImportError: class extends Error {} }));
function cli(args: string[]) { return execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), ...args], { encoding: 'utf8', timeout: 60000, env: { ...process.env, DATABASE_URL: gateUrl!, DIRECT_DATABASE_URL: gateUrl! } }); }
async function request(actor: string, endpoint: string, body?: unknown) { const role = (await db.user.findUniqueOrThrow({ where: { id: actor } })).role; const r = await fetch(httpUrl + '/api' + endpoint, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: `spex_session=${signSession({ userId: actor, role })}` }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json() }; }
const input = (visitType = 'TENURE') => ({ teacherId: 'T', visitType, scheduledAt: '2098-10-08T09:00:00+01:00', academicYearId: '2098-2099' });
async function create(type = 'TENURE') { const r = await request('A', '/pedagogical-visits', input(type)); expect(r.status).toBe(201); return r.data.visit; }
async function action(v: { id: string; revision: number }, act: string, extra: Record<string, unknown> = {}, actor = 'A') { return request(actor, `/pedagogical-visits/${v.id}/actions`, { revision: v.revision, action: act, ...extra }); }
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe.skipIf(!gateUrl)('Pedagogical Visit lifecycle: real disposable PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(gateUrl!);
    if (target.hostname !== '127.0.0.1' || target.port !== '55482' || target.pathname !== '/arenaspex_po_ins_02_disposable' || target.searchParams.get('schema') !== 'public' || !gateRoot || !path.resolve(gateRoot).startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-'))) throw new Error('STOP: no proven disposable database');
    process.env.DATABASE_URL = gateUrl!; process.env.DIRECT_DATABASE_URL = gateUrl!;
    db = new PrismaClient({ datasources: { db: { url: gateUrl! } } });
    const [identity] = await db.$queryRaw<{ directory: string; database: string; host: string; port: number }[]>`SELECT current_setting('data_directory') AS directory,current_database() AS database,host(inet_server_addr()) AS host,inet_server_port() AS port`;
    expect(identity).toMatchObject({ host: '127.0.0.1', port: 55482, database: 'arenaspex_po_ins_02_disposable' }); expect(path.resolve(identity.directory).toLowerCase()).toBe(path.resolve(gateRoot, 'data').toLowerCase()); expect(await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`).toEqual([]); evidence.isolation = identity;
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const legacy = 'model InspectionVisitRecord {\n id String @id\n inspectorId String\n teacherId String\n institutionId String?\n data Json\n createdAt DateTime @default(now())\n report VisitReport?\n @@index([teacherId, createdAt])\n @@index([inspectorId, createdAt])\n}';
    const pre = schema.replace(/^model InspectionVisitRecord \{[\s\S]*?^\}/m, legacy).replace(/^enum PedagogicalVisit(?:Type|Status) \{[\s\S]*?^\}/gm, '');
    const scratch = path.join(gateRoot, 'prisma'); const schemaFile = path.join(scratch, 'schema.prisma'); const baseline = path.join(scratch, 'migrations/00000000000000_gate_pre_visit'); mkdirSync(baseline, { recursive: true }); writeFileSync(schemaFile, pre); writeFileSync(path.join(scratch, 'migrations/migration_lock.toml'), 'provider = "postgresql"\n');
    cli(['migrate', 'diff', '--from-empty', '--to-schema-datamodel', schemaFile, '--script', '--output', path.join(baseline, 'migration.sql')]); cli(['migrate', 'deploy', '--schema', schemaFile]);
    // Relevant non-empty baseline and fingerprints before the additive migration.
    await db.$executeRawUnsafe(`INSERT INTO "InspectionVisitRecord" (id,"inspectorId","teacherId",data) VALUES ('preserved','old-inspector','old-teacher','{"pedagogicalGrade":16.5,"officialReportGenerated":true,"visitType":"legacy-evaluation","status":"legacy-final"}')`);
    await db.user.create({ data: { id: 'preserved-user', username: 'preserved', spexId: 'preserved', firstName: 'Synthetic', lastName: 'Preserved', email: 'preserved@example.test', passwordHash: 'synthetic', role: 'teacher', districtId: '', directorateId: '' } });
    await db.user.create({ data: { id: 'preserved-actor', username: 'preserved-actor', spexId: 'preserved-actor', firstName: 'Synthetic', lastName: 'Actor', email: 'preserved-actor@example.test', passwordHash: 'synthetic', role: 'inspector', districtId: '', directorateId: '' } });
    await db.inspectorAssignment.create({ data: { teacherId: 'preserved-user', status: 'Active', inspectorId: 'preserved-actor' } });
    await db.communityNotification.create({ data: { id: 'preserved-notification', userId: 'preserved-user', data: { synthetic: true } } });
    const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename!='_prisma_migrations' ORDER BY tablename`;
    const before: Record<string, string> = {};
    for (const { tablename } of tables) before[tablename] = digest(await db.$queryRawUnsafe(`SELECT * FROM "${tablename}" ORDER BY 1`));
    const oldVisit = await db.$queryRaw`SELECT * FROM "InspectionVisitRecord"`;
    const targetMigration = path.join(scratch, 'migrations', migrationName); mkdirSync(targetMigration); copyFileSync(`prisma/migrations/${migrationName}/migration.sql`, path.join(targetMigration, 'migration.sql')); writeFileSync(schemaFile, schema);
    evidence.migration = cli(['migrate', 'deploy', '--schema', schemaFile]);
    for (const { tablename } of tables) if (tablename !== 'InspectionVisitRecord') expect(digest(await db.$queryRawUnsafe(`SELECT * FROM "${tablename}" ORDER BY 1`))).toBe(before[tablename]);
    expect(await db.$queryRaw`SELECT id,"inspectorId","teacherId","institutionId",data,"createdAt" FROM "InspectionVisitRecord"`).toEqual(oldVisit);
    expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'preserved' } })).status).toBeNull();
    evidence.preexistingFingerprints = before; evidence.legacyPreserved = true; evidence.schemaDiff = cli(['migrate', 'diff', '--from-url', gateUrl!, '--to-schema-datamodel', path.resolve('prisma/schema.prisma'), '--exit-code']); evidence.migrationSHA256 = createHash('sha256').update(readFileSync(`prisma/migrations/${migrationName}/migration.sql`)).digest('hex');
    await db.$disconnect(); ({ prisma: db } = await import('../src/server/prismaClient')); const { apiRouter } = await import('../src/server/apiRouter'); const { assignmentRouter } = await import('../src/server/assignmentRouter'); const { requireAuth, requireOperationalAccount } = await import('../src/server/middleware/requireAuth'); ({ signSession } = await import('../src/server/auth')); transfer = await import('../src/server/assignmentTransferService');
    const app = express(); app.use(express.json(), cookieParser()); app.use('/api', apiRouter); app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter); app.use((e: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: e.message }));
    server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('Not loopback'); httpUrl = `http://127.0.0.1:${address.port}`;
  }, 120000);
  beforeEach(async () => {
    vi.useRealTimers(); await db.$executeRawUnsafe('TRUNCATE "User", "Directorate", "InspectionVisitRecord", "CommunityNotification" CASCADE');
    for (const suffix of ['a', 'b']) { await db.directorate.create({ data: { id: `dir-${suffix}`, name: `Synthetic ${suffix}` } }); await db.inspectionDistrict.create({ data: { id: `district-${suffix}`, name: `Synthetic ${suffix}`, directorateId: `dir-${suffix}` } }); }
    for (const [id, role, suffix] of [['T', 'teacher', 'a'], ['T2', 'teacher', 'b'], ['A', 'inspector', 'a'], ['B', 'inspector', 'b'], ['admin', 'admin', '']] as const) await db.user.create({ data: { id, username: id, spexId: id, firstName: id, lastName: 'Synthetic', email: `${id}@example.test`, passwordHash: 'synthetic', role, status: 'active', directorateId: suffix ? `dir-${suffix}` : '', districtId: suffix ? `district-${suffix}` : '', eduDirectorateId: suffix ? `dir-${suffix}` : null, eduDistrictId: suffix ? `district-${suffix}` : null, isApprovedByAdmin: true, accessExpiresAt: new Date('2099-07-31') } });
    await db.inspectorAssignment.create({ data: { teacherId: 'T', inspectorId: 'A', status: 'Active' } }); await db.inspectorAssignment.create({ data: { teacherId: 'T2', inspectorId: 'B', status: 'Active' } });
  });
  afterAll(async () => { vi.useRealTimers(); if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); } if (db) await db.$disconnect(); if (gateRoot) writeFileSync(path.join(gateRoot, 'pedagogical-visit-evidence.json'), JSON.stringify(evidence, null, 2)); });
  it('only current Inspector can schedule; exact types; no forged actor, identity, marks or report', async () => {
    for (const type of ['GUIDANCE', 'TENURE', 'MONITORING']) { const v = await create(type); expect(v).toMatchObject({ inspectorId: 'A', teacherId: 'T', visitType: type, status: 'SCHEDULED', revision: 0, teacherNotifiedAt: null, completedAt: null }); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).data).toEqual({ pedagogicalGrade: null, officialReportGenerated: false }); }
    for (const actor of ['T', 'B', 'admin']) expect((await request(actor, '/pedagogical-visits', input())).status).toBe(403);
    for (const visitType of ['EVALUATION', 'INSPECTION', 'توجيهية', '']) expect((await request('A', '/pedagogical-visits', input(visitType))).status).toBe(400);
    for (const forged of [{ inspectorId: 'B' }, { pedagogicalGrade: 16 }, { officialReportGenerated: true }, { teacherName: 'fake' }]) expect((await request('A', '/pedagogical-visits', { ...input(), ...forged })).status).toBe(400);
    expect(await db.communityNotification.count()).toBe(0);
  });
  it('postpone requires reason; explicit reschedule preserves previous actor/time/reason and snapshot time', async () => {
    let v = await create('GUIDANCE'); expect((await action(v, 'POSTPONE')).status).toBe(400); const postponed = await action(v, 'POSTPONE', { reason: 'Synthetic travel' }); expect(postponed.status).toBe(200); v = postponed.data.visit; expect(v).toMatchObject({ status: 'POSTPONED', postponedById: 'A', postponementReason: 'Synthetic travel' }); expect(v.postponedAt).toBeTruthy(); expect((await action(v, 'COMPLETE')).status).toBe(409);
    const r = await action(v, 'RESCHEDULE', { scheduledAt: '2098-10-09T10:00:00+01:00' }); expect(r.status).toBe(200); expect(r.data.visit).toMatchObject({ status: 'SCHEDULED', postponementReason: 'Synthetic travel' }); expect(r.data.visit.history).toHaveLength(3); expect(new Date(r.data.visit.scheduledAt).toISOString()).toBe('2098-10-09T09:00:00.000Z'); expect(await db.communityNotification.count()).toBe(0);
  });
  it('cancel requires reason, preserves history and prohibits terminal recovery/deletion', async () => {
    let v = await create(); expect((await action(v, 'CANCEL', { reason: ' ' })).status).toBe(400); v = (await action(v, 'CANCEL', { reason: 'Synthetic cancellation' })).data.visit; expect(v).toMatchObject({ status: 'CANCELLED', cancelledById: 'A', cancellationReason: 'Synthetic cancellation' }); expect(v.cancelledAt).toBeTruthy(); for (const act of ['COMPLETE', 'POSTPONE', 'RESCHEDULE', 'COMMUNICATE', 'CANCEL']) expect((await action(v, act, { reason: 'synthetic', scheduledAt: input().scheduledAt })).status).toBe(409); expect(await db.inspectionVisitRecord.count()).toBe(1); expect(await db.communityNotification.count()).toBe(0);
  });
  it('completion explicit, no future completion, no automatic mark/report or new surprise publication', async () => {
    let v = await create('MONITORING'); expect((await action(v, 'COMPLETE')).status).toBe(409); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2098-10-08T10:00:00+01:00')); const completed = await action(v, 'COMPLETE'); expect(completed.status).toBe(200); v = completed.data.visit; expect(v.status).toBe('COMPLETED'); expect(v.completedAt).toBeTruthy(); expect((await action(v, 'RESCHEDULE', { scheduledAt: '2098-10-09T09:00:00+01:00' })).status).toBe(409); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).data).toEqual({ pedagogicalGrade: null, officialReportGenerated: false }); expect((await request('T', '/teacher/visit-appointments')).data.count).toBe(0);
  });
  it.each(['GUIDANCE', 'MONITORING', 'TENURE'])('uncommunicated %s cannot leak via API, lookup, legacy feed, counts, notification feeds or payloads', async (type) => {
    const v = await create(type); expect((await request('A', '/inspector/visit-planning')).data.visits).toHaveLength(1); expect((await request('T', '/inspector/visit-planning')).status).toBe(403);
    expect((await request('T', '/teacher/visit-appointments')).data).toEqual({ appointments: [], count: 0 }); expect((await request('T', `/teacher/visit-appointments/${v.id}`)).status).toBe(404); const feed = await request('T', '/teacher/inspection-feed'); expect(feed.data.visits).toEqual([]); expect(feed.data.counts).toMatchObject({ visits: 0, interactions: 0 }); expect((await request('T', '/communication/notifications')).data.notifications).toEqual([]); expect((await request('T', '/db/community-notifications')).data.communityNotifications).toEqual([]); expect((await request('T', '/inspector/visits')).status).toBe(403);
    if (type !== 'TENURE') expect((await action(v, 'COMMUNICATE')).status).toBe(409);
  });
  it('explicit TENURE communication persists trustworthy actor/time; recipient only; no private JSON', async () => {
    const v = await create(); expect((await action(v, 'COMMUNICATE', {}, 'B')).status).toBe(403); expect((await action(v, 'COMMUNICATE', {}, 'T')).status).toBe(403); expect((await action(v, 'COMMUNICATE', { teacherNotifiedById: 'B' })).status).toBe(400);
    expect((await request('A', '/db/community-notifications', { notification: { id: `visit_${v.id}`, userId: 'T2', type: 'visit_appointment', message: 'forged' } })).status).toBe(403);
    const r = await action(v, 'COMMUNICATE'); expect(r.status).toBe(200); expect(r.data.visit.teacherNotifiedById).toBe('A'); expect(r.data.visit.teacherNotifiedAt).toBeTruthy(); const result = await request('T', '/teacher/visit-appointments'); expect(result.data.count).toBe(1); expect(result.data.appointments[0]).not.toHaveProperty('data'); expect(result.data.appointments[0]).not.toHaveProperty('history'); expect((await request('T2', `/teacher/visit-appointments/${v.id}`)).status).toBe(404); expect((await request('T', '/communication/notifications')).data.notifications).toHaveLength(1); expect((await action(r.data.visit, 'COMMUNICATE')).status).toBe(409); expect(await db.communityNotification.count()).toBe(1);
  });
  it('uncommunicated tenure updates/postponement/cancellation stay private with no notification', async () => {
    let v = await create(); v = (await action(v, 'RESCHEDULE', { scheduledAt: '2098-10-09T09:00:00+01:00' })).data.visit; v = (await action(v, 'POSTPONE', { reason: 'private' })).data.visit; v = (await action(v, 'CANCEL', { reason: 'private' })).data.visit; expect(v.status).toBe('CANCELLED'); expect((await request('T', '/teacher/visit-appointments')).data.count).toBe(0); expect(await db.communityNotification.count()).toBe(0);
  });
  it('communicated tenure changes update one existing notification and visible appointment without stale active state', async () => {
    let v = (await action(await create(), 'COMMUNICATE')).data.visit; const originalTime = v.teacherNotifiedAt;
    const noOp = await action(v, 'RESCHEDULE', { scheduledAt: input().scheduledAt }); expect(noOp.status).toBe(409); expect(await db.communityNotification.count()).toBe(1);
    v = (await action(v, 'POSTPONE', { reason: 'private reason' })).data.visit; expect((await request('T', '/teacher/visit-appointments')).data.appointments[0].status).toBe('POSTPONED');
    v = (await action(v, 'RESCHEDULE', { scheduledAt: '2098-10-09T10:00:00+01:00' })).data.visit; expect((await request('T', '/teacher/visit-appointments')).data.appointments[0].scheduledAt).toBe(v.scheduledAt);
    v = (await action(v, 'CANCEL', { reason: 'private reason' })).data.visit; expect(v.teacherNotifiedAt).toBe(originalTime); const visible = (await request('T', '/teacher/visit-appointments')).data.appointments[0]; expect(visible.status).toBe('CANCELLED'); expect(JSON.stringify(visible)).not.toContain('private reason'); expect(await db.communityNotification.count()).toBe(1); expect((await db.communityNotification.findFirstOrThrow()).data).toMatchObject({ status: 'CANCELLED', scheduledAt: v.scheduledAt });
  });
  it('transfer switches current control while preserving authored visit, old historical compatibility and card access', async () => {
    const v = await create(); const pending = await transfer.requestTeacherTransfer({ teacherId: 'T', destinationInspectorId: 'B', requestedById: 'admin' }); expect((await action(v, 'RESCHEDULE', { scheduledAt: '2098-10-09T09:00:00+01:00' }, 'B')).status).toBe(403); await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    expect((await request('A', '/pedagogical-visits', input())).status).toBe(403); expect((await action(v, 'COMMUNICATE')).status).toBe(403); expect((await action(v, 'CANCEL', { reason: 'old actor' })).status).toBe(403); expect((await request('A', '/inspector/visit-planning?teacherId=T')).status).toBe(403); expect((await request('B', '/pedagogical-visits', input('MONITORING'))).status).toBe(201);
    const updated = await action(v, 'COMMUNICATE', {}, 'B'); expect(updated.status).toBe(200); expect(updated.data.visit).toMatchObject({ inspectorId: 'A', teacherNotifiedById: 'B' }); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).inspectorId).toBe('A'); expect((await request('A', '/inspector/teachers/T/information-card')).status).toBe(403); expect((await request('B', '/inspector/teachers/T/supervision-dossier?academicYearId=2098-2099')).status).toBe(200);
  });
  it('slot/class source belongs to Teacher/year; schedule never mutates or tracks later timetable changes', async () => {
    await db.studentClass.create({ data: { id: 'group', teacherId: 'T', name: 'Synthetic', levelId: '1ap' } }); await db.studentClass.create({ data: { id: 'other', teacherId: 'T2', name: 'Other', levelId: '1ap' } });
    const slot = await db.teacherWeeklySlot.create({ data: { id: 'slot', teacherId: 'T', classId: 'group', academicYearId: '2098-2099', weekday: 1, startTime: '09:00', endTime: '09:45' } });
    expect((await request('B', '/inspector/teachers/T/supervision-dossier?academicYearId=2098-2099')).status).toBe(403); expect((await request('A', '/inspector/teachers/T/supervision-dossier?academicYearId=2098-2099')).data.weeklySchedule).toHaveLength(1);
    expect((await request('A', '/pedagogical-visits', { ...input(), classId: 'other' })).status).toBe(400); expect((await request('A', '/pedagogical-visits', { ...input(), weeklySlotId: 'missing' })).status).toBe(400); expect((await request('A', '/pedagogical-visits', { ...input(), academicYearId: '2097-2098', scheduledAt: '2097-10-08T09:00:00+01:00', weeklySlotId: slot.id })).status).toBe(400);
    const r = await request('A', '/pedagogical-visits', { ...input(), weeklySlotId: slot.id }); expect(r.status).toBe(201); expect(r.data.visit.classId).toBe('group'); expect(await db.teacherWeeklySlot.findUniqueOrThrow({ where: { id: slot.id } })).toEqual(slot); await db.teacherWeeklySlot.update({ where: { id: slot.id }, data: { startTime: '11:00', endTime: '11:45' } }); await db.teacherWeeklySlot.delete({ where: { id: slot.id } }); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: r.data.visit.id } })).scheduledAt!.toISOString()).toBe('2098-10-08T08:00:00.000Z');
  });
  it('stale/competing cancellation and communication have one winner with atomic notification', async () => {
    const v = await create(); const result = await Promise.all([action(v, 'COMMUNICATE'), action(v, 'CANCEL', { reason: 'concurrent' })]); expect(result.map((r) => r.status).sort()).toEqual([200, 409]); const row = await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } }); expect(row.revision).toBe(1); expect(await db.communityNotification.count()).toBe(row.teacherNotifiedAt ? 1 : 0); evidence.concurrency = { communicateVsCancel: result.map((r) => r.status), persistedState: row.status };
  });
  it.each([['COMPLETE', 'CANCEL'], ['POSTPONE', 'COMPLETE'], ['RESCHEDULE', 'CANCEL']])('concurrent %s vs %s cannot create contradictory states', async (left, right) => {
    const v = await create('MONITORING'); if (left !== 'RESCHEDULE') { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2098-10-08T10:00:00+01:00')); }
    const extra = { reason: 'Synthetic race', scheduledAt: '2098-10-09T09:00:00+01:00' }; const results = await Promise.all([action(v, left, extra), action(v, right, extra)]); expect(results.map((r) => r.status).sort()).toEqual([200, 409]); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).revision).toBe(1);
  });
  it('notification SQL failure rolls back communication, actor, history, revision and notification atomically', async () => {
    const v = await create(); const before = await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } });
    await db.$executeRawUnsafe(`CREATE FUNCTION gate_fail_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notification failure'; END $$`); await db.$executeRawUnsafe(`CREATE TRIGGER gate_fail_notification BEFORE INSERT OR UPDATE ON "CommunityNotification" FOR EACH ROW EXECUTE FUNCTION gate_fail_notification()`);
    try { expect((await action(v, 'COMMUNICATE')).status).toBe(500); expect(await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).toEqual(before); expect(await db.communityNotification.count()).toBe(0); evidence.rollback = 'PASS: SQL notification failure after visit update rolled back whole transaction'; } finally { await db.$executeRawUnsafe('DROP TRIGGER gate_fail_notification ON "CommunityNotification"'); await db.$executeRawUnsafe('DROP FUNCTION gate_fail_notification()'); }
  });
  it.each(['COMMUNICATE', 'CANCEL'])('accepted transfer racing %s serializes at current assignment; old actor denied after acceptance', async (act) => {
    const v = await create(); const pending = await transfer.requestTeacherTransfer({ teacherId: 'T', destinationInspectorId: 'B', requestedById: 'admin' });
    const [mutation, decision] = await Promise.allSettled([action(v, act, act === 'CANCEL' ? { reason: 'Synthetic race' } : {}), transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted')]);
    expect(decision.status).toBe('fulfilled'); expect(mutation.status).toBe('fulfilled'); if (mutation.status === 'fulfilled') expect([200, 403, 409]).toContain(mutation.value.status);
    expect((await db.inspectorAssignment.findUniqueOrThrow({ where: { teacherId: 'T' } })).inspectorId).toBe('B'); const row = await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } }); expect(row.inspectorId).toBe('A'); expect((await action({ ...v, revision: row.revision }, act, { reason: 'After transfer' })).status).toBe(403); expect(await db.communityNotification.count()).toBe(row.teacherNotifiedAt ? 1 : 0);
    evidence[`transferVs${act}`] = { transfer: decision.status, mutation: mutation.status === 'fulfilled' ? mutation.value.status : 'rejected', originalActorPreserved: row.inspectorId };
  });
  it('legacy write cannot bypass future privacy or create an invented type; dates/revisions remain strict', async () => {
    expect((await request('A', '/inspection-visits', { teacherId: 'T', visitDate: '2098-10-08', visitType: 'توجيهية' })).status).toBe(400);
    expect((await request('A', '/inspection-visits', { teacherId: 'T', visitType: 'تقييمية' })).status).toBe(400);
    for (const scheduledAt of ['2098-02-30T09:00:00+01:00', '2098-10-08T09:00:00', '2025-10-08T09:00:00+01:00']) expect((await request('A', '/pedagogical-visits', { ...input(), scheduledAt })).status).toBe(400);
    const v = await create(); expect((await action({ ...v, revision: 999 }, 'COMMUNICATE')).status).toBe(409); expect(await db.communityNotification.count()).toBe(0);
  });
  it('old Inspector reads completed pre-transfer lifecycle history with original actor; future records remain under new control', async () => {
    const done = await create('GUIDANCE'); const future = await create('MONITORING'); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2098-10-08T10:00:00+01:00')); expect((await action(done, 'COMPLETE')).status).toBe(200);
    vi.setSystemTime(new Date('2098-10-08T11:00:00+01:00')); const pending = await transfer.requestTeacherTransfer({ teacherId: 'T', destinationInspectorId: 'B', requestedById: 'admin' }); await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    const archive = (await request('A', '/inspector/archive')).data.visits; expect(archive).toHaveLength(1); expect(archive[0]).toMatchObject({ id: done.id, inspectorId: 'A', data: { status: 'COMPLETED', visitType: 'زيارة توجيهية', pedagogicalGrade: null, officialReportGenerated: false } }); expect(archive[0].data.completedAt).toBeTruthy(); expect(archive.some((v: { id: string }) => v.id === future.id)).toBe(false); expect((await request('B', '/inspector/visit-planning')).data.visits).toHaveLength(2);
  });
  it('legacy future-dated records cannot leak through Teacher feed or counts; past records and historical report data survive', async () => {
    const historical = { visitDate: '2026-09-01', visitType: 'legacy-evaluation', pedagogicalGrade: 16.5, officialReportGenerated: true };
    await db.inspectionVisitRecord.create({ data: { id: 'legacy-past', inspectorId: 'A', teacherId: 'T', data: historical } }); await db.inspectionVisitRecord.create({ data: { id: 'legacy-future', inspectorId: 'A', teacherId: 'T', data: { visitDate: '2098-10-08', visitType: 'توجيهية' } } });
    const feed = (await request('T', '/teacher/inspection-feed')).data; expect(feed.visits).toEqual([historical]); expect(feed.counts.visits).toBe(1); expect(feed.counts.interactions).toBe(1); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'legacy-future' } })).status).toBeNull(); expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: 'legacy-past' } })).data).toEqual(historical); expect((await request('A', '/inspector/visits')).data.visits).toHaveLength(2);
  });
});
