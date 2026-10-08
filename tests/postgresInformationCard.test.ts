import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';

// Real DB opt-in; isolated cluster proof precedes every migration/runtime import.
const gateUrl = process.env.ARENASPEX_POSTGRES_GATE_URL;
const gateRoot = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
let db: PrismaClient;
let server: Server;
let url: string;
let signSession: typeof import('../src/server/auth').signSession;
let transfer: typeof import('../src/server/assignmentTransferService');
let cardService: typeof import('../src/server/informationCardService');
const evidence: Record<string, unknown> = {};
function cli(args: string[]) { return execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), ...args], { encoding: 'utf8', timeout: 60000, env: { ...process.env, DATABASE_URL: gateUrl!, DIRECT_DATABASE_URL: gateUrl! } }); }
async function api(actor: string, endpoint: string, body?: unknown, method?: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: actor } });
  const response = await fetch(url + endpoint, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', Cookie: `spex_session=${signSession({ userId: actor, role: user.role })}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : { error: text } };
}
const base = '/api/teacher/information-card';
const inspectorBase = '/api/inspector/teachers/T/information-card';
const draft = (revision = 0, cadre = 'أستاذ التربية البدنية والرياضية') => ({ revision, identity: { firstName: 'Synthetic', lastName: 'Teacher', birthDate: '1990-01-01', phone: '0000000000' }, extra: { cadre, administrativeStatus: 'مرسم(ة)', birthPlace: 'Synthetic city', qualifications: [{ certificate: 'Synthetic qualification', issuer: 'Synthetic institute', date: '2010-01-01' }] } });
async function submitted() { expect((await api('T', base, draft(), 'PUT')).status).toBe(200); const result = await api('T', `${base}/submit`, { revision: 1 }); expect(result.status).toBe(200); return result.data; }
async function reviewer(decision: string, submissionId: string, reason?: string, actor = 'A') { return api(actor, `${inspectorBase}/review`, { submissionId, decision, reason }); }

describe.skipIf(!gateUrl)('Information Card / supervision dossier on disposable PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(gateUrl!);
    if (target.hostname !== '127.0.0.1' || target.port !== '55482' || target.pathname !== '/arenaspex_po_ins_02_disposable' || target.searchParams.get('schema') !== 'public' || !gateRoot || !path.resolve(gateRoot).startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-'))) throw new Error('STOP: no proven disposable target');
    process.env.DATABASE_URL = gateUrl!; process.env.DIRECT_DATABASE_URL = gateUrl!;
    db = new PrismaClient({ datasources: { db: { url: gateUrl! } } });
    const [identity] = await db.$queryRaw<{ directory: string; host: string; port: number; database: string }[]>`SELECT current_setting('data_directory') AS directory,host(inet_server_addr()) AS host,inet_server_port() AS port,current_database() AS database`;
    expect(identity).toMatchObject({ host: '127.0.0.1', port: 55482, database: 'arenaspex_po_ins_02_disposable' });
    expect(path.resolve(identity.directory).toLowerCase()).toBe(path.resolve(gateRoot, 'data').toLowerCase());
    expect(await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`).toEqual([]);
    evidence.isolation = identity;
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const pre = schema.replace(/^\s*(informationCard|informationCardSubmissions)\s+TeacherInformationCard[^\r\n]*/gm, '').replace(/^model TeacherInformationCard(?:Submission)? \{[\s\S]*?^\}/gm, '');
    const scratch = path.join(gateRoot, 'prisma'); const preFile = path.join(scratch, 'schema.prisma');
    const baseline = path.join(scratch, 'migrations/00000000000000_gate_pre_card'); mkdirSync(baseline, { recursive: true });
    writeFileSync(preFile, pre); writeFileSync(path.join(scratch, 'migrations/migration_lock.toml'), 'provider = "postgresql"\n');
    cli(['migrate', 'diff', '--from-empty', '--to-schema-datamodel', preFile, '--script', '--output', path.join(baseline, 'migration.sql')]);
    cli(['migrate', 'deploy', '--schema', preFile]);
    await db.user.create({ data: { id: 'preserved-T', username: 'preserved-T', spexId: 'preserved-T', firstName: 'Synthetic', lastName: 'Preserved', email: 'preserved@example.test', passwordHash: 'synthetic', role: 'teacher', directorateId: '', districtId: '' } });
    for (const id of ['preserved-A', 'preserved-B']) await db.user.create({ data: { id, username: id, spexId: id, firstName: 'Synthetic', lastName: id, email: `${id}@example.test`, passwordHash: 'synthetic', role: 'inspector', directorateId: '', districtId: '' } });
    const oldHead = await db.inspectorAssignment.create({ data: { teacherId: 'preserved-T', inspectorId: 'preserved-A', status: 'Active' } });
    const oldHistory = await db.inspectorAssignmentTransfer.create({ data: { teacherId: 'preserved-T', sourceAssignmentId: oldHead.id, sourceAssignmentUpdatedAt: oldHead.updatedAt, sourceInspectorId: 'preserved-A', sourceDirectorateId: 'synthetic-dir-a', sourceDistrictId: 'synthetic-a', destinationInspectorId: 'preserved-B', destinationDirectorateId: 'synthetic-dir-b', destinationDistrictId: 'synthetic-b', requestedById: 'preserved-T', snapshot: { synthetic: true }, status: 'Rejected' } });
    const before = await db.user.findMany();
    const targetDir = path.join(scratch, 'migrations/20261007010000_teacher_information_card'); mkdirSync(targetDir);
    copyFileSync('prisma/migrations/20261007010000_teacher_information_card/migration.sql', path.join(targetDir, 'migration.sql'));
    expect(readFileSync(path.join(targetDir, 'migration.sql'))).toEqual(readFileSync('prisma/migrations/20261007010000_teacher_information_card/migration.sql'));
    writeFileSync(preFile, schema);
    evidence.migration = cli(['migrate', 'deploy', '--schema', preFile]);
    expect(await db.user.findMany()).toEqual(before);
    expect(await db.inspectorAssignment.findUniqueOrThrow({ where: { id: oldHead.id } })).toEqual(oldHead);
    expect(await db.inspectorAssignmentTransfer.findUniqueOrThrow({ where: { id: oldHistory.id } })).toEqual(oldHistory);
    evidence.preexistingData = { usersPreserved: before.length, acceptedAssignmentPreserved: true, transferHistoryPreserved: true };
    evidence.schemaDiff = cli(['migrate', 'diff', '--from-url', gateUrl!, '--to-schema-datamodel', path.resolve('prisma/schema.prisma'), '--exit-code']);
    const constraints = await db.$queryRaw<{ conname: string; contype: string }[]>`SELECT conname,contype::text FROM pg_constraint WHERE conrelid IN ('"TeacherInformationCard"'::regclass,'"TeacherInformationCardSubmission"'::regclass)`;
    expect(constraints.filter((c) => c.contype === 'f')).toHaveLength(2);
    expect(constraints.filter((c) => c.contype === 'p')).toHaveLength(2);
    const indexes = await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename='TeacherInformationCardSubmission'`;
    expect(indexes.map((row) => row.indexname)).toContain('TeacherInformationCardSubmission_teacherId_revision_key');
    const defaults = await db.$queryRaw<{ table_name: string; column_default: string }[]>`SELECT table_name,column_default FROM information_schema.columns WHERE column_name='status' AND table_name IN ('TeacherInformationCard','TeacherInformationCardSubmission')`;
    expect(defaults).toEqual(expect.arrayContaining([{ table_name: 'TeacherInformationCard', column_default: "'DRAFT'::text" }, { table_name: 'TeacherInformationCardSubmission', column_default: "'SUBMITTED'::text" }]));
    evidence.constraints = constraints;
    await db.$disconnect();
    ({ prisma: db } = await import('../src/server/prismaClient'));
    cardService = await import('../src/server/informationCardService');
    transfer = await import('../src/server/assignmentTransferService');
    const { informationCardRouter } = await import('../src/server/informationCardRouter');
    const { requireAuth, requireOperationalAccount } = await import('../src/server/middleware/requireAuth');
    ({ signSession } = await import('../src/server/auth'));
    const app = express(); app.use(cookieParser(), express.json());
    app.use('/api', requireAuth, requireOperationalAccount, informationCardRouter);
    app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(500).json({ error: error.message }); });
    server = app.listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Not loopback'); url = `http://127.0.0.1:${address.port}`;
  }, 120000);
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "User", "Directorate", "AnnualPlan" CASCADE');
    for (const suffix of ['a', 'b']) {
      await db.directorate.create({ data: { id: `dir-${suffix}`, name: `Synthetic Directorate ${suffix}` } });
      await db.inspectionDistrict.create({ data: { id: `district-${suffix}`, directorateId: `dir-${suffix}`, name: `Synthetic District ${suffix}` } });
      await db.municipality.create({ data: { id: `mun-${suffix}`, directorateId: `dir-${suffix}`, name: `Synthetic municipality ${suffix}` } });
      await db.school.create({ data: { id: `school-${suffix}`, name: `Synthetic school ${suffix}`, municipalityId: `mun-${suffix}`, inspectionDistrictId: `district-${suffix}` } });
    }
    for (const [id, role, suffix] of [['T', 'teacher', 'a'], ['T2', 'teacher', 'b'], ['A', 'inspector', 'a'], ['B', 'inspector', 'b'], ['admin', 'admin', '']] as const) await db.user.create({ data: { id, username: id, spexId: id, firstName: 'Synthetic', lastName: id, email: `${id}@example.test`, passwordHash: 'synthetic', role, status: 'active', isApprovedByAdmin: true, accessExpiresAt: new Date('2099-07-31'), directorateId: suffix ? `dir-${suffix}` : '', districtId: suffix ? `district-${suffix}` : '', eduDirectorateId: suffix ? `dir-${suffix}` : null, eduDistrictId: suffix ? `district-${suffix}` : null, institutionId: suffix ? `school-${suffix}` : null, eduSchoolId: suffix ? `school-${suffix}` : null } });
    await db.inspectorAssignment.create({ data: { teacherId: 'T', inspectorId: 'A', status: 'Active' } });
    await db.inspectorAssignment.create({ data: { teacherId: 'T2', inspectorId: 'B', status: 'Active' } });
  });
  afterAll(async () => { if (server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); } if (db) await db.$disconnect(); if (gateRoot) writeFileSync(path.join(gateRoot, 'information-card-evidence.json'), JSON.stringify(evidence, null, 2)); });

  it('Teacher reads/saves only self; no body-based ID or geo/approval/role tampering', async () => {
    expect((await api('T', base)).status).toBe(200);
    expect((await api('T', base, draft(), 'PUT')).status).toBe(200);
    expect((await api('T2', base)).data.current.identity.id).toBe('T2');
    const forged = { ...draft(1), teacherId: 'T2' };
    expect((await api('T', base, forged, 'PUT')).status).toBe(400);
    expect((await api('T', base, { ...draft(1), identity: { ...draft().identity, districtId: 'district-b' } }, 'PUT')).status).toBe(400);
    await expect(cardService.readCard({ id: 'T', role: 'teacher' }, 'T2')).rejects.toMatchObject({ status: 403 });
    await expect(cardService.saveCard({ id: 'T', role: 'teacher' }, 'T2', draft())).rejects.toMatchObject({ status: 403 });
    expect((await db.user.findUniqueOrThrow({ where: { id: 'T2' } })).lastName).toBe('T2');
  });
  it('assigned Inspector reads; unassigned and direct cross-role editing/review/print denied', async () => {
    expect((await api('A', inspectorBase)).status).toBe(200);
    expect((await api('B', inspectorBase)).status).toBe(403);
    expect((await api('A', base, draft(), 'PUT')).status).toBe(403);
    expect((await api('T', inspectorBase)).status).toBe(403);
    expect((await api('admin', inspectorBase)).status).toBe(403);
    const card = await submitted();
    expect((await reviewer('VERIFIED', card.submission.id, undefined, 'B')).status).toBe(403);
    expect((await reviewer('NEEDS_CORRECTION', card.submission.id, 'Reason', 'B')).status).toBe(403);
    expect((await api('B', `${inspectorBase}/print`)).status).toBe(403);
    expect((await api('A', `${inspectorBase}/print`)).status).toBe(200);
    expect((await api('A', inspectorBase, draft(), 'PUT')).status).toBe(404);
    await expect(cardService.saveCard({ id: 'A', role: 'inspector' }, 'T', draft())).rejects.toMatchObject({ status: 403 });
  });
  it('DRAFT → SUBMITTED → VERIFIED preserves exact immutable submission', async () => {
    const card = await submitted();
    expect(card.status).toBe('SUBMITTED');
    expect((await api('T', base, draft(1, 'forged during review'), 'PUT')).status).toBe(409);
    const reviewed = await reviewer('VERIFIED', card.submission.id);
    expect(reviewed.status).toBe(200); expect(reviewed.data.status).toBe('VERIFIED');
    expect(reviewed.data.submission.snapshot).toEqual(card.submission.snapshot);
    expect(reviewed.data.submission.reviewedById).toBe('A');
    expect((await reviewer('NEEDS_CORRECTION', card.submission.id, 'late')).status).toBe(409);
  });
  it('correction reason persists; Teacher edits/resubmits; older snapshot remains identifiable', async () => {
    const original = await submitted();
    expect((await reviewer('NEEDS_CORRECTION', original.submission.id, '')).status).toBe(400);
    const correction = await reviewer('NEEDS_CORRECTION', original.submission.id, 'Synthetic clear reason');
    expect(correction.data.status).toBe('NEEDS_CORRECTION');
    expect((await api('T', base)).data.submission.correctionReason).toBe('Synthetic clear reason');
    expect((await api('T', base, draft(1, 'Corrected cadre'), 'PUT')).status).toBe(200);
    const next = await api('T', `${base}/submit`, { revision: 2 }); expect(next.status).toBe(200);
    expect(next.data.submission.id).not.toBe(original.submission.id);
    expect((await reviewer('VERIFIED', next.data.submission.id)).status).toBe(200);
    const history = (await api('T', base)).data.history;
    expect(history).toHaveLength(2);
    expect(history.find((row: { id: string }) => row.id === original.submission.id).snapshot).toEqual(original.submission.snapshot);
  });
  it('later Teacher edits including canonical User fields cannot rewrite verified snapshot or its print', async () => {
    const original = await submitted(); await reviewer('VERIFIED', original.submission.id);
    const edited = draft(1, 'Updated later'); edited.identity.firstName = 'Changed later';
    expect((await api('T', base, edited, 'PUT')).data.status).toBe('DRAFT');
    const printed = await api('A', `${inspectorBase}/print?submissionId=${original.submission.id}`);
    expect(printed.data.snapshot).toEqual(original.submission.snapshot);
    expect((await api('A', `${inspectorBase}/print?view=current`)).data.snapshot.identity.firstName).toBe('Changed later');
    expect((await api('T', base)).data.current.identity.firstName).toBe('Changed later');
  });
  it('rejects missing required fields, invalid transitions, stale draft and malformed dates/marks/qualifications', async () => {
    expect((await api('T', `${base}/submit`, { revision: 1 })).status).toBe(409);
    expect((await api('T', base, { ...draft(), extra: { qualifications: [] } }, 'PUT')).status).toBe(200);
    expect((await api('T', `${base}/submit`, { revision: 1 })).status).toBe(400);
    expect((await api('T', base, draft(), 'PUT')).status).toBe(409);
    for (const extra of [{ inspectionMark: '21' }, { probationDate: '2026-02-30' }, { qualifications: Array.from({ length: 6 }, () => ({ certificate: '', issuer: '', date: '' })) }]) expect((await api('T', base, { ...draft(1), extra: { ...draft().extra, ...extra } }, 'PUT')).status).toBe(400);
  });
  it('post-transfer switches card/review/print/dossier access; pending destination has no access', async () => {
    const original = await submitted();
    const pending = await transfer.requestTeacherTransfer({ teacherId: 'T', destinationInspectorId: 'B', requestedById: 'admin', destinationInstitutionId: 'school-b' });
    expect((await api('A', inspectorBase)).status).toBe(200); expect((await api('B', inspectorBase)).status).toBe(403);
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    for (const suffix of ['', '/print']) { expect((await api('A', inspectorBase + suffix)).status).toBe(403); expect((await api('B', inspectorBase + suffix)).status).toBe(200); }
    expect((await reviewer('VERIFIED', original.submission.id, undefined, 'A')).status).toBe(403);
    expect((await reviewer('VERIFIED', original.submission.id, undefined, 'B')).status).toBe(200);
    expect((await api('A', '/api/inspector/teachers/T/supervision-dossier')).status).toBe(403);
    expect((await api('B', '/api/inspector/teachers/T/supervision-dossier')).status).toBe(200);
  });
  it('dossier aggregates real canonical plan, slots, classes and counts without exposing pupil identities/assessments', async () => {
    for (const id of ['g1', 'g2']) await db.studentClass.create({ data: { id, teacherId: 'T', name: `Synthetic ${id}`, levelId: 'lvl_p1' } });
    for (const [id, classId] of [['p1', 'g1'], ['p2', 'g1'], ['p3', 'g2']]) await db.student.create({ data: { id, teacherId: 'T', classId, matricule: id, firstName: 'PRIVATE_PUPIL_NAME', lastName: 'private' } });
    await db.annualPlan.create({ data: { id: 'plan-T', teacherId: 'T', academicYearId: '2026-2027', levelId: 'lvl_p1', kind: 'annual_plan_new', data: { overrides: { f_motor__components: { components: 'Authoritative teacher wording' } } } } });
    for (const [id, classId, weekday, startTime, endTime] of [['s1', 'g1', 0, '08:00', '08:45'], ['s2', 'g2', 1, '09:00', '10:30']] as const) await db.teacherWeeklySlot.create({ data: { id, teacherId: 'T', classId, academicYearId: '2026-2027', weekday, startTime, endTime } });
    const dossier = await api('A', '/api/inspector/teachers/T/supervision-dossier?academicYearId=2026-2027');
    expect(dossier.status).toBe(200);
    expect(dossier.data.summary).toMatchObject({ classCount: 2, totalPupils: 3, weeklyMinutes: 135 });
    expect(dossier.data.groups.map((group: { pupilCount: number }) => group.pupilCount).sort()).toEqual([1, 2]);
    expect(dossier.data.annualPlans[0].id).toBe('plan-T');
    expect(dossier.data.annualPlans[0].data.overrides.f_motor__components.components).toBe('Authoritative teacher wording');
    expect(dossier.data.weeklySchedule.map((slot: { id: string }) => slot.id)).toEqual(['s1', 's2']);
    expect(JSON.stringify(dossier.data)).not.toContain('PRIVATE_PUPIL_NAME');
    expect(dossier.data.students).toBeUndefined();
    const emptyYear = await api('A', '/api/inspector/teachers/T/supervision-dossier?academicYearId=2027-2028');
    expect(emptyYear.data.summary.weeklyMinutes).toBeNull(); expect(emptyYear.data.annualPlans).toEqual([]);
  });
  it('concurrent reviews allow one winner without changing submitted content', async () => {
    const card = await submitted();
    const results = await Promise.all([reviewer('VERIFIED', card.submission.id), reviewer('NEEDS_CORRECTION', card.submission.id, 'Concurrent reason')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await api('T', base)).data.submission.snapshot).toEqual(card.submission.snapshot);
    expect(await db.teacherInformationCardSubmission.count()).toBe(1);
  });
});
