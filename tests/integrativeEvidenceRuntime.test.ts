import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service.js';
import {
  getRegisteredKnowledgeCoreRelease,
  DEFAULT_CANDIDATE_RELEASE_ID,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';

const enabled =
  process.env.ARENASPEX_TEACHER_G1_E2E === 'true' &&
  process.env.ARENASPEX_TEACHER_G1_DATABASE === 'polished-rain-62397371/production/neondb';
const describeRuntime = enabled ? describe : describe.skip;
const baseUrl = process.env.ARENASPEX_E2E_BASE_URL || 'http://127.0.0.1:3000';

describeRuntime('Teacher G2.3-B1 authenticated Integrative evidence runtime', () => {
  const prisma = new PrismaClient();
  const marker = `teacher-g2-3b1-${process.pid}`;
  const teacherA = `${marker}-a`;
  const teacherB = `${marker}-b`;
  const classA = `${marker}-class-a`;
  const classB = `${marker}-class-b`;
  const academicYearId = '2026-2027';
  const levelId = 'lvl_p4';
  const domainId = 'f_fundamentals';
  const password = `${marker}-password`;
  let cookieA = '';
  let cookieB = '';
  let plan: ReturnType<typeof seedTeacherLearningPlan>;
  let competencyId = '';
  let point1 = '';
  let point2 = '';
  let cps1 = '';
  let cps2 = '';
  let diagnosticCps = '';
  let summativeCps = '';

  const request = (cookie: string, path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('cookie', cookie);
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  };
  const login = async (email: string) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, portal: 'professional' }),
    });
    expect(response.status).toBe(200);
    return response.headers.get('set-cookie')!.split(';', 1)[0];
  };
  const create = (cookie: string, body: Record<string, unknown>) =>
    request(cookie, '/api/teacher/assessment-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    if (!enabled) return;
    const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)!.catalog;
    competencyId = catalog.finalCompetencies.find(
      (item) => item.gradeId === levelId && item.domainId === domainId
    )!.id;
    plan = seedTeacherLearningPlan(levelId);
    const domain = plan.domains.find((item) => item.fieldId === domainId)!;
    point1 = domain.integrationPoints[0].id;
    point2 = domain.integrationPoints[1].id;
    await prisma.user.createMany({
      data: [
        {
          id: teacherA,
          username: teacherA,
          spexId: teacherA,
          firstName: 'QA',
          lastName: 'A',
          email: `${teacherA}@local.test`,
          passwordHash: await hashPassword(password),
          role: 'teacher',
          directorateId: '',
          districtId: '',
          status: 'active',
          isApprovedByAdmin: true,
        },
        {
          id: teacherB,
          username: teacherB,
          spexId: teacherB,
          firstName: 'QA',
          lastName: 'B',
          email: `${teacherB}@local.test`,
          passwordHash: await hashPassword(password),
          role: 'teacher',
          directorateId: '',
          districtId: '',
          status: 'active',
          isApprovedByAdmin: true,
        },
      ],
    });
    await prisma.studentClass.createMany({
      data: [
        { id: classA, teacherId: teacherA, levelId, name: `${marker} A` },
        { id: classB, teacherId: teacherB, levelId, name: `${marker} B` },
      ],
    });
    await prisma.annualPlan.create({
      data: {
        id: `${marker}-plan`,
        teacherId: teacherA,
        academicYearId,
        levelId,
        kind: 'teacher_learning_plan',
        status: 'active',
        data: plan as any,
      },
    });
    cps1 = `${marker}-cps-1`;
    cps2 = `${marker}-cps-2`;
    diagnosticCps = `${marker}-diagnostic`;
    summativeCps = `${marker}-summative`;
    await prisma.classPlannedSession.createMany({
      data: [
        {
          id: cps1,
          teacherId: teacherA,
          classId: classA,
          academicYearId,
          referenceSessionId: `integration:${point1}`,
          plannedDate: new Date('2026-10-01'),
          durationMinutes: 45,
        },
        {
          id: cps2,
          teacherId: teacherA,
          classId: classA,
          academicYearId,
          referenceSessionId: `integration:${point2}`,
          plannedDate: new Date('2026-11-01'),
          durationMinutes: 45,
        },
        {
          id: diagnosticCps,
          teacherId: teacherA,
          classId: classA,
          academicYearId,
          referenceSessionId: 'diagnostic:f_fundamentals',
          plannedDate: new Date('2026-09-25'),
          durationMinutes: 45,
        },
        {
          id: summativeCps,
          teacherId: teacherA,
          classId: classA,
          academicYearId,
          referenceSessionId: 'summative:f_fundamentals',
          plannedDate: new Date('2026-12-01'),
          durationMinutes: 45,
        },
      ],
    });
    cookieA = await login(`${teacherA}@local.test`);
    cookieB = await login(`${teacherB}@local.test`);
  }, 120_000);

  afterAll(async () => {
    if (!enabled) return;
    await prisma.assessmentSession.deleteMany({
      where: { teacherId: { in: [teacherA, teacherB] } },
    });
    await prisma.classPlannedSession.deleteMany({
      where: { id: { in: [cps1, cps2, diagnosticCps, summativeCps] } },
    });
    await prisma.annualPlan.deleteMany({ where: { id: `${marker}-plan` } });
    await prisma.studentClass.deleteMany({ where: { id: { in: [classA, classB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [teacherA, teacherB] } } });
    await prisma.$disconnect();
  });

  it('persists scheduled Integrative 1 and 2 from server-derived anchors', async () => {
    const before = await prisma.assessmentSession.count({ where: { teacherId: teacherA } });
    const body = {
      classId: classA,
      academicYearId,
      assessmentType: 'INTEGRATIVE',
      gradeLevelId: levelId,
      domainId,
      finalCompetencyId: competencyId,
      assessedAt: new Date().toISOString(),
    };
    const first = await create(cookieA, {
      ...body,
      classPlannedSessionId: cps1,
      integrationNumber: 2,
      coveredReferenceIds: ['fake'],
      integrativeEvidenceSnapshot: { fake: true },
    });
    expect(first.status).toBe(201);
    const firstJson = await first.json();
    const second = await create(cookieA, { ...body, classPlannedSessionId: cps2 });
    expect(second.status).toBe(201);
    const secondJson = await second.json();
    const rows = await prisma.assessmentSession.findMany({
      where: { teacherId: teacherA },
      orderBy: { integrationPointId: 'asc' },
    });
    expect(rows).toHaveLength(before + 2);
    expect(rows.map((row) => row.integrationPointId)).toEqual([point1, point2]);
    expect((rows[0].integrativeEvidenceSnapshot as any).number).toBe(1);
    expect((rows[1].integrativeEvidenceSnapshot as any).number).toBe(2);
    expect(firstJson.session.integration.number).toBe(1);
    expect(secondJson.session.integration.number).toBe(2);
    expect((rows[0].integrativeEvidenceSnapshot as any).coveredReferences).not.toEqual(['fake']);
  }, 30_000);

  it('serves owned standalone options and accepts the selected point without side effects', async () => {
    const before = await prisma.assessmentSession.count({ where: { teacherId: teacherA } });
    const query = new URLSearchParams({
      classId: classA,
      academicYearId,
      gradeLevelId: levelId,
      domainId,
      finalCompetencyId: competencyId,
    });
    const response = await request(cookieA, `/api/teacher/integrative-assessment-options?${query}`);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.options.map((item: any) => item.integrationPointId)).toEqual([point1, point2]);
    expect(json.options.map((item: any) => item.slot)).toEqual([1, 2]);
    expect(json.options.map((item: any) => item.displayLabel)).toEqual(['إدماجية 1', 'إدماجية 2']);
    expect(json.options[0].coveredLearningScope.map((item: any) => item.orderIndex)).toEqual([
      1, 2, 3,
    ]);
    expect(JSON.stringify(json)).not.toContain('integrationPoints');
    expect(JSON.stringify(json)).not.toContain('integrativeEvidenceSnapshot');
    expect(await prisma.assessmentSession.count({ where: { teacherId: teacherA } })).toBe(before);

    const wrongGrade = await request(
      cookieA,
      `/api/teacher/integrative-assessment-options?${new URLSearchParams({ ...Object.fromEntries(query), gradeLevelId: 'lvl_p3' })}`
    );
    expect(wrongGrade.status).toBe(400);
    const wrongDomain = await request(
      cookieA,
      `/api/teacher/integrative-assessment-options?${new URLSearchParams({ ...Object.fromEntries(query), domainId: 'f_locomotion' })}`
    );
    expect(wrongDomain.status).toBe(400);
    const foreign = await request(cookieB, `/api/teacher/integrative-assessment-options?${query}`);
    expect(foreign.status).toBe(404);

    const standalone = await create(cookieA, {
      classId: classA,
      academicYearId,
      assessmentType: 'INTEGRATIVE',
      gradeLevelId: levelId,
      domainId,
      finalCompetencyId: competencyId,
      integrationPointId: json.options[0].integrationPointId,
      assessedAt: new Date().toISOString(),
    });
    expect(standalone.status).toBe(201);
  }, 30_000);

  it('rejects ambiguity, diagnostic/summative CPS, wrong competency, cross-context, and Teacher B IDOR', async () => {
    const body = {
      classId: classA,
      academicYearId,
      assessmentType: 'INTEGRATIVE',
      gradeLevelId: levelId,
      domainId,
      finalCompetencyId: competencyId,
      assessedAt: new Date().toISOString(),
    };
    expect((await create(cookieA, body)).status).toBe(400);
    expect(
      (await create(cookieA, { ...body, classPlannedSessionId: cps1, finalCompetencyId: 'wrong' }))
        .status
    ).toBe(400);
    expect((await create(cookieA, { ...body, classPlannedSessionId: diagnosticCps })).status).toBe(
      400
    );
    expect((await create(cookieA, { ...body, classPlannedSessionId: summativeCps })).status).toBe(
      400
    );
    const wrongLearning = await prisma.classPlannedSession.create({
      data: {
        id: `${marker}-learning`,
        teacherId: teacherA,
        classId: classA,
        academicYearId,
        referenceSessionId: 'objective:wrong',
        plannedDate: new Date(),
        durationMinutes: 45,
      },
    });
    expect(
      (await create(cookieA, { ...body, classPlannedSessionId: wrongLearning.id })).status
    ).toBe(400);
    expect(
      (await create(cookieA, { ...body, classPlannedSessionId: cps1, gradeLevelId: 'lvl_p3' }))
        .status
    ).toBe(400);
    expect(
      (await create(cookieA, { ...body, classPlannedSessionId: cps1, domainId: 'f_locomotion' }))
        .status
    ).toBe(400);
    expect(
      (await create(cookieB, { ...body, classId: classB, integrationPointId: point1 })).status
    ).toBe(400);
    expect(
      (await create(cookieB, { ...body, classId: classA, classPlannedSessionId: cps1 })).status
    ).toBe(404);
    await prisma.classPlannedSession.delete({ where: { id: wrongLearning.id } });
  }, 30_000);

  it('keeps non-Integrative evidence null and exposes legacy generic Integrative', async () => {
    const learning = await prisma.assessmentSession.create({
      data: {
        id: `${marker}-legacy`,
        teacherId: teacherA,
        classId: classA,
        academicYearId,
        assessmentType: 'INTEGRATIVE',
        gradeLevelId: levelId,
        domainId,
        finalCompetencyId: competencyId,
        assessedAt: new Date(),
      },
    });
    const response = await request(cookieA, `/api/teacher/assessment-sessions/${learning.id}`);
    expect(response.status).toBe(200);
    expect((await response.json()).session.integration).toBeNull();
  });

  it('keeps a real historical snapshot stable after plan edits and proves null contracts', async () => {
    const body = {
      classId: classA,
      academicYearId,
      assessmentType: 'INTEGRATIVE',
      gradeLevelId: levelId,
      domainId,
      finalCompetencyId: competencyId,
      integrationPointId: point1,
      assessedAt: new Date().toISOString(),
    };
    const created = await create(cookieA, body);
    expect(created.status).toBe(201);
    const createdJson = await created.json();
    const before = await prisma.assessmentSession.findUniqueOrThrow({
      where: { id: createdJson.session.id },
    });
    const snapshotBefore = before.integrativeEvidenceSnapshot;
    const planRow = await prisma.annualPlan.findUniqueOrThrow({ where: { id: `${marker}-plan` } });
    const changed = JSON.parse(JSON.stringify(planRow.data));
    changed.domains.find((item: any) => item.fieldId === domainId).integrationPoints[0].label =
      'تغيير لاحق';
    changed.domains.find((item: any) => item.fieldId === domainId).objectives[0].text =
      'صياغة لاحقة';
    await prisma.annualPlan.update({ where: { id: planRow.id }, data: { data: changed } });
    const reread = await request(
      cookieA,
      `/api/teacher/assessment-sessions/${createdJson.session.id}`
    );
    expect(reread.status).toBe(200);
    const rereadJson = await reread.json();
    expect(rereadJson.session.integration.label).toBe((snapshotBefore as any).label);
    expect(rereadJson.session.integration.coveredReferences).toEqual(
      (snapshotBefore as any).coveredReferences
    );
    await prisma.annualPlan.update({ where: { id: planRow.id }, data: { data: planRow.data } });
  }, 30_000);

  it('keeps LEARNING, DIAGNOSTIC, and SUMMATIVE evidence fields null', async () => {
    const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)!.catalog;
    const types = ['LEARNING', 'DIAGNOSTIC', 'SUMMATIVE'] as const;
    for (const [index, assessmentType] of types.entries()) {
      const id = `${marker}-null-${index}`;
      await prisma.assessmentSession.create({
        data: {
          id,
          teacherId: teacherA,
          classId: classA,
          academicYearId,
          assessmentType,
          gradeLevelId: levelId,
          domainId,
          finalCompetencyId: catalog.finalCompetencies.find(
            (item) => item.gradeId === levelId && item.domainId === domainId
          )!.id,
          assessedAt: new Date(),
        },
      });
      const row = await prisma.assessmentSession.findUniqueOrThrow({ where: { id } });
      expect(row.integrationPointId).toBeNull();
      expect(row.integrativeEvidenceSnapshot).toBeNull();
    }
  }, 30_000);
});
