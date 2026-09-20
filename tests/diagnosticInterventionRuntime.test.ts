import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';
import { getRegisteredKnowledgeCoreRelease } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';
import { DEFAULT_CANDIDATE_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';

const enabled = process.env.ARENASPEX_TEACHER_G1_E2E === 'true';
const baseUrl = process.env.ARENASPEX_E2E_BASE_URL || 'http://127.0.0.1:3000';
const marker = `teacher-g2-2b2-${process.pid}`;
const runtimeDescribe = enabled ? describe : describe.skip;

runtimeDescribe('Teacher G2.2-B2 diagnostic intervention runtime', () => {
  const prisma = new PrismaClient();
  const password = `${marker}-password`;
  const passwordB = `${marker}-password-b`;
  const userId = `${marker}-teacher`;
  const userBId = `${marker}-teacher-b`;
  const classId = `${marker}-class`;
  const studentId = `${marker}-student`;
  const sessionId = `${marker}-session`;
  const studentAssessmentId = `${marker}-assessment`;
  const criterionResultId = `${marker}-criterion`;
  const directorateId = `${marker}-directorate`;
  let interventionId = '';
  let resourceInterventionId = '';
  let cookie = '';

  function assertTarget() {
    if (
      !enabled ||
      process.env.ARENASPEX_TEACHER_G1_DATABASE !== 'polished-rain-62397371/production/neondb'
    )
      throw new Error('isolated Neon runtime guard failed');
  }
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('cookie', cookie);
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  }
  async function login(email = `${marker}@local.test`, loginPassword = password) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: loginPassword, portal: 'professional' }),
    });
    expect(response.status).toBe(200);
    cookie = response.headers.get('set-cookie')!.split(';', 1)[0];
  }

  beforeAll(async () => {
    assertTarget();
    const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)!.catalog;
    const finalCompetency = catalog.finalCompetencies.find(
      (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_locomotion'
    )!;
    const criterion = catalog.criteria.find(
      (item) => item.finalCompetencyId === finalCompetency.id
    )!;
    const passwordHash = await hashPassword(password);
    await prisma.directorate.upsert({
      where: { id: directorateId },
      update: {},
      create: { id: directorateId, name: marker, wilayaCode: 'QA' },
    });
    await prisma.user.create({
      data: {
        id: userId,
        username: marker,
        spexId: marker,
        firstName: 'QA',
        lastName: 'Teacher',
        email: `${marker}@local.test`,
        passwordHash,
        role: 'teacher',
        directorateId,
        districtId: '',
        status: 'active',
        isApprovedByAdmin: true,
      },
    });
    await prisma.user.create({
      data: {
        id: userBId,
        username: `${marker}-b`,
        spexId: `${marker}-b`,
        firstName: 'QA',
        lastName: 'Teacher B',
        email: `${marker}-b@local.test`,
        passwordHash: await hashPassword(passwordB),
        role: 'teacher',
        directorateId,
        districtId: '',
        status: 'active',
        isApprovedByAdmin: true,
      },
    });
    await prisma.studentClass.create({
      data: { id: classId, teacherId: userId, levelId: 'lvl_p1', name: marker },
    });
    await prisma.student.create({
      data: {
        id: studentId,
        teacherId: userId,
        classId,
        matricule: marker,
        firstName: 'QA',
        lastName: 'Student',
        grade: 1,
        schoolYear: '2026-2027',
      },
    });
    await prisma.assessmentSession.create({
      data: {
        id: sessionId,
        teacherId: userId,
        classId,
        academicYearId: '2026-2027',
        assessmentType: 'DIAGNOSTIC',
        gradeLevelId: 'lvl_p1',
        domainId: 'f_locomotion',
        finalCompetencyId: finalCompetency.id,
        assessedAt: new Date(),
      },
    });
    await prisma.studentAssessment.create({
      data: { id: studentAssessmentId, assessmentSessionId: sessionId, studentId },
    });
    await prisma.criterionResult.create({
      data: {
        id: criterionResultId,
        studentAssessmentId,
        criterionId: criterion.id,
        masteryLevel: 'د',
      },
    });
    await login();
  }, 120_000);

  it('persists lifecycle, snapshot, ownership, and no planning side effects', async () => {
    const create = await request(`/api/teacher/assessment-sessions/${sessionId}/interventions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        studentAssessmentId,
        criterionResultId,
        customText: 'تدريب علاجي اختباري',
      }),
    });
    expect(create.status).toBe(201);
    const created = await create.json();
    interventionId = created.intervention.id;
    expect(created.intervention.status).toBe('SELECTED');
    const resources = await request(
      `/api/teacher/assessment-sessions/${sessionId}/remediation-candidates/${criterionResultId}/resources`
    );
    expect(resources.status).toBe(200);
    expect((await resources.json()).resources[0]).toMatchObject({
      resourceId: 'k_r1',
      compatibility: { level: 'CONTEXTUAL' },
    });
    const resourceCreate = await request(
      `/api/teacher/assessment-sessions/${sessionId}/interventions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentAssessmentId,
          criterionResultId,
          resourceId: 'k_r1',
          resourceTitleSnapshot: 'client-forged-title',
          resourceBodySnapshot: { forged: true },
        }),
      }
    );
    expect(resourceCreate.status).toBe(201);
    const resourceIntervention = await resourceCreate.json();
    resourceInterventionId = resourceIntervention.intervention.id;
    expect(resourceIntervention.intervention.resourceId).toBe('k_r1');
    expect(resourceIntervention.intervention.resourceTitleSnapshot).not.toBe('client-forged-title');
    expect(resourceIntervention.intervention.resourceBodySnapshot.forged).toBeUndefined();
    const incompatible = await request(
      `/api/teacher/assessment-sessions/${sessionId}/interventions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentAssessmentId, criterionResultId, resourceId: 'k_g1' }),
      }
    );
    expect(incompatible.status).toBe(400);
    const applied = await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'APPLIED' }),
    });
    expect((await applied.json()).intervention.appliedAt).toBeTruthy();
    const completed = await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    expect((await completed.json()).intervention.completedAt).toBeTruthy();
    const cancelled = await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
      method: 'DELETE',
    });
    expect((await cancelled.json()).intervention.status).toBe('CANCELLED');
    const row = await prisma.diagnosticIntervention.findUnique({ where: { id: interventionId } });
    expect(row).toMatchObject({
      teacherId: userId,
      studentAssessmentId,
      criterionResultId,
      customText: 'تدريب علاجي اختباري',
      status: 'CANCELLED',
    });
    await login(`${marker}-b@local.test`, passwordB);
    expect(
      (await request(`/api/teacher/assessment-sessions/${sessionId}/interventions`)).status
    ).toBe(404);
    expect(
      (
        await request(`/api/teacher/assessment-sessions/${sessionId}/interventions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            studentAssessmentId,
            criterionResultId,
            customText: 'unauthorized',
          }),
        })
      ).status
    ).toBe(404);
    expect(
      (
        await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'APPLIED' }),
        })
      ).status
    ).toBe(404);
    expect(
      (
        await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
          method: 'DELETE',
        })
      ).status
    ).toBe(404);
  }, 120_000);

  afterAll(async () => {
    await prisma.diagnosticIntervention.deleteMany({
      where: { id: { in: [interventionId, resourceInterventionId] } },
    });
    await prisma.criterionResult.deleteMany({ where: { id: criterionResultId } });
    await prisma.studentAssessment.deleteMany({ where: { id: studentAssessmentId } });
    await prisma.assessmentSession.deleteMany({ where: { id: sessionId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.studentClass.deleteMany({ where: { id: classId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.user.deleteMany({ where: { id: userBId } });
    await prisma.directorate.deleteMany({ where: { id: directorateId } });
    await prisma.$disconnect();
  });
});
