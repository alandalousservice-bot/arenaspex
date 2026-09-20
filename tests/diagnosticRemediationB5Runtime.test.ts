import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';
import { getRegisteredKnowledgeCoreRelease } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';
import { DEFAULT_CANDIDATE_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry.js';

const enabled = process.env.ARENASPEX_TEACHER_G1_E2E === 'true';
const baseUrl = process.env.ARENASPEX_E2E_BASE_URL || 'http://127.0.0.1:3000';
const describeRuntime = enabled ? describe : describe.skip;

describeRuntime('Teacher G2.2-B5 dedicated runtime lifecycle gate', () => {
  const prisma = new PrismaClient();
  const marker = `teacher-g2-2b5-${process.pid}`;
  const ids = {
    user: `${marker}-teacher`,
    cls: `${marker}-class`,
    student: `${marker}-student`,
    session: `${marker}-session`,
    assessment: `${marker}-assessment`,
    criterion: `${marker}-criterion`,
  };
  const password = `${marker}-password`;
  let cookie = '';
  let interventionId = '';
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('cookie', cookie);
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  }
  beforeAll(async () => {
    if (process.env.ARENASPEX_TEACHER_G1_DATABASE !== 'polished-rain-62397371/production/neondb')
      throw new Error('isolated Neon runtime guard failed');
    const catalog = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)!.catalog;
    const competency = catalog.finalCompetencies.find(
      (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_locomotion'
    )!;
    const criterion = catalog.criteria.find((item) => item.finalCompetencyId === competency.id)!;
    await prisma.user.create({
      data: {
        id: ids.user,
        username: marker,
        spexId: marker,
        firstName: 'B5',
        lastName: 'Teacher',
        email: `${marker}@local.test`,
        passwordHash: await hashPassword(password),
        role: 'teacher',
        directorateId: '',
        districtId: '',
        status: 'active',
        isApprovedByAdmin: true,
      },
    });
    await prisma.studentClass.create({
      data: { id: ids.cls, teacherId: ids.user, levelId: 'lvl_p1', name: marker },
    });
    await prisma.student.create({
      data: {
        id: ids.student,
        teacherId: ids.user,
        classId: ids.cls,
        matricule: marker,
        firstName: 'B5',
        lastName: 'Student',
        grade: 1,
        schoolYear: '2026-2027',
      },
    });
    await prisma.assessmentSession.create({
      data: {
        id: ids.session,
        teacherId: ids.user,
        classId: ids.cls,
        academicYearId: '2026-2027',
        assessmentType: 'DIAGNOSTIC',
        gradeLevelId: 'lvl_p1',
        domainId: 'f_locomotion',
        finalCompetencyId: competency.id,
        assessedAt: new Date(),
      },
    });
    await prisma.studentAssessment.create({
      data: { id: ids.assessment, assessmentSessionId: ids.session, studentId: ids.student },
    });
    await prisma.criterionResult.create({
      data: {
        id: ids.criterion,
        studentAssessmentId: ids.assessment,
        criterionId: criterion.id,
        masteryLevel: 'د',
      },
    });
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `${marker}@local.test`, password, portal: 'professional' }),
    });
    expect(login.status).toBe(200);
    cookie = login.headers.get('set-cookie')!.split(';', 1)[0];
  }, 120_000);
  it('rejects terminal reversals without changing history', async () => {
    const created = await request(`/api/teacher/assessment-sessions/${ids.session}/interventions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        studentAssessmentId: ids.assessment,
        criterionResultId: ids.criterion,
        customText: 'B5 runtime intervention',
      }),
    });
    expect(created.status).toBe(201);
    interventionId = (await created.json()).intervention.id;
    expect(
      (
        await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'APPLIED' }),
        })
      ).status
    ).toBe(200);
    expect(
      (
        await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        })
      ).status
    ).toBe(200);
    for (const status of ['SELECTED', 'APPLIED']) {
      expect(
        (
          await request(`/api/teacher/diagnostic-interventions/${interventionId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status }),
          })
        ).status
      ).toBe(400);
    }
    expect(
      (await prisma.diagnosticIntervention.findUnique({ where: { id: interventionId } }))?.status
    ).toBe('COMPLETED');
  }, 120_000);
  afterAll(async () => {
    await prisma.diagnosticIntervention.deleteMany({ where: { id: interventionId } });
    await prisma.criterionResult.deleteMany({ where: { id: ids.criterion } });
    await prisma.studentAssessment.deleteMany({ where: { id: ids.assessment } });
    await prisma.assessmentSession.deleteMany({ where: { id: ids.session } });
    await prisma.student.deleteMany({ where: { id: ids.student } });
    await prisma.studentClass.deleteMany({ where: { id: ids.cls } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.$disconnect();
  });
});
