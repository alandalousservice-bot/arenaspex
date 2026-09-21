import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';
import {
  DEFAULT_CANDIDATE_RELEASE_ID,
  getRegisteredKnowledgeCoreRelease,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';

const enabled = process.env.ARENASPEX_TEACHER_G1_E2E === 'true';
const describeRuntime = enabled ? describe : describe.skip;
const baseUrl = process.env.ARENASPEX_E2E_BASE_URL || 'http://127.0.0.1:3000';

describeRuntime('Teacher G2.4-B1 Summative runtime closure', () => {
  const prisma = new PrismaClient();
  const marker = `g24b1-${process.pid}`;
  const ids = {
    teacher: `${marker}-teacher`,
    teacherB: `${marker}-teacher-b`,
    class: `${marker}-class`,
    classB: `${marker}-class-b`,
    student: `${marker}-student`,
    cps: `${marker}-cps`,
    cpsB: `${marker}-cps-b`,
    learningCps: `${marker}-learning-cps`,
    scheduled: `${marker}-scheduled`,
    standalone: `${marker}-standalone`,
  };
  const year = '2026-2027';
  const password = `${marker}-password`;
  let cookie = '';
  let cookieB = '';
  const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)!.catalog;
  const competency = catalog.finalCompetencies.find(
    (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_fundamentals'
  )!;
  const otherCompetency = catalog.finalCompetencies.find(
    (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_locomotion'
  )!;
  const criteria = catalog.criteria.filter((item) => item.finalCompetencyId === competency.id);

  async function request(c: string, path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('cookie', c);
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  }
  async function createSession(c: string, body: Record<string, unknown>) {
    return request(c, '/api/teacher/assessment-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  const summativeBody = (extra: Record<string, unknown> = {}) => ({
    classId: ids.class,
    academicYearId: year,
    assessmentType: 'SUMMATIVE',
    gradeLevelId: 'lvl_p1',
    domainId: 'f_fundamentals',
    finalCompetencyId: competency.id,
    assessedAt: new Date().toISOString(),
    ...extra,
  });

  beforeAll(async () => {
    if (process.env.ARENASPEX_TEACHER_G1_DATABASE !== 'polished-rain-62397371/production/neondb')
      throw new Error('isolated Neon runtime guard failed');
    const common = {
      role: 'teacher',
      directorateId: '',
      districtId: '',
      status: 'active',
      isApprovedByAdmin: true,
    };
    await prisma.user.createMany({
      data: [
        {
          ...common,
          id: ids.teacher,
          username: ids.teacher,
          spexId: ids.teacher,
          firstName: 'QA',
          lastName: 'A',
          email: `${ids.teacher}@local.test`,
          passwordHash: await hashPassword(password),
        },
        {
          ...common,
          id: ids.teacherB,
          username: ids.teacherB,
          spexId: ids.teacherB,
          firstName: 'QA',
          lastName: 'B',
          email: `${ids.teacherB}@local.test`,
          passwordHash: await hashPassword(`${password}-b`),
        },
      ],
    });
    await prisma.studentClass.createMany({
      data: [
        { id: ids.class, teacherId: ids.teacher, levelId: 'lvl_p1', name: ids.class },
        { id: ids.classB, teacherId: ids.teacherB, levelId: 'lvl_p1', name: ids.classB },
      ],
    });
    await prisma.student.create({
      data: {
        id: ids.student,
        teacherId: ids.teacher,
        classId: ids.class,
        matricule: marker,
        firstName: 'QA',
        lastName: 'Student',
        grade: 1,
        schoolYear: year,
      },
    });
    await prisma.classPlannedSession.createMany({
      data: [
        {
          id: ids.cps,
          teacherId: ids.teacher,
          classId: ids.class,
          academicYearId: year,
          referenceSessionId: 'summative:f_fundamentals',
          plannedDate: new Date(),
          durationMinutes: 45,
        },
        {
          id: ids.learningCps,
          teacherId: ids.teacher,
          classId: ids.class,
          academicYearId: year,
          referenceSessionId: 'objective:qa-learning',
          plannedDate: new Date(),
          durationMinutes: 45,
        },
        {
          id: ids.cpsB,
          teacherId: ids.teacherB,
          classId: ids.classB,
          academicYearId: year,
          referenceSessionId: 'summative:f_fundamentals',
          plannedDate: new Date(),
          durationMinutes: 45,
        },
      ],
    });
    const login = await request('', '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${ids.teacher}@local.test`,
        password,
        portal: 'professional',
      }),
    });
    expect(login.status).toBe(200);
    cookie = login.headers.get('set-cookie')!.split(';', 1)[0];
    const loginB = await request('', '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${ids.teacherB}@local.test`,
        password: `${password}-b`,
        portal: 'professional',
      }),
    });
    expect(loginB.status).toBe(200);
    cookieB = loginB.headers.get('set-cookie')!.split(';', 1)[0];
  }, 120_000);

  it('proves scheduled and standalone Summative contracts, attacks, results, and side-effect boundaries', async () => {
    const before = {
      student: await prisma.studentAssessment.count(),
      criterion: await prisma.criterionResult.count(),
    };
    const scheduled = await createSession(
      cookie,
      summativeBody({ id: ids.scheduled, classPlannedSessionId: ids.cps })
    );
    expect(scheduled.status).toBe(201);
    const scheduledJson = await scheduled.json();
    expect(scheduledJson.session).toMatchObject({
      id: ids.scheduled,
      assessmentType: 'SUMMATIVE',
      classPlannedSessionId: ids.cps,
      finalCompetencyId: competency.id,
      integrationPointId: null,
      integration: null,
    });
    const standalone = await createSession(cookie, summativeBody({ id: ids.standalone }));
    expect(standalone.status).toBe(201);
    expect((await standalone.json()).session.integration).toBeNull();
    const attacks = [
      ['wrong-grade', summativeBody({ id: `${marker}-wrong-grade`, gradeLevelId: 'lvl_p2' })],
      ['wrong-domain', summativeBody({ id: `${marker}-wrong-domain`, domainId: 'f_locomotion' })],
      [
        'wrong-competency',
        summativeBody({ id: `${marker}-wrong-fc`, finalCompetencyId: otherCompetency.id }),
      ],
      [
        'non-summative-cps',
        summativeBody({ id: `${marker}-foreign-cps`, classPlannedSessionId: ids.learningCps }),
      ],
      [
        'cross-year-cps',
        summativeBody({
          id: `${marker}-cross-year`,
          academicYearId: '2025-2026',
          classPlannedSessionId: ids.cps,
        }),
      ],
      [
        'teacher-b-cps',
        summativeBody({
          id: `${marker}-teacher-b-cps`,
          classId: ids.classB,
          classPlannedSessionId: ids.cpsB,
        }),
      ],
    ] as const;
    for (const [label, body] of attacks)
      expect((await createSession(cookie, body)).status, label).not.toBe(201);
    expect(
      (await request(cookieB, `/api/teacher/assessment-sessions/${ids.scheduled}`)).status
    ).toBe(404);
    const countsAfterCreate = {
      student: await prisma.studentAssessment.count(),
      criterion: await prisma.criterionResult.count(),
    };
    expect(countsAfterCreate).toEqual(before);
    const result = await request(
      cookie,
      `/api/teacher/assessment-sessions/${ids.scheduled}/students/${ids.student}`,
      { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }
    );
    expect(result.status).toBe(200);
    const partial = await request(
      cookie,
      `/api/teacher/assessment-sessions/${ids.scheduled}/students/${ids.student}/criteria/${criteria[0].id}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ masteryLevel: 'ب' }),
      }
    );
    expect(partial.status).toBe(200);
    const foreignCriterion = catalog.criteria.find(
      (item) => item.finalCompetencyId === otherCompetency.id
    )!;
    expect(
      (
        await request(
          cookie,
          `/api/teacher/assessment-sessions/${ids.scheduled}/students/${ids.student}/criteria/${foreignCriterion.id}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ masteryLevel: 'أ' }),
          }
        )
      ).status
    ).toBe(400);
    for (const criterion of criteria.slice(1)) {
      const response = await request(
        cookie,
        `/api/teacher/assessment-sessions/${ids.scheduled}/students/${ids.student}/criteria/${criterion.id}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ masteryLevel: 'أ' }),
        }
      );
      expect(response.status).toBe(200);
    }
    const readback = await request(cookie, `/api/teacher/assessment-sessions/${ids.scheduled}`);
    expect(readback.status).toBe(200);
    const payload = await readback.json();
    expect(payload.results[0].criterionResults).toHaveLength(criteria.length);
    expect(payload.results[0].masteryLevel).toBeTruthy();
    expect(
      (
        await request(
          cookieB,
          `/api/teacher/assessment-sessions/${ids.scheduled}/students/${ids.student}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ masteryLevel: 'د' }),
          }
        )
      ).status
    ).toBe(404);
    expect(
      (
        await request(
          cookieB,
          `/api/teacher/assessment-sessions/${ids.scheduled}/students/${ids.student}/criteria/${criteria[0].id}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ masteryLevel: 'د' }),
          }
        )
      ).status
    ).toBe(404);
  }, 120_000);

  afterAll(async () => {
    await prisma.criterionResult.deleteMany({
      where: {
        studentAssessment: { assessmentSession: { id: { in: [ids.scheduled, ids.standalone] } } },
      },
    });
    await prisma.studentAssessment.deleteMany({
      where: { assessmentSessionId: { in: [ids.scheduled, ids.standalone] } },
    });
    await prisma.assessmentSession.deleteMany({
      where: { id: { in: [ids.scheduled, ids.standalone] } },
    });
    await prisma.classPlannedSession.deleteMany({
      where: { id: { in: [ids.cps, ids.cpsB, ids.learningCps] } },
    });
    await prisma.student.deleteMany({ where: { id: ids.student } });
    await prisma.studentClass.deleteMany({ where: { id: { in: [ids.class, ids.classB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.teacher, ids.teacherB] } } });
    await prisma.$disconnect();
  });
});
