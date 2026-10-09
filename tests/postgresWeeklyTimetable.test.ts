import 'express-async-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
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
describe.skipIf(!url)('Weekly timetable real local PostgreSQL ownership and supervision', () => {
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
    execFileSync(
      process.execPath,
      [
        path.resolve('node_modules/prisma/build/index.js'),
        'db',
        'push',
        '--schema',
        path.resolve('prisma/schema.prisma'),
        '--skip-generate',
      ],
      { env: { ...process.env, DATABASE_URL: url!, DIRECT_DATABASE_URL: url! }, timeout: 60000 }
    );
    await db.$disconnect();
    ({ prisma: db } = await import('../src/server/prismaClient'));
    ({ signSession: sign } = await import('../src/server/auth'));
    transfer = await import('../src/server/assignmentTransferService');
    const { apiRouter } = await import('../src/server/apiRouter');
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api', apiRouter);
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
    await db.$executeRawUnsafe('TRUNCATE "User", "Directorate" CASCADE');
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
          passwordHash: 'synthetic',
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
  });
  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (db) await db.$disconnect();
    if (root)
      writeFileSync(
        path.join(root, 'weekly-timetable-evidence.json'),
        JSON.stringify({
          localOnly: true,
          schemaChanges: false,
          checks: 'ownership/year-isolation/transfer/read-only',
          completed: true,
        })
      );
  });
  it('saved own slots are immediately visible, and same-year edits return the latest current data', async () => {
    expect((await request('A', view())).data.slots).toEqual([]);
    const created = await request('T', own, 'POST', input());
    expect(created.status).toBe(201);
    const id = created.data.slot.id;
    expect((await request('T', own + '?academicYearId=2026-2027')).data.slots[0].id).toBe(id);
    expect((await request('A', view())).data.slots[0].startTime).toBe('08:00');
    expect(
      (
        await request('T', `${own}/${id}`, 'PATCH', {
          ...input(),
          startTime: '10:00',
          endTime: '11:00',
        })
      ).status
    ).toBe(200);
    expect((await request('A', view())).data.slots[0]).toMatchObject({ id, startTime: '10:00' });
    expect(await db.teacherWeeklySlot.count()).toBe(1);
  });
  it('persists term-test scheduling preferences independently per teacher and year', async () => {
    const endpoint = '/teacher/planning/calendar-preference';
    const completedDate = new Date('2026-12-06T00:00:00.000Z');
    await db.annualPlan.create({
      data: {
        id: 'saved-annual-distribution',
        teacherId: 'T',
        academicYearId: '2026-2027',
        levelId: 'lvl_p3',
        kind: 'schedule',
        data: { note: 'saved distribution', overrides: { session1: { date: '2026-12-06' } } },
      },
    });
    await db.classPlannedSession.create({
      data: {
        id: 'completed-test-period-session',
        teacherId: 'T',
        classId: 'group',
        academicYearId: '2026-2027',
        referenceSessionId: 'stored-reference',
        plannedDate: completedDate,
        durationMinutes: 45,
        status: 'منجزة',
        operationalNote: 'protected history',
      },
    });
    expect((await request('T', `${endpoint}?academicYearId=2026-2027`)).data).toMatchObject({
      schedulePeDuringTermTests: true,
    });
    expect(
      (
        await request('T', endpoint, 'PUT', {
          academicYearId: '2026-2027',
          schedulePeDuringTermTests: false,
        })
      ).status
    ).toBe(200);
    expect((await request('T', `${endpoint}?academicYearId=2026-2027`)).data).toMatchObject({
      schedulePeDuringTermTests: false,
    });
    expect((await request('T2', `${endpoint}?academicYearId=2026-2027`)).data).toMatchObject({
      schedulePeDuringTermTests: true,
    });
    expect((await request('T', `${endpoint}?academicYearId=2027-2028`)).data).toMatchObject({
      schedulePeDuringTermTests: true,
    });
    expect(await db.teacherAcademicCalendarPreference.count()).toBe(1);
    expect(
      await db.annualPlan.findUniqueOrThrow({ where: { id: 'saved-annual-distribution' } })
    ).toMatchObject({
      data: { note: 'saved distribution', overrides: { session1: { date: '2026-12-06' } } },
    });
    expect(
      await db.classPlannedSession.findUniqueOrThrow({
        where: { id: 'completed-test-period-session' },
      })
    ).toMatchObject({
      plannedDate: completedDate,
      status: 'منجزة',
      operationalNote: 'protected history',
    });
  });
  it('generates all five reference levels for zero-class and Year-2-only teachers', async () => {
    const createTeacher = async (id: string) =>
      db.user.create({
        data: {
          id,
          username: id,
          spexId: id,
          firstName: id,
          lastName: 'Synthetic',
          email: `${id}@example.test`,
          passwordHash: 'synthetic',
          role: 'teacher',
          status: 'active',
          isApprovedByAdmin: true,
          accessExpiresAt: new Date('2099-07-31'),
          directorateId: '',
          districtId: '',
          eduDirectorateId: null,
          eduDistrictId: null,
        },
      });
    await createTeacher('zero-class-teacher');
    await createTeacher('year2-only-teacher');
    await db.studentClass.create({
      data: {
        id: 'real-year2-class',
        teacherId: 'year2-only-teacher',
        name: 'قسم السنة الثانية الحقيقي',
        levelId: 'lvl_p2',
      },
    });
    await db.teacherWeeklySlot.create({
      data: {
        id: 'real-year2-monday-slot',
        teacherId: 'year2-only-teacher',
        classId: 'real-year2-class',
        academicYearId: '2026-2027',
        weekday: 1,
        startTime: '08:00',
        endTime: '09:00',
      },
    });
    const editedData = {
      note: 'teacher manual note',
      overrides: { f_locomotion__1: { objective: 'teacher-edited objective' } },
    };
    await db.annualPlan.create({
      data: {
        id: 'manual-zero-plan',
        teacherId: 'zero-class-teacher',
        academicYearId: '2026-2027',
        levelId: 'lvl_p1',
        kind: 'annual_distribution',
        status: 'approved',
        data: editedData,
      },
    });

    const generate = (teacherId: string) =>
      request(teacherId, '/teacher/planning/annual-distribution/initialize', 'POST', {
        academicYearId: '2026-2027',
        planningStartDate: '2026-09-21',
      });
    const zeroResult = await generate('zero-class-teacher');
    expect(zeroResult.status).toBe(201);
    expect(zeroResult.data.levels.map((level: { levelId: string }) => level.levelId)).toEqual([
      'lvl_p1',
      'lvl_p2',
      'lvl_p3',
      'lvl_p4',
      'lvl_p5',
    ]);
    const zeroPlans = await db.annualPlan.findMany({
      where: { teacherId: 'zero-class-teacher', academicYearId: '2026-2027' },
    });
    expect(zeroPlans).toHaveLength(5);
    expect(await db.studentClass.count({ where: { teacherId: 'zero-class-teacher' } })).toBe(0);
    expect(await db.student.count()).toBe(0);
    expect(await db.classPlannedSession.count({ where: { teacherId: 'zero-class-teacher' } })).toBe(
      0
    );
    expect(
      await db.annualPlan.findUniqueOrThrow({ where: { id: 'manual-zero-plan' } })
    ).toMatchObject({ data: { overrides: editedData.overrides } });

    const repeated = await generate('zero-class-teacher');
    expect(repeated.status).toBe(201);
    expect(
      await db.annualPlan.count({
        where: { teacherId: 'zero-class-teacher', academicYearId: '2026-2027' },
      })
    ).toBe(5);
    expect(await db.classPlannedSession.count({ where: { teacherId: 'zero-class-teacher' } })).toBe(
      0
    );

    const partialResult = await generate('year2-only-teacher');
    expect(partialResult.status).toBe(201);
    expect(partialResult.data.levels.map((level: { levelId: string }) => level.levelId)).toEqual([
      'lvl_p1',
      'lvl_p2',
      'lvl_p3',
      'lvl_p4',
      'lvl_p5',
    ]);
    expect(
      await db.annualPlan.count({
        where: { teacherId: 'year2-only-teacher', academicYearId: '2026-2027' },
      })
    ).toBe(5);
    const realClassSessions = await db.classPlannedSession.findMany({
      where: { teacherId: 'year2-only-teacher', academicYearId: '2026-2027' },
    });
    expect(realClassSessions).toHaveLength(34);
    expect(realClassSessions.every((session) => session.classId === 'real-year2-class')).toBe(true);
    expect(realClassSessions.every((session) => session.durationMinutes === 60)).toBe(true);
    expect(
      new Set(realClassSessions.map((session) => session.plannedDate.toISOString().slice(0, 10)))
        .size
    ).toBe(34);
    expect(await db.student.count()).toBe(0);
    expect(
      (
        await request('A', '/teacher/planning/annual-distribution/initialize', 'POST', {
          academicYearId: '2026-2027',
          planningStartDate: '2026-09-21',
        })
      ).status
    ).toBe(403);
  });
  it('new-year creation preserves the previous year and cross-year PATCH cannot move an old slot', async () => {
    const previous = (await request('T', own, 'POST', input('2024-2025'))).data.slot;
    expect((await request('T', own, 'POST', input())).status).toBe(201);
    expect((await request('T', `${own}/${previous.id}`, 'PATCH', input())).status).toBe(409);
    expect((await request('A', view('T', '2024-2025'))).data.slots).toHaveLength(1);
    expect((await request('A', view())).data.academicYears).toEqual(['2026-2027', '2024-2025']);
    expect(await db.teacherWeeklySlot.count()).toBe(2);
  });
  it('rejects guessed Teachers, other assignments, unassigned Inspectors, Admin and Director access', async () => {
    for (const [actor, teacher] of [
      ['A', 'T2'],
      ['A', 'guessed'],
      ['B', 'T'],
      ['U', 'T'],
      ['admin', 'T'],
      ['director', 'T'],
      ['T2', 'T'],
    ])
      expect((await request(actor, view(teacher))).status).toBe(403);
  });
  it('Inspector cannot create/change/delete own or guessed slots through either URL family', async () => {
    const id = (await request('T', own, 'POST', input())).data.slot.id;
    for (const actor of ['A', 'B', 'U']) {
      expect((await request(actor, own, 'POST', input())).status).toBe(403);
      expect((await request(actor, `${own}/${id}`, 'PATCH', input())).status).toBe(403);
      expect((await request(actor, `${own}/${id}`, 'DELETE')).status).toBe(403);
      expect(
        (await request(actor, `/inspector/teachers/T/weekly-timetable/${id}`, 'PATCH', input()))
          .status
      ).toBe(404);
    }
    expect(await db.teacherWeeklySlot.count()).toBe(1);
  });
  it('Teacher cannot read or modify another Teacher slot/class, and deletion stays owner-scoped', async () => {
    const id = (await request('T', own, 'POST', input())).data.slot.id;
    expect((await request('T2', own + '?academicYearId=2026-2027&teacherId=T')).data.slots).toEqual(
      []
    );
    expect(
      (await request('T2', `${own}/${id}`, 'PATCH', { ...input(), classId: 'foreign' })).status
    ).toBe(404);
    expect((await request('T2', own, 'POST', input())).status).toBe(403);
    await request('T2', `${own}/${id}`, 'DELETE');
    expect(await db.teacherWeeklySlot.count()).toBe(1);
    expect((await request('T', `${own}/${id}`, 'DELETE')).status).toBe(200);
    expect(await db.teacherWeeklySlot.count()).toBe(0);
  });
  it('accepted transfer switches current/historical year access without altering schedules', async () => {
    await request('T', own, 'POST', input());
    await request('T', own, 'POST', input('2024-2025'));
    const before = await db.teacherWeeklySlot.findMany({ orderBy: { id: 'asc' } });
    const pending = await transfer.requestTeacherTransfer({
      teacherId: 'T',
      destinationInspectorId: 'B',
      requestedById: 'admin',
    });
    expect((await request('A', view())).status).toBe(200);
    expect((await request('B', view())).status).toBe(403);
    await transfer.decideTeacherTransfer(pending.id, 'B', 'Accepted');
    for (const year of ['2026-2027', '2024-2025']) {
      expect((await request('A', view('T', year))).status).toBe(403);
      expect((await request('B', view('T', year))).data.slots).toHaveLength(1);
    }
    expect(await db.teacherWeeklySlot.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });
  it('institution change in the same district does not revoke accepted supervision and no pupil records leak', async () => {
    await request('T', own, 'POST', input());
    await db.user.update({ where: { id: 'T' }, data: { schoolName: 'مؤسسة أخرى' } });
    const result = await request('A', view());
    expect(result.status).toBe(200);
    expect(result.data.teacher.schoolName).toBe('مؤسسة أخرى');
    expect(result.data).not.toHaveProperty('students');
    expect(result.data.slots[0]).not.toHaveProperty('class');
  });
});
