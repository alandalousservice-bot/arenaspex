import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const gateUrl = process.env.ARENASPEX_POSTGRES_GATE_URL;
const gateRoot = process.env.ARENASPEX_POSTGRES_GATE_ROOT;
const reportBaseMigration = '20261007160000_visit_report_guidance_tenure';
const migrationName = '20261007190000_visit_report_teacher_sharing';
let db: PrismaClient;
let server: Server;
let httpUrl: string;
let signSession: typeof import('../src/server/auth').signSession;
let transfer: typeof import('../src/server/assignmentTransferService');
const evidence: Record<string, unknown> = {};
vi.mock('../src/services/studentRosterPdfImport.service.js', () => ({
  parseStudentRosterPdf: () => {
    throw new Error('PDF outside report gate');
  },
  StudentRosterPdfImportError: class extends Error {},
}));
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function cli(args: string[]) {
  return execFileSync(
    process.execPath,
    [path.resolve('node_modules/prisma/build/index.js'), ...args],
    {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, DATABASE_URL: gateUrl!, DIRECT_DATABASE_URL: gateUrl! },
    }
  );
}
async function request(actor: string, endpoint: string, body?: unknown) {
  const role = (await db.user.findUniqueOrThrow({ where: { id: actor } })).role;
  const r = await fetch(httpUrl + '/api' + endpoint, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `spex_session=${signSession({ userId: actor, role })}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
const guide = {
  domain: 'الحركات القاعدية',
  objective: 'هدف اصطناعي',
  conclusion: 'خلاصة اصطناعية',
  generalAssessment: 'تقدير اصطناعي',
  ground: 'أرضية',
  safety: 'سلامة',
  layout: 'تخطيط',
  location: 'موقع',
  teachingUnitExists: 'موجودة',
  teachingUnitValue: 'قيمة',
  learningUnitExists: 'موجودة',
  learningUnitValue: 'عملية',
  annualDistribution: 'ملاحظات التوزيع',
  officialProgramme: 'ملاحظات البرنامج',
  progression: 'تدرج',
  groupOrganization: 'أفواج',
  sportsAttire: 'بدلة',
  spaceMaterials: 'مساحة',
  applicationExists: 'موجود',
  applicationSuitability: 'ملائم',
  explanation: 'شرح',
  correction: 'تصحيح',
  discipline: 'انضباط',
  participation: 'مشاركة',
  pupilParticipation: 'مشاركة التلاميذ',
  teachingAids: 'وسائل',
  dailyNotebook: 'دفتر',
  attendanceMonitored: 'مراقبة',
  attendanceRecorded: 'مسجلة',
  guidanceIntroduction: 'إرشاد',
  pedagogicalGuidance: 'توجيه',
  practicalGuidance: 'ميداني',
  markWords: '',
};
const lesson = {
  level: '3',
  className: '3A',
  domain: 'الحركات القاعدية',
  objective: 'هدف اصطناعي',
};
const tenure = {
  practicalLessons: [lesson],
  directorName: 'مدير اصطناعي',
  directorSchool: 'مدرسة اصطناعية',
  teacherMemberName: 'عضو اصطناعي',
  teacherMemberSchool: 'مدرسة أخرى',
  oralExamination: 'التربية وعلم النفس والتشريع المدرسي',
  culturalValue: 'ثقافة',
  pedagogicalValue: 'تربية',
  observations: 'ملاحظات وتوجيهات',
  finalAssessment: 'تقدير نهائي',
  decision: 'POSTPONE',
  educationDirectorDecision: 'قرار مستقل',
};
async function visit(
  type: 'GUIDANCE' | 'TENURE' | 'MONITORING' = 'GUIDANCE',
  status: 'COMPLETED' | 'SCHEDULED' | 'POSTPONED' | 'CANCELLED' = 'COMPLETED'
) {
  const at = new Date(Date.now() - 60000);
  return db.inspectionVisitRecord.create({
    data: {
      id: `visit_${randomUUID()}`,
      inspectorId: 'A',
      teacherId: 'T',
      data: { pedagogicalGrade: null, officialReportGenerated: false },
      visitType: type,
      status,
      academicYearId: '2026-2027',
      classId: 'class',
      scheduledAt: at,
      completedAt: status === 'COMPLETED' ? at : null,
      history:
        status === 'COMPLETED' ? [{ action: 'COMPLETE', actorId: 'A', at: at.toISOString() }] : [],
    },
  });
}
async function create(type: 'GUIDANCE' | 'TENURE' = 'GUIDANCE') {
  const v = await visit(type);
  const result = await request('A', `/pedagogical-visits/${v.id}/report`, {});
  expect(result.status).toBe(201);
  return { v, report: result.data.report };
}
async function save(
  report: { id: string; revision: number },
  content: unknown,
  mark: number | null = null,
  actor = 'A'
) {
  return request(actor, `/visit-reports/${report.id}/save`, {
    revision: report.revision,
    content,
    mark,
  });
}
async function finalize(report: { id: string; revision: number }, actor = 'A') {
  return request(actor, `/visit-reports/${report.id}/finalize`, { revision: report.revision });
}
async function share(report: { id: string }, actor = 'A') {
  return request(actor, `/visit-reports/${report.id}/share`, {});
}
async function acknowledge(report: { id: string }, actor = 'T') {
  return request(actor, `/teacher/visit-reports/${report.id}/acknowledge`, {});
}
describe.skipIf(!gateUrl)('VisitReport real isolated PostgreSQL gate', () => {
  beforeAll(async () => {
    const target = new URL(gateUrl!);
    if (
      target.hostname !== '127.0.0.1' ||
      target.port !== '55482' ||
      target.pathname !== '/arenaspex_po_ins_02_disposable' ||
      target.searchParams.get('schema') !== 'public' ||
      !gateRoot ||
      !path
        .resolve(gateRoot)
        .startsWith(path.resolve('node_modules/.cache/arenaspex-postgres-gate-'))
    )
      throw new Error('STOP: no proven disposable database');
    process.env.DATABASE_URL = gateUrl!;
    process.env.DIRECT_DATABASE_URL = gateUrl!;
    db = new PrismaClient({ datasources: { db: { url: gateUrl! } } });
    const [identity] = await db.$queryRaw<
      { directory: string; database: string; host: string; port: number }[]
    >`SELECT current_setting('data_directory') AS directory,current_database() AS database,host(inet_server_addr()) AS host,inet_server_port() AS port`;
    expect(identity).toMatchObject({
      host: '127.0.0.1',
      port: 55482,
      database: 'arenaspex_po_ins_02_disposable',
    });
    expect(path.resolve(identity.directory).toLowerCase()).toBe(
      path.resolve(gateRoot, 'data').toLowerCase()
    );
    expect(await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`).toEqual(
      []
    );
    evidence.isolation = identity;
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const pre = schema
      .replace(/^model VisitReport \{[\s\S]*?^\}/m, '')
      .replace(/^enum VisitReport(?:Type|Status) \{[\s\S]*?^\}/gm, '')
      .replace(/^ {2}report\s+VisitReport\?\s*$/m, '')
      .replace(/^\s+reports(?:Shared|Acknowledged)\s+VisitReport\[\].*\r?\n/gm, '');
    const scratch = path.join(gateRoot, 'prisma');
    const schemaFile = path.join(scratch, 'schema.prisma');
    const baseline = path.join(scratch, 'migrations/00000000000000_gate_pre_report');
    mkdirSync(baseline, { recursive: true });
    writeFileSync(schemaFile, pre);
    writeFileSync(
      path.join(scratch, 'migrations/migration_lock.toml'),
      'provider = "postgresql"\n'
    );
    cli([
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      schemaFile,
      '--script',
      '--output',
      path.join(baseline, 'migration.sql'),
    ]);
    cli(['migrate', 'deploy', '--schema', schemaFile]);
    await db.user.create({
      data: {
        id: 'preserved',
        username: 'preserved',
        spexId: 'preserved',
        firstName: 'Synthetic',
        lastName: 'Preserved',
        email: 'preserved@example.test',
        passwordHash: 'synthetic',
        role: 'teacher',
        districtId: '',
        directorateId: '',
      },
    });
    await db.inspectionVisitRecord.create({
      data: {
        id: 'legacy',
        inspectorId: 'legacy-author',
        teacherId: 'preserved',
        data: {
          pedagogicalGrade: 16.5,
          officialReportGenerated: true,
          visitType: 'legacy-evaluation',
        },
      },
    });
    await db.inspectionVisitRecord.create({
      data: {
        id: 'completed',
        inspectorId: 'legacy-author',
        teacherId: 'preserved',
        visitType: 'GUIDANCE',
        status: 'COMPLETED',
        scheduledAt: new Date(),
        completedAt: new Date(),
        data: { pedagogicalGrade: null, officialReportGenerated: false },
        history: [{ action: 'COMPLETE', actorId: 'legacy-author' }],
      },
    });
    await db.communityNotification.create({
      data: { id: 'preserved-notification', userId: 'preserved', data: { synthetic: true } },
    });
    const tables = await db.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename!='_prisma_migrations' ORDER BY tablename`;
    const before: Record<string, string> = {};
    for (const { tablename } of tables)
      before[tablename] = digest(
        await db.$queryRawUnsafe(`SELECT * FROM "${tablename}" ORDER BY 1`)
      );
    for (const migration of [reportBaseMigration, migrationName]) {
      const targetMigration = path.join(scratch, 'migrations', migration);
      mkdirSync(targetMigration);
      copyFileSync(
        `prisma/migrations/${migration}/migration.sql`,
        path.join(targetMigration, 'migration.sql')
      );
    }
    writeFileSync(schemaFile, schema);
    evidence.migration = cli(['migrate', 'deploy', '--schema', schemaFile]);
    for (const { tablename } of tables)
      expect(digest(await db.$queryRawUnsafe(`SELECT * FROM "${tablename}" ORDER BY 1`))).toBe(
        before[tablename]
      );
    expect(await db.visitReport.count()).toBe(0);
    const migrationConstraints = await db.$queryRaw<
      { conname: string }[]
    >`SELECT conname FROM pg_constraint WHERE conrelid='"VisitReport"'::regclass ORDER BY conname`;
    expect(migrationConstraints.map((item) => item.conname)).toEqual(
      expect.arrayContaining([
        'VisitReport_sharedWithTeacherById_fkey',
        'VisitReport_teacherAcknowledgedById_fkey',
        'VisitReport_share_metadata_check',
        'VisitReport_acknowledgement_metadata_check',
        'VisitReport_acknowledgement_requires_share_check',
      ])
    );
    const migrationIndexes = await db.$queryRaw<
      { indexname: string }[]
    >`SELECT indexname FROM pg_indexes WHERE tablename='VisitReport'`;
    expect(migrationIndexes.map((item) => item.indexname)).toContain(
      'VisitReport_sharedWithTeacherAt_idx'
    );
    evidence.shareMigrationConstraints = 'PASS';
    evidence.preexistingFingerprints = before;
    evidence.legacyPreserved = true;
    evidence.schemaDiff = cli([
      'migrate',
      'diff',
      '--from-url',
      gateUrl!,
      '--to-schema-datamodel',
      path.resolve('prisma/schema.prisma'),
      '--exit-code',
    ]);
    evidence.migrationSHA256 = createHash('sha256')
      .update(readFileSync(`prisma/migrations/${migrationName}/migration.sql`))
      .digest('hex');
    await db.$disconnect();
    ({ prisma: db } = await import('../src/server/prismaClient'));
    const { apiRouter } = await import('../src/server/apiRouter');
    const { assignmentRouter } = await import('../src/server/assignmentRouter');
    const { requireAuth, requireOperationalAccount } =
      await import('../src/server/middleware/requireAuth');
    ({ signSession } = await import('../src/server/auth'));
    transfer = await import('../src/server/assignmentTransferService');
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api', apiRouter);
    app.use('/api', requireAuth, requireOperationalAccount, assignmentRouter);
    app.use((e: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      res.status(500).json({ error: e.message })
    );
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Not loopback');
    httpUrl = `http://127.0.0.1:${address.port}`;
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
      ['admin', 'admin', ''],
    ] as const)
      await db.user.create({
        data: {
          id,
          username: id,
          spexId: id,
          firstName: id,
          lastName: 'Synthetic',
          email: `${id}@example.test`,
          passwordHash: 'synthetic',
          role,
          status: 'active',
          directorateId: suffix ? `dir-${suffix}` : '',
          districtId: suffix ? `district-${suffix}` : '',
          eduDirectorateId: suffix ? `dir-${suffix}` : null,
          eduDistrictId: suffix ? `district-${suffix}` : null,
          schoolName: 'Synthetic school',
          isApprovedByAdmin: true,
          accessExpiresAt: new Date('2099-07-31'),
        },
      });
    await db.inspectorAssignment.create({
      data: { teacherId: 'T', inspectorId: 'A', status: 'Active' },
    });
    await db.inspectorAssignment.create({
      data: { teacherId: 'T2', inspectorId: 'B', status: 'Active' },
    });
    await db.studentClass.create({
      data: { id: 'class', teacherId: 'T', name: '3A', levelId: '3' },
    });
    await db.teacherInformationCard.create({
      data: {
        teacherId: 'T',
        extra: {
          qualifications: [
            { certificate: 'Synthetic qualification', issuer: 'Synthetic', date: '2000-01-01' },
          ],
          birthPlace: 'Original place',
          cadre: 'أستاذ التربية البدنية والرياضية',
          probationDate: '2025-09-01',
        },
      },
    });
  });
  afterAll(async () => {
    vi.useRealTimers();
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (db) await db.$disconnect();
    if (gateRoot)
      writeFileSync(
        path.join(gateRoot, 'visit-report-evidence.json'),
        JSON.stringify(evidence, null, 2)
      );
  });
  it.each(['SCHEDULED', 'POSTPONED', 'CANCELLED'] as const)(
    'rejects report creation for %s',
    async (status) => {
      const v = await visit('GUIDANCE', status);
      expect((await request('A', `/pedagogical-visits/${v.id}/report`, {})).status).toBe(409);
      expect(await db.visitReport.count()).toBe(0);
    }
  );
  it('explicit completed creation starts DRAFT, rejects orphan, forged type/actor and duplicates; FK and uniqueness protect DB', async () => {
    const { v, report } = await create();
    expect(report).toMatchObject({
      status: 'DRAFT',
      reportType: 'GUIDANCE',
      mark: null,
      authorId: 'A',
      finalSnapshot: null,
    });
    expect((await request('A', `/pedagogical-visits/${v.id}/report`, {})).status).toBe(409);
    expect((await request('A', '/pedagogical-visits/missing/report', {})).status).toBe(404);
    for (const body of [
      { reportType: 'TENURE' },
      { teacherId: 'T2' },
      { authorId: 'B' },
      { mark: 16 },
    ])
      expect((await request('A', `/pedagogical-visits/${v.id}/report`, body)).status).toBe(400);
    await expect(
      db.visitReport.create({ data: { visitId: 'missing', reportType: 'GUIDANCE', authorId: 'A' } })
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      db.visitReport.create({ data: { visitId: v.id, reportType: 'GUIDANCE', authorId: 'A' } })
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(db.inspectionVisitRecord.delete({ where: { id: v.id } })).rejects.toThrow(
      'VisitReport_visitId_fkey'
    );
    expect(await db.inspectionVisitRecord.findUnique({ where: { id: v.id } })).not.toBeNull();
    evidence.foreignKeyAndUnique = 'PASS';
  });
  it.each(['B', 'T', 'admin'])(
    '%s cannot create, read, edit or finalize another Inspector report',
    async (actor) => {
      const v = await visit();
      expect((await request(actor, `/pedagogical-visits/${v.id}/report`, {})).status).toBe(403);
      const r = (await request('A', `/pedagogical-visits/${v.id}/report`, {})).data.report;
      expect((await request(actor, `/pedagogical-visits/${v.id}/report`)).status).toBe(403);
      expect((await save(r, guide, 0, actor)).status).toBe(403);
      expect((await finalize(r, actor)).status).toBe(403);
    }
  );
  it('real Visit completion creates no report, notification or mark; explicit report creation is independent', async () => {
    const v = await visit('GUIDANCE', 'SCHEDULED');
    const result = await request('A', `/pedagogical-visits/${v.id}/actions`, {
      revision: 0,
      action: 'COMPLETE',
    });
    expect(result.status).toBe(200);
    expect(await db.visitReport.count()).toBe(0);
    expect(await db.communityNotification.count()).toBe(0);
    expect(
      (await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).data
    ).toEqual({ pedagogicalGrade: null, officialReportGenerated: false });
    expect((await request('A', `/pedagogical-visits/${v.id}/report`, {})).status).toBe(201);
  });
  it('Guidance fields persist, incomplete save/view remains DRAFT, missing mark null and explicit zero survives finalization', async () => {
    const { v, report } = await create();
    let r = await save(report, { domain: 'الميدان' });
    expect(r.status).toBe(200);
    expect(r.data.report).toMatchObject({ status: 'DRAFT', mark: null });
    expect((await finalize(r.data.report)).status).toBe(400);
    expect((await request('A', `/pedagogical-visits/${v.id}/report`)).data.report.status).toBe(
      'DRAFT'
    );
    r = await save(r.data.report, guide, 0);
    expect(r.data.report.content).toEqual(guide);
    const final = await finalize(r.data.report);
    expect(final.status).toBe(200);
    expect(final.data.report).toMatchObject({ status: 'FINAL', mark: 0, finalizedById: 'A' });
    expect(final.data.report.finalizedAt).toBeTruthy();
    expect((await save(final.data.report, guide, 19)).status).toBe(409);
    expect((await finalize(final.data.report)).status).toBe(409);
  });
  it.each([1, 2])(
    'Tenure saves and finalizes %i PE lessons, oral/committee/assessments and one final mark',
    async (count) => {
      const { report } = await create('TENURE');
      const content = { ...tenure, practicalLessons: Array.from({ length: count }, () => lesson) };
      const saved = await save(report, content, 20);
      expect(saved.status).toBe(200);
      expect(saved.data.report.content).toEqual(content);
      const final = await finalize(saved.data.report);
      expect(final.status).toBe(200);
      expect(final.data.report.finalSnapshot).toMatchObject({ content, mark: 20 });
      expect(final.data.report.finalSnapshot.legalText).toContain('09/11/1991');
    }
  );
  it('Tenure permits incomplete draft, rejects zero/>2 lessons at finalization and scoring fields, no default or calculation', async () => {
    const { report } = await create('TENURE');
    expect(report.mark).toBeNull();
    let saved = await save(report, { ...tenure, practicalLessons: [] }, 12);
    expect(saved.status).toBe(200);
    expect((await finalize(saved.data.report)).status).toBe(400);
    expect(
      (await save(saved.data.report, { ...tenure, practicalLessons: [lesson, lesson, lesson] }, 12))
        .status
    ).toBe(400);
    for (const content of [
      { ...tenure, oralMark: 10 },
      { ...tenure, practicalTotal: 40 },
      { ...tenure, practicalLessons: [{ ...lesson, score: 16 }] },
    ])
      expect((await save(saved.data.report, content, 12)).status).toBe(400);
    saved = await save(saved.data.report, tenure, null);
    expect(saved.data.report.mark).toBeNull();
    expect((await finalize(saved.data.report)).status).toBe(400);
    expect(saved.data.report.content).not.toHaveProperty('calculatedMark');
  });
  it.each([0, 20, -0.1, 20.1])(
    'final mark %s obeys explicit /20 range including zero',
    async (mark) => {
      const { report } = await create('TENURE');
      const result = await save(report, tenure, mark);
      expect(result.status).toBe(mark < 0 || mark > 20 ? 400 : 200);
      if (result.status === 200) {
        expect(result.data.report.mark).toBe(mark);
        expect((await finalize(result.data.report)).status).toBe(200);
      }
    }
  );
  it.each(['ACCEPT', 'POSTPONE', 'REJECT'])(
    'committee %s persists explicitly independent of zero mark',
    async (decision) => {
      const { report } = await create('TENURE');
      const result = await save(report, { ...tenure, decision }, 0);
      expect(result.data.report.content.decision).toBe(decision);
      expect((await finalize(result.data.report)).data.report.finalSnapshot.content.decision).toBe(
        decision
      );
    }
  );
  it.each(['GUIDANCE', 'TENURE'] as const)(
    '%s snapshot stays stable after identity/card/school/class/geography edits; Teacher remains unable to read reports',
    async (type) => {
      const { v, report } = await create(type);
      const saved = await save(report, type === 'GUIDANCE' ? guide : tenure, 14.5);
      const final = await finalize(saved.data.report);
      expect(final.status).toBe(200);
      const frozen = final.data.report.finalSnapshot;
      await db.user.update({
        where: { id: 'T' },
        data: { firstName: 'CHANGED', schoolName: 'CHANGED SCHOOL', phone: 'CHANGED PHONE' },
      });
      await db.teacherInformationCard.update({
        where: { teacherId: 'T' },
        data: { extra: { birthPlace: 'CHANGED PLACE', qualifications: [] } },
      });
      await db.studentClass.update({ where: { id: 'class' }, data: { name: 'CHANGED CLASS' } });
      await db.directorate.update({
        where: { id: 'dir-a' },
        data: { name: 'CHANGED DIRECTORATE' },
      });
      const read = await request('A', `/pedagogical-visits/${v.id}/report`);
      expect(read.data.report.finalSnapshot).toEqual(frozen);
      expect(read.data.context).toEqual(frozen.context);
      expect((await request('T', `/pedagogical-visits/${v.id}/report`)).status).toBe(403);
      expect((await request('T', '/teacher/inspection-feed')).data.visits).toEqual([]);
      expect(await db.communityNotification.count()).toBe(0);
      expect(
        (await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).data
      ).toEqual({ pedagogicalGrade: null, officialReportGenerated: false });
    }
  );
  it('Draft context reuses current identity without storing a snapshot or changing card/timetable', async () => {
    const { v, report } = await create();
    expect(report.finalSnapshot).toBeNull();
    const cardBefore = await db.teacherInformationCard.findUniqueOrThrow({
      where: { teacherId: 'T' },
    });
    await db.user.update({ where: { id: 'T' }, data: { firstName: 'CURRENT' } });
    expect(
      (await request('A', `/pedagogical-visits/${v.id}/report`)).data.context.teacher.name
    ).toContain('CURRENT');
    expect(
      await db.teacherInformationCard.findUniqueOrThrow({ where: { teacherId: 'T' } })
    ).toEqual(cardBefore);
    expect(await db.teacherWeeklySlot.count()).toBe(0);
  });
  it('Monitoring completion/history remain valid but no official generic report exists', async () => {
    const v = await visit('MONITORING');
    expect((await request('A', `/pedagogical-visits/${v.id}/report`, {})).status).toBe(409);
    const read = await request('A', `/pedagogical-visits/${v.id}/report`);
    expect(read.data).toMatchObject({ unsupported: true, report: null, canCreate: false });
    expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).status).toBe(
      'COMPLETED'
    );
  });
  it('completion actor owns report without rewriting original Visit creator', async () => {
    const v = await visit();
    await db.inspectionVisitRecord.update({ where: { id: v.id }, data: { inspectorId: 'B' } });
    const created = await request('A', `/pedagogical-visits/${v.id}/report`, {});
    expect(created.status).toBe(201);
    expect(created.data.report.authorId).toBe('A');
    expect(
      (await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).inspectorId
    ).toBe('B');
  });
  it('keeps a final report private until explicit share, then only its Teacher can read the frozen snapshot and acknowledge', async () => {
    const { v, report } = await create();
    const saved = (await save(report, guide, 0)).data.report;
    const final = (await finalize(saved)).data.report;
    const snapshot = final.finalSnapshot;
    expect((await request('T', '/teacher/visit-reports')).data.reports).toEqual([]);
    expect((await request('T', `/teacher/visit-reports/${report.id}`)).status).toBe(404);
    expect((await acknowledge(report, 'T')).status).toBe(404);
    expect((await request('T2', '/teacher/visit-reports')).data.reports).toEqual([]);
    expect((await share(report, 'T')).status).toBe(403);
    expect((await share(report, 'admin')).status).toBe(403);
    expect((await share(report, 'B')).status).toBe(403);
    expect((await share(report)).status).toBe(200);
    const notification = await request('T', '/communication/notifications');
    expect(notification.data.notifications).toContainEqual(
      expect.objectContaining({
        id: `visit_report_shared_${report.id}`,
        type: 'visit_report_shared',
        data: expect.objectContaining({ reportId: report.id, visitId: v.id }),
      })
    );
    const list = await request('T', '/teacher/visit-reports');
    expect(list.data.reports).toHaveLength(1);
    expect(list.data.reports[0].report.finalSnapshot).toEqual(snapshot);
    expect(list.data.reports[0].report.mark).toBe(0);
    expect(list.data.reports[0].report.sharedWithTeacherById).toBe('A');
    expect(list.data.reports[0].report.teacherAcknowledgedAt).toBeNull();
    const opened = await request('T', `/teacher/visit-reports/${report.id}`);
    expect(opened.status).toBe(200);
    expect(opened.data.report.finalSnapshot).toEqual(snapshot);
    expect(
      (await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).teacherAcknowledgedAt
    ).toBeNull();
    expect((await request('T2', `/teacher/visit-reports/${report.id}`)).status).toBe(404);
    expect((await request('A', `/teacher/visit-reports/${report.id}`)).status).toBe(403);
    expect((await save(final, guide, 15, 'T')).status).toBe(403);
    expect((await finalize(final, 'T')).status).toBe(403);
    expect((await share(report, 'T')).status).toBe(403);
    expect((await acknowledge(report, 'T2')).status).toBe(404);
    expect((await acknowledge(report, 'A')).status).toBe(403);
    const confirmed = await acknowledge(report);
    expect(confirmed.status).toBe(200);
    expect(confirmed.data.report.teacherAcknowledgedById).toBe('T');
    const ackAt = confirmed.data.report.teacherAcknowledgedAt;
    expect(ackAt).toBeTruthy();
    expect((await acknowledge(report)).data.report.teacherAcknowledgedAt).toBe(ackAt);
    expect(
      (await request('T', `/teacher/visit-reports/${report.id}`)).data.report.finalSnapshot
    ).toEqual(snapshot);
    expect(
      await db.communityNotification.count({ where: { id: `visit_report_shared_${report.id}` } })
    ).toBe(1);
    expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).status).toBe(
      'COMPLETED'
    );
  });
  it('does not share DRAFT reports and rolls back sharing if notification persistence fails', async () => {
    const { report } = await create();
    expect((await share(report)).status).toBe(409);
    expect(
      (await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).sharedWithTeacherAt
    ).toBeNull();
    const final = (await finalize((await save(report, guide, null)).data.report)).data.report;
    await db.$executeRawUnsafe(
      `CREATE FUNCTION report_share_gate_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='visit_report_shared_${report.id}' THEN RAISE EXCEPTION 'synthetic share notification failure'; END IF; RETURN NEW; END $$`
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER report_share_gate_fail BEFORE INSERT ON "CommunityNotification" FOR EACH ROW EXECUTE FUNCTION report_share_gate_fail()`
    );
    try {
      expect((await share(final)).status).toBe(500);
      expect(
        (await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).sharedWithTeacherAt
      ).toBeNull();
      expect(
        await db.communityNotification.count({ where: { id: `visit_report_shared_${report.id}` } })
      ).toBe(0);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER report_share_gate_fail ON "CommunityNotification"');
      await db.$executeRawUnsafe('DROP FUNCTION report_share_gate_fail()');
    }
  });
  it('blocks spoofed share notifications from both generic notification creation paths', async () => {
    const one = await request('T', '/db/community-notifications', {
      notification: {
        id: 'forged_report_notice',
        type: 'visit_report_shared',
        title: 'forged',
        message: 'forged',
        data: { reportId: 'guessed' },
      },
    });
    expect(one.status).toBe(403);
    const batch = await request('T', '/db/community-notifications/batch', {
      communityNotifications: [
        {
          id: 'visit_report_shared_forged',
          type: 'info',
          title: 'forged',
          message: 'forged',
          data: { reportId: 'guessed' },
        },
      ],
    });
    expect(batch.status).toBeGreaterThanOrEqual(400);
    expect(
      await db.communityNotification.count({
        where: { OR: [{ id: 'forged_report_notice' }, { id: 'visit_report_shared_forged' }] },
      })
    ).toBe(0);
  });
  it('concurrent share and acknowledgement are idempotent with one notification and immutable original actor/timestamps', async () => {
    const { report } = await create();
    const final = (await finalize((await save(report, guide, 12)).data.report)).data.report;
    const shares = await Promise.all([share(final), share(final)]);
    expect(shares.every((result) => result.status === 200)).toBe(true);
    const storedShare = await db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(storedShare.sharedWithTeacherById).toBe('A');
    expect(storedShare.sharedWithTeacherAt).toBeTruthy();
    expect(
      await db.communityNotification.count({ where: { id: `visit_report_shared_${report.id}` } })
    ).toBe(1);
    const acks = await Promise.all([acknowledge(final), acknowledge(final)]);
    expect(acks.every((result) => result.status === 200)).toBe(true);
    const storedAck = await db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(storedAck.teacherAcknowledgedById).toBe('T');
    expect(storedAck.teacherAcknowledgedAt).toBeTruthy();
    expect(storedAck.sharedWithTeacherAt).toEqual(storedShare.sharedWithTeacherAt);
    expect(storedAck.finalSnapshot).toEqual(final.finalSnapshot);
  });
  it('transfer keeps finalized author/snapshot, grants no cross-Inspector editing or old current-profile access', async () => {
    const { v, report } = await create();
    const saved = await save(report, guide, null);
    const finalized = await finalize(saved.data.report);
    const snapshot = finalized.data.report.finalSnapshot;
    const shared = await share(finalized.data.report);
    const sharedAt = shared.data.report.sharedWithTeacherAt;
    const pending = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'B',
      requestedById: 'admin',
    });
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    expect((await save(finalized.data.report, guide, 10)).status).toBe(403);
    expect((await save(finalized.data.report, guide, 10, 'B')).status).toBe(403);
    expect((await request('A', `/pedagogical-visits/${v.id}/report`)).data.context).toEqual(
      snapshot.context
    );
    expect((await request('B', `/pedagogical-visits/${v.id}/report`)).data.report.authorId).toBe(
      'A'
    );
    expect(
      (await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).finalSnapshot
    ).toEqual(snapshot);
    expect(
      (await request('T', `/teacher/visit-reports/${report.id}`)).data.report.sharedWithTeacherAt
    ).toBe(sharedAt);
    expect((await acknowledge(report)).status).toBe(200);
    const own = await request('A', '/inspector/visit-reports');
    expect(own.data.reports).toHaveLength(1);
    expect(own.data.reports[0]).toMatchObject({ id: report.id, visitId: v.id, status: 'FINAL' });
    expect(own.data.reports[0]).not.toHaveProperty('visit');
    expect((await request('B', '/inspector/visit-reports')).data.reports).toEqual([]);
    expect((await request('T', '/inspector/visit-reports')).status).toBe(403);
    expect((await request('A', '/inspector/visit-reports?teacherId=T2')).data.reports).toEqual([]);
  });
  it('keeps an unshared historical report unshareable by either Inspector after transfer', async () => {
    const { report } = await create();
    const final = (await finalize((await save(report, guide, 1)).data.report)).data.report;
    const pending = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'B',
      requestedById: 'admin',
    });
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    expect((await share(final, 'A')).status).toBe(403);
    expect((await share(final, 'B')).status).toBe(403);
    expect((await request('T', '/teacher/visit-reports')).data.reports).toEqual([]);
    expect(
      (await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).sharedWithTeacherAt
    ).toBeNull();
  });
  it('old unfinished draft after transfer is read-only without current profile; new Inspector cannot take it over', async () => {
    const { v, report } = await create();
    const pending = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'B',
      requestedById: 'admin',
    });
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    await db.user.update({ where: { id: 'T' }, data: { firstName: 'CURRENT_PRIVATE' } });
    const read = await request('A', `/pedagogical-visits/${v.id}/report`);
    expect(read.data).toMatchObject({ context: null, canEdit: false });
    expect(JSON.stringify(read.data)).not.toContain('CURRENT_PRIVATE');
    expect((await finalize(report)).status).toBe(403);
    expect((await finalize(report, 'B')).status).toBe(403);
  });
  it('concurrent creation yields one report', async () => {
    const v = await visit();
    const results = await Promise.all([
      request('A', `/pedagogical-visits/${v.id}/report`, {}),
      request('A', `/pedagogical-visits/${v.id}/report`, {}),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.visitReport.count()).toBe(1);
    evidence.duplicateCreation = results.map((r) => r.status);
  });
  it('edit/finalize race is safe and frozen snapshot equals committed content', async () => {
    const { report } = await create();
    const saved = (await save(report, guide, 10)).data.report;
    const results = await Promise.all([
      save(saved, { ...guide, conclusion: 'Concurrent conclusion' }, 12),
      finalize(saved),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const persisted = await db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
    if (persisted.status === 'FINAL')
      expect(persisted.finalSnapshot).toMatchObject({
        content: persisted.content,
        mark: persisted.mark,
      });
    else expect(persisted.finalSnapshot).toBeNull();
    evidence.editFinalize = results.map((r) => r.status);
  });
  it('double finalize has one explicit winner', async () => {
    const { report } = await create();
    const saved = (await save(report, guide, null)).data.report;
    const results = await Promise.all([finalize(saved), finalize(saved)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).revision).toBe(2);
  });
  it('SQL finalization failure rolls back content/status/snapshot/revision/timestamps completely', async () => {
    const { report } = await create();
    const saved = (await save(report, guide, 0)).data.report;
    const before = await db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
    await db.$executeRawUnsafe(
      `CREATE FUNCTION report_gate_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='FINAL' THEN RAISE EXCEPTION 'synthetic finalize failure'; END IF; RETURN NEW; END $$`
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER report_gate_fail AFTER UPDATE ON "VisitReport" FOR EACH ROW EXECUTE FUNCTION report_gate_fail()`
    );
    try {
      expect((await finalize(saved)).status).toBe(500);
      expect(await db.visitReport.findUniqueOrThrow({ where: { id: report.id } })).toEqual(before);
      evidence.rollback = 'PASS';
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER report_gate_fail ON "VisitReport"');
      await db.$executeRawUnsafe('DROP FUNCTION report_gate_fail()');
    }
  });
  it('finalize versus transfer preserves original author and an internally consistent snapshot', async () => {
    const { report } = await create('TENURE');
    const saved = (await save(report, tenure, 20)).data.report;
    const pending = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'B',
      requestedById: 'admin',
    });
    const results = await Promise.allSettled([
      finalize(saved),
      transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted'),
    ]);
    expect(results[1].status).toBe('fulfilled');
    const row = await db.visitReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(row.authorId).toBe('A');
    if (row.status === 'FINAL')
      expect(row.finalSnapshot).toMatchObject({
        context: { location: { directorate: 'Synthetic a' }, inspector: { id: 'A' } },
      });
    else expect(row.finalSnapshot).toBeNull();
    expect((await finalize({ id: row.id, revision: row.revision })).status).toBe(403);
    evidence.transferFinalize = { status: row.status, originalAuthor: row.authorId };
  });
  it('finalize versus completed Visit mutation cannot change terminal Visit or report content', async () => {
    const { v, report } = await create();
    const saved = (await save(report, guide, 0)).data.report;
    const results = await Promise.all([
      finalize(saved),
      request('A', `/pedagogical-visits/${v.id}/actions`, {
        revision: 0,
        action: 'CANCEL',
        reason: 'invalid recovery',
      }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 409]);
    expect((await db.inspectionVisitRecord.findUniqueOrThrow({ where: { id: v.id } })).status).toBe(
      'COMPLETED'
    );
  });
});
