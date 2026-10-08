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
describe.skipIf(!url)('Audit Trail real disposable PostgreSQL gate', () => {
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
    const { assignmentRouter } = await import('../src/server/assignmentRouter');
    const { requireAuth, requireOperationalAccount } =
      await import('../src/server/middleware/requireAuth');
    const app = express();
    app.use(express.json(), cookieParser());
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
          email: `${id}@example.test`,
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
        path.join(root, 'audit-trail-evidence.json'),
        JSON.stringify({
          localOnly: true,
          schemaChanges: true,
          checks:
            'exact migration / append-only / role boundaries / redaction / domain events / rollback / idempotency',
        })
      );
  });

  async function events(entityId: string) {
    return db.auditEvent.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } });
  }
  async function forceFailure(type: string, work: () => Promise<void>) {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION audit_gate_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."eventType"='${type}' THEN RAISE EXCEPTION 'AUDIT_GATE_FORCED_FAILURE'; END IF; RETURN NEW; END; $$`
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER audit_gate_insert BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION audit_gate_fail()'
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER audit_gate_insert ON "AuditEvent"');
      await db.$executeRawUnsafe('DROP FUNCTION audit_gate_fail()');
    }
  }
  async function report() {
    const { scheduleVisit, actOnVisit } = await import('../src/server/pedagogicalVisitService');
    const service = await import('../src/server/visitReportService');
    const visit = await scheduleVisit(
      { id: 'A', role: 'inspector' },
      {
        teacherId: 'T',
        visitType: 'GUIDANCE',
        academicYearId: '2098-2099',
        scheduledAt: '2098-10-08T09:00:00+01:00',
      }
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2098-10-08T10:00:00+01:00'));
    await actOnVisit({ id: 'A', role: 'inspector' }, visit.id, { action: 'COMPLETE', revision: 0 });
    const draft = await service.createVisitReport({ id: 'A', role: 'inspector' }, visit.id, {});
    const { GUIDANCE_SECTIONS } = await import('../src/types/visitReport');
    const content = Object.fromEntries(
      GUIDANCE_SECTIONS.flatMap((section) =>
        section.fields.map(([key, , kind]) => [key, kind === 'number' ? 45 : 'نص اصطناعي'])
      )
    );
    const saved = await service.saveVisitReport({ id: 'A', role: 'inspector' }, draft.id, {
      revision: 0,
      content,
      mark: 16,
    });
    return { service, saved };
  }
  it('Admin list/detail and all filter/count access are private; arbitrary create/update/delete routes are absent', async () => {
    await request('admin', '/admin/users/U/lifecycle', 'POST', { action: 'deactivate' });
    const list = await request('admin', '/admin/audit-events');
    expect(list.status).toBe(200);
    expect(list.data.events.length).toBeGreaterThan(0);
    const id = list.data.events[0].id;
    expect((await request('admin', `/admin/audit-events/${id}`)).status).toBe(200);
    for (const actor of ['T', 'T2', 'A', 'B', 'director'])
      for (const endpoint of [
        '/admin/audit-events',
        '/admin/audit-events?actor=admin&page=1',
        `/admin/audit-events/${id}`,
        '/admin/audit-events/guessed',
      ])
        expect((await request(actor, endpoint)).status).toBe(403);
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE'])
      expect(
        (
          await request(
            'admin',
            method === 'POST' ? '/admin/audit-events' : `/admin/audit-events/${id}`,
            method,
            {}
          )
        ).status
      ).toBe(404);
    expect((await request('admin', '/admin/audit-events?pageSize=1000')).status).toBe(400);
  });
  it('pagination/filtering is server-side, newest-first, stable and bounded', async () => {
    for (let i = 0; i < 25; i++)
      expect(
        (
          await request('admin', '/admin/users/U/lifecycle', 'POST', {
            action: i % 2 ? 'reactivate' : 'deactivate',
          })
        ).status
      ).toBe(200);
    const first = (await request('admin', '/admin/audit-events?pageSize=10')).data;
    const second = (await request('admin', '/admin/audit-events?pageSize=10&page=2')).data;
    expect(first.events).toHaveLength(10);
    expect(second.events).toHaveLength(10);
    expect(
      first.events
        .map((e: { id: string }) => e.id)
        .filter((id: string) => second.events.some((e: { id: string }) => e.id === id))
    ).toEqual([]);
    const times = first.events.map((e: { createdAt: string }) => e.createdAt);
    expect(times).toEqual([...times].sort().reverse());
    const filtered = (
      await request(
        'admin',
        '/admin/audit-events?eventType=ACCOUNT_REACTIVATED&entityType=USER&actor=admin&affectedUser=U'
      )
    ).data;
    expect(filtered.total).toBeGreaterThan(0);
    expect(
      filtered.events.every(
        (e: { eventType: string; actorUserId: string; affectedUserId: string }) =>
          e.eventType === 'ACCOUNT_REACTIVATED' &&
          e.actorUserId === 'admin' &&
          e.affectedUserId === 'U'
      )
    ).toBe(true);
    expect(
      (await request('admin', '/admin/audit-events?from=2100-01-01T00%3A00%3A00Z')).data.events
    ).toEqual([]);
  });
  it('activation/status snapshots use persisted actor role and idempotent repetition adds no false event', async () => {
    await db.user.update({
      where: { id: 'U' },
      data: { status: 'pending_approval', isApprovedByAdmin: false },
    });
    const before = await db.auditEvent.count();
    const r = await request('admin', '/admin/users/U/activate', 'POST', {});
    expect(r.status).toBe(200);
    const event = await db.auditEvent.findFirstOrThrow({
      where: { entityId: 'U' },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).toMatchObject({
      eventType: 'INSPECTOR_ACCOUNT_ACTIVATED',
      actorUserId: 'admin',
      actorRole: 'admin',
      entityType: 'USER',
      affectedUserId: 'U',
    });
    expect(event.before).toMatchObject({ status: 'pending_approval' });
    expect(event.after).toMatchObject({ status: 'active' });
    expect((await request('admin', '/admin/users/U/activate', 'POST', {})).status).toBe(200);
    expect(await db.auditEvent.count()).toBe(before + 1);
    expect(JSON.stringify(event)).not.toContain('sensitive-password-hash');
  });
  it('new Inspector district is recorded in the same transaction with stable actor identity', async () => {
    await db.user.update({ where: { id: 'U' }, data: { districtId: '', eduDistrictId: null } });
    const result = await request('U', '/inspector/districts', 'POST', {
      name: 'مقاطعة اصطناعية للتدقيق',
      directorateId: 'dir-a',
      districtNumber: 99,
    });
    expect(result.status).toBe(201);
    expect((await events(result.data.district.id))[0]).toMatchObject({
      eventType: 'INSPECTOR_DISTRICT_ASSIGNED',
      actorUserId: 'U',
      actorRole: 'inspector',
      affectedUserId: 'U',
    });
  });
  it('request/accept/reject transfer events preserve selective before/after and exactly one decision', async () => {
    const pending = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'B',
      requestedById: 'T',
    });
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    await expect(transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted')).rejects.toThrow();
    const rows = await events(pending.id);
    expect(rows.map((r) => r.eventType)).toEqual([
      'TEACHER_TRANSFER_REQUESTED',
      'TEACHER_TRANSFER_ACCEPTED',
    ]);
    expect(rows[1].before).toMatchObject({ inspectorId: 'A', districtId: 'district-a' });
    expect(rows[1].after).toMatchObject({ inspectorId: 'B', districtId: 'district-b' });
    await db.user.update({ where: { id: 'A' }, data: { firstName: 'Changed' } });
    expect((await events(pending.id))[0].actorName).toBe(rows[0].actorName);
    const back = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'A',
      requestedById: 'admin',
    });
    await transfer.decideTeacherTransfer(back.id, 'A', 'Rejected', 'سبب اصطناعي');
    expect((await events(back.id))[1]).toMatchObject({
      eventType: 'TEACHER_TRANSFER_REJECTED',
      reason: 'سبب اصطناعي',
    });
  });
  it('Information Card submit/correction/resubmit/verify are audited without draft or document contents', async () => {
    const service = await import('../src/server/informationCardService');
    await db.user.update({
      where: { id: 'T' },
      data: { birthDate: new Date('1990-01-01'), phone: '0000000000' },
    });
    const original = await service.readCard({ id: 'T', role: 'teacher' }, 'T');
    const card = await service.saveCard({ id: 'T', role: 'teacher' }, 'T', {
      revision: original.revision,
      identity: {
        firstName: 'T',
        lastName: 'Synthetic',
        birthDate: '1990-01-01',
        phone: '0000000000',
      },
      extra: {
        cadre: 'أستاذ',
        administrativeStatus: 'مرسم(ة)',
        qualifications: [{ certificate: 'شهادة', issuer: 'جامعة', date: '2000-01-01' }],
      },
    });
    const submitted = await service.submitCard({ id: 'T', role: 'teacher' }, 'T', card.revision);
    await service.reviewCard(
      { id: 'A', role: 'inspector' },
      'T',
      submitted.submission!.id,
      'NEEDS_CORRECTION',
      'سبب اصطناعي'
    );
    const corrected = await service.readCard({ id: 'T', role: 'teacher' }, 'T');
    const newDraft = await service.saveCard({ id: 'T', role: 'teacher' }, 'T', {
      revision: corrected.revision,
      identity: {
        firstName: 'T',
        lastName: 'Synthetic',
        birthDate: '1990-01-01',
        phone: '0000000000',
      },
      extra: corrected.current.extra,
    });
    const resubmitted = await service.submitCard(
      { id: 'T', role: 'teacher' },
      'T',
      newDraft.revision
    );
    await service.reviewCard(
      { id: 'A', role: 'inspector' },
      'T',
      resubmitted.submission!.id,
      'VERIFIED'
    );
    expect((await events(submitted.submission!.id)).map((e) => e.eventType)).toEqual([
      'INFORMATION_CARD_SUBMITTED',
      'INFORMATION_CARD_CORRECTION_REQUESTED',
    ]);
    expect((await events(resubmitted.submission!.id)).map((e) => e.eventType)).toEqual([
      'INFORMATION_CARD_RESUBMITTED',
      'INFORMATION_CARD_VERIFIED',
    ]);
    expect(JSON.stringify(await events(resubmitted.submission!.id))).not.toContain(
      'qualifications'
    );
  });
  it('Visit lifecycle/explicit tenure communication is recorded; read operations create no events', async () => {
    const service = await import('../src/server/pedagogicalVisitService');
    const actor = { id: 'A', role: 'inspector' };
    const visit = await service.scheduleVisit(actor, {
      teacherId: 'T',
      visitType: 'TENURE',
      academicYearId: '2098-2099',
      scheduledAt: '2098-10-08T09:00:00+01:00',
    });
    let row = await service.actOnVisit(actor, visit.id, { revision: 0, action: 'COMMUNICATE' });
    row = await service.actOnVisit(actor, visit.id, {
      revision: row.revision,
      action: 'POSTPONE',
      reason: 'سبب',
    });
    row = await service.actOnVisit(actor, visit.id, {
      revision: row.revision,
      action: 'RESCHEDULE',
      scheduledAt: '2098-10-09T09:00:00+01:00',
    });
    await service.actOnVisit(actor, visit.id, {
      revision: row.revision,
      action: 'CANCEL',
      reason: 'سبب',
    });
    expect((await events(visit.id)).map((e) => e.eventType)).toEqual([
      'PEDAGOGICAL_VISIT_SCHEDULED',
      'TENURE_VISIT_COMMUNICATED',
      'PEDAGOGICAL_VISIT_POSTPONED',
      'PEDAGOGICAL_VISIT_RESCHEDULED',
      'PEDAGOGICAL_VISIT_CANCELLED',
    ]);
    const before = await db.auditEvent.count();
    await service.listTeacherAppointments({ id: 'T', role: 'teacher' });
    await request('A', view());
    await request('admin', '/admin/audit-events');
    expect(await db.auditEvent.count()).toBe(before);
  });
  it('report final/share/acknowledgement are atomic and retries generate exactly one event per action without content snapshots', async () => {
    const { service, saved } = await report();
    const actor = { id: 'A', role: 'inspector' };
    const final = await service.finalizeVisitReport(actor, saved.id, { revision: saved.revision });
    const snapshot = JSON.stringify(final.finalSnapshot);
    await Promise.all([
      service.shareVisitReportWithTeacher(actor, saved.id),
      service.shareVisitReportWithTeacher(actor, saved.id),
    ]);
    await Promise.all([
      service.acknowledgeTeacherVisitReport({ id: 'T', role: 'teacher' }, saved.id),
      service.acknowledgeTeacherVisitReport({ id: 'T', role: 'teacher' }, saved.id),
    ]);
    expect((await events(saved.id)).map((e) => e.eventType)).toEqual([
      'VISIT_REPORT_FINALIZED',
      'VISIT_REPORT_SHARED',
      'VISIT_REPORT_ACKNOWLEDGED',
    ]);
    const text = JSON.stringify(await events(saved.id));
    expect(text).not.toContain('finalSnapshot');
    expect(text).not.toContain('نص اصطناعي');
    expect(
      JSON.stringify(
        (await db.visitReport.findUniqueOrThrow({ where: { id: saved.id } })).finalSnapshot
      )
    ).toBe(snapshot);
    const count = await db.auditEvent.count();
    await service.readTeacherSharedVisitReport({ id: 'T', role: 'teacher' }, saved.id);
    expect(await db.auditEvent.count()).toBe(count);
  });
  it('forced Audit INSERT failure rolls back activation and transfer instead of silently losing the audit', async () => {
    const before = await db.user.findUniqueOrThrow({ where: { id: 'U' } });
    await forceFailure('ACCOUNT_DISABLED', async () => {
      expect(
        (await request('admin', '/admin/users/U/lifecycle', 'POST', { action: 'deactivate' }))
          .status
      ).toBe(500);
    });
    expect(await db.user.findUniqueOrThrow({ where: { id: 'U' } })).toEqual(before);
    await forceFailure('TEACHER_TRANSFER_REQUESTED', async () => {
      await expect(
        transfer.requestTeacherTransfer({
          teacherId: 'T',
          destinationInspectorId: 'B',
          requestedById: 'T',
        })
      ).rejects.toThrow();
    });
    expect(await db.inspectorAssignmentTransfer.count()).toBe(0);
  });
  it('forced audit failure rolls back scheduled Visit and report share including notification', async () => {
    const service = await import('../src/server/pedagogicalVisitService');
    await forceFailure('PEDAGOGICAL_VISIT_SCHEDULED', async () => {
      await expect(
        service.scheduleVisit(
          { id: 'A', role: 'inspector' },
          {
            teacherId: 'T',
            visitType: 'GUIDANCE',
            academicYearId: '2098-2099',
            scheduledAt: '2098-10-08T09:00:00+01:00',
          }
        )
      ).rejects.toThrow();
    });
    expect(await db.inspectionVisitRecord.count()).toBe(0);
    const { service: reports, saved } = await report();
    await reports.finalizeVisitReport({ id: 'A', role: 'inspector' }, saved.id, {
      revision: saved.revision,
    });
    await forceFailure('VISIT_REPORT_SHARED', async () => {
      await expect(
        reports.shareVisitReportWithTeacher({ id: 'A', role: 'inspector' }, saved.id)
      ).rejects.toThrow();
    });
    expect(
      (await db.visitReport.findUniqueOrThrow({ where: { id: saved.id } })).sharedWithTeacherAt
    ).toBeNull();
    expect(await db.communityNotification.count()).toBe(0);
  });
  it('SQL UPDATE/DELETE/TRUNCATE are blocked and account deletion preserves historical events', async () => {
    await request('admin', '/admin/users/U/lifecycle', 'POST', { action: 'deactivate' });
    const row = await db.auditEvent.findFirstOrThrow({ where: { entityId: 'U' } });
    await expect(
      db.auditEvent.update({ where: { id: row.id }, data: { actorName: 'fake' } })
    ).rejects.toThrow('append-only');
    await expect(db.auditEvent.delete({ where: { id: row.id } })).rejects.toThrow('append-only');
    await expect(db.$executeRawUnsafe('TRUNCATE "AuditEvent"')).rejects.toThrow('append-only');
    await forceFailure('ACCOUNT_ARCHIVED', async () => {
      expect((await request('admin', '/db/users/U', 'DELETE')).status).toBe(500);
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: 'U' } })).status).toBe('inactive');
    expect((await request('admin','/db/users/U','DELETE')).status).toBe(200);
    expect(await db.auditEvent.findUnique({ where: { id: row.id } })).toEqual(row);
    expect((await db.user.findUniqueOrThrow({ where: { id: 'U' } })).status).toBe('archived');
    expect((await events('U')).some(event=>event.eventType==='ACCOUNT_ARCHIVED')).toBe(true);
  });
  it('explicit initial assignment, acceptance, rejection and removal use the trusted actor and current transaction', async()=>{
    await db.inspectorAssignment.deleteMany();
    const result=await request('admin','/admin/assignments','POST',{teacherId:'T',inspectorId:'A'});expect(result.status).toBe(200);
    const id=result.data.assignment.id; const service=await import('../src/server/assignmentService');
    await service.acceptAssignment('T','A');
    await service.removeAssignment('T','admin');
    expect((await events(id)).map(e=>e.eventType)).toEqual(['TEACHER_ASSIGNMENT_REQUESTED','TEACHER_ASSIGNMENT_ACCEPTED','TEACHER_ASSIGNMENT_REMOVED']);
    expect((await events(id)).map(e=>e.actorUserId)).toEqual(['admin','A','admin']);
    const pending=await transfer.createInitialAssignmentRequest('T','A','admin');await service.rejectAssignment('T','A','سبب');
    expect((await events(pending.id)).at(-1)?.eventType).toBe('TEACHER_ASSIGNMENT_REJECTED');
  });
  it('manual bulk recalculation shares one transaction and an Audit failure rolls back every changed head',async()=>{
    await db.inspectorAssignment.deleteMany();
    await forceFailure('TEACHER_ASSIGNMENT_REQUESTED',async()=>{expect((await request('admin','/admin/assignments/reassign-all','POST',{confirm:true})).status).toBe(500);});
    expect(await db.inspectorAssignment.count()).toBe(0);
    expect((await request('admin','/admin/assignments/reassign-all','POST',{confirm:true})).status).toBe(200);
    const heads=await db.inspectorAssignment.findMany();expect(heads).toHaveLength(2);
    for(const head of heads)expect((await events(head.id))[0]).toMatchObject({eventType:'TEACHER_ASSIGNMENT_REQUESTED',actorUserId:'admin'});
  });
  it('forced report finalization and acknowledgement audit failures roll back their mandatory mutations',async()=>{
    const {service,saved}=await report();const actor={id:'A',role:'inspector'};
    await forceFailure('VISIT_REPORT_FINALIZED',async()=>{await expect(service.finalizeVisitReport(actor,saved.id,{revision:saved.revision})).rejects.toThrow();});
    expect(await db.visitReport.findUniqueOrThrow({where:{id:saved.id}})).toMatchObject({status:'DRAFT',finalSnapshot:null,revision:saved.revision});
    await service.finalizeVisitReport(actor,saved.id,{revision:saved.revision});await service.shareVisitReportWithTeacher(actor,saved.id);
    await forceFailure('VISIT_REPORT_ACKNOWLEDGED',async()=>{await expect(service.acknowledgeTeacherVisitReport({id:'T',role:'teacher'},saved.id)).rejects.toThrow();});
    expect((await db.visitReport.findUniqueOrThrow({where:{id:saved.id}})).teacherAcknowledgedAt).toBeNull();expect((await events(saved.id)).map(e=>e.eventType)).toEqual(['VISIT_REPORT_FINALIZED','VISIT_REPORT_SHARED']);
  });
  it('forced Information Card audit failure rolls back submission creation and review state',async()=>{
    const service=await import('../src/server/informationCardService');
    const card=await service.saveCard({id:'T',role:'teacher'},'T',{revision:0,identity:{firstName:'T',lastName:'Synthetic',birthDate:'1990-01-01',phone:''},extra:{cadre:'أستاذ',administrativeStatus:'مرسم(ة)',qualifications:[]}});
    await forceFailure('INFORMATION_CARD_SUBMITTED',async()=>{await expect(service.submitCard({id:'T',role:'teacher'},'T',card.revision)).rejects.toThrow();});
    expect(await db.teacherInformationCardSubmission.count()).toBe(0);expect((await db.teacherInformationCard.findUniqueOrThrow({where:{teacherId:'T'}})).status).toBe('DRAFT');
    const submitted=await service.submitCard({id:'T',role:'teacher'},'T',card.revision);
    await forceFailure('INFORMATION_CARD_VERIFIED',async()=>{await expect(service.reviewCard({id:'A',role:'inspector'},'T',submitted.submission!.id,'VERIFIED')).rejects.toThrow();});
    expect((await db.teacherInformationCard.findUniqueOrThrow({where:{teacherId:'T'}})).status).toBe('SUBMITTED');expect((await db.teacherInformationCardSubmission.findUniqueOrThrow({where:{id:submitted.submission!.id}})).status).toBe('SUBMITTED');
  });
});
