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
    nonWeakCriterion: `${marker}-criterion-nonweak`,
    teacherB: `${marker}-teacher-b`,
    learning: `${marker}-learning`,
    integrative: `${marker}-integrative`,
    summative: `${marker}-summative`,
    learningAssessment: `${marker}-learning-assessment`,
    integrativeAssessment: `${marker}-integrative-assessment`,
    summativeAssessment: `${marker}-summative-assessment`,
  };
  const password = `${marker}-password`;
  let cookie = '';
  let cookieB = '';
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
    const secondCriterion = catalog.criteria.find(
      (item) => item.finalCompetencyId === competency.id && item.id !== criterion.id
    )!;
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
    await prisma.user.create({
      data: {
        id: ids.teacherB,
        username: `${marker}-b`,
        spexId: `${marker}-b`,
        firstName: 'B5',
        lastName: 'Teacher B',
        email: `${marker}-b@local.test`,
        passwordHash: await hashPassword(`${password}-b`),
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
    await prisma.criterionResult.create({
      data: {
        id: ids.nonWeakCriterion,
        studentAssessmentId: ids.assessment,
        criterionId: secondCriterion.id,
        masteryLevel: 'ج',
      },
    });
    for (const [id, type, assessmentId] of [
      [ids.learning, 'LEARNING', ids.learningAssessment],
      [ids.integrative, 'INTEGRATIVE', ids.integrativeAssessment],
      [ids.summative, 'SUMMATIVE', ids.summativeAssessment],
    ] as const) {
      await prisma.assessmentSession.create({
        data: {
          id,
          teacherId: ids.user,
          classId: ids.cls,
          academicYearId: '2026-2027',
          assessmentType: type,
          gradeLevelId: 'lvl_p1',
          domainId: 'f_locomotion',
          finalCompetencyId: competency.id,
          assessedAt: new Date(),
        },
      });
      await prisma.studentAssessment.create({
        data: { id: assessmentId, assessmentSessionId: id, studentId: ids.student },
      });
      await prisma.criterionResult.create({
        data: {
          id: `${assessmentId}-criterion`,
          studentAssessmentId: assessmentId,
          criterionId: criterion.id,
          masteryLevel: 'د',
        },
      });
    }
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `${marker}@local.test`, password, portal: 'professional' }),
    });
    expect(login.status).toBe(200);
    cookie = login.headers.get('set-cookie')!.split(';', 1)[0];
    const loginB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${marker}-b@local.test`,
        password: `${password}-b`,
        portal: 'professional',
      }),
    });
    expect(loginB.status).toBe(200);
    cookieB = loginB.headers.get('set-cookie')!.split(';', 1)[0];
  }, 120_000);
  it('proves weak/non-weak candidates, read-only GETs, non-diagnostic rejection, and mismatches', async () => {
    const before = await prisma.diagnosticIntervention.count();
    const candidates = await request(
      `/api/teacher/assessment-sessions/${ids.session}/remediation-candidates`
    );
    expect(candidates.status).toBe(200);
    const candidatePayload = await candidates.json();
    expect(
      candidatePayload.candidates.some(
        (item: { criterionResultId: string }) => item.criterionResultId === ids.criterion
      )
    ).toBe(true);
    expect(
      candidatePayload.candidates.some(
        (item: { criterionResultId: string }) => item.criterionResultId === ids.nonWeakCriterion
      )
    ).toBe(false);
    expect(
      (
        await request(
          `/api/teacher/assessment-sessions/${ids.session}/remediation-candidates/${ids.criterion}/resources`
        )
      ).status
    ).toBe(200);
    expect(
      (await request(`/api/teacher/assessment-sessions/${ids.session}/interventions`)).status
    ).toBe(200);
    expect(await prisma.diagnosticIntervention.count()).toBe(before);
    const nonWeak = await request(`/api/teacher/assessment-sessions/${ids.session}/interventions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        studentAssessmentId: ids.assessment,
        criterionResultId: ids.nonWeakCriterion,
        customText: 'should reject',
      }),
    });
    expect(nonWeak.status).toBe(400);
    expect(await prisma.diagnosticIntervention.count()).toBe(before);
    for (const sessionId of [ids.learning, ids.integrative, ids.summative]) {
      const bad = await request(`/api/teacher/assessment-sessions/${sessionId}/interventions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentAssessmentId: `${sessionId}-assessment`,
          criterionResultId: `${sessionId}-assessment-criterion`,
          customText: 'should reject',
        }),
      });
      expect(bad.status).toBe(400);
      expect(await prisma.diagnosticIntervention.count()).toBe(before);
    }
    const mismatch = await request(
      `/api/teacher/assessment-sessions/${ids.session}/interventions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentAssessmentId: `${ids.learning}-assessment`,
          criterionResultId: ids.criterion,
          customText: 'should reject',
        }),
      }
    );
    expect(mismatch.status).toBe(400);
    expect(await prisma.diagnosticIntervention.count()).toBe(before);
  }, 120_000);
  it('rejects every Teacher B read/write attack without mutation', async () => {
    const before = await prisma.diagnosticIntervention.count();
    const requestB = async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set('cookie', cookieB);
      return fetch(`${baseUrl}${path}`, { ...init, headers });
    };
    expect(
      (await requestB(`/api/teacher/assessment-sessions/${ids.session}/remediation-candidates`))
        .status
    ).toBe(404);
    expect(
      (
        await requestB(
          `/api/teacher/assessment-sessions/${ids.session}/remediation-candidates/${ids.criterion}/resources`
        )
      ).status
    ).toBe(404);
    expect(
      (await requestB(`/api/teacher/assessment-sessions/${ids.session}/interventions`)).status
    ).toBe(404);
    expect(
      (
        await requestB(`/api/teacher/assessment-sessions/${ids.session}/interventions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            studentAssessmentId: ids.assessment,
            criterionResultId: ids.criterion,
            teacherId: ids.teacherB,
            customText: 'attack',
          }),
        })
      ).status
    ).toBe(404);
    expect(await prisma.diagnosticIntervention.count()).toBe(before);
  }, 120_000);
  it('reconciles rating changes and preserves intervention history', async () => {
    if (!interventionId) {
      const seed = await request(`/api/teacher/assessment-sessions/${ids.session}/interventions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentAssessmentId: ids.assessment,
          criterionResultId: ids.criterion,
          customText: 'B5 reconciliation history',
        }),
      });
      expect(seed.status).toBe(201);
      interventionId = (await seed.json()).intervention.id;
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
    }
    // The route validates the canonical criterion id; use the persisted result's criterion id.
    const row = await prisma.criterionResult.findUnique({ where: { id: ids.criterion } });
    expect(row).toBeTruthy();
    const change = async (masteryLevel: string) =>
      request(
        `/api/teacher/assessment-sessions/${ids.session}/students/${ids.student}/criteria/${row!.criterionId}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ masteryLevel }),
        }
      );
    const higher = await change('ج');
    expect(higher.status).toBe(200);
    const absent = await request(
      `/api/teacher/assessment-sessions/${ids.session}/remediation-candidates`
    );
    expect(
      (await absent.json()).candidates.some(
        (item: { criterionResultId: string }) => item.criterionResultId === ids.criterion
      )
    ).toBe(false);
    expect(
      (await prisma.diagnosticIntervention.findUnique({ where: { id: interventionId } }))?.status
    ).toBe('COMPLETED');
    const weak = await change('د');
    expect(weak.status).toBe(200);
    const present = await request(
      `/api/teacher/assessment-sessions/${ids.session}/remediation-candidates`
    );
    expect(
      (await present.json()).candidates.some(
        (item: { criterionResultId: string }) => item.criterionResultId === ids.criterion
      )
    ).toBe(true);
    expect(
      (await prisma.diagnosticIntervention.findUnique({ where: { id: interventionId } }))?.status
    ).toBe('COMPLETED');
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
    await prisma.diagnosticIntervention.deleteMany({
      where: {
        studentAssessmentId: {
          in: [
            ids.assessment,
            ids.learningAssessment,
            ids.integrativeAssessment,
            ids.summativeAssessment,
          ],
        },
      },
    });
    await prisma.criterionResult.deleteMany({ where: { id: ids.criterion } });
    await prisma.criterionResult.deleteMany({ where: { id: ids.nonWeakCriterion } });
    await prisma.criterionResult.deleteMany({
      where: {
        studentAssessmentId: {
          in: [ids.learningAssessment, ids.integrativeAssessment, ids.summativeAssessment],
        },
      },
    });
    await prisma.studentAssessment.deleteMany({ where: { id: ids.assessment } });
    await prisma.studentAssessment.deleteMany({
      where: {
        id: { in: [ids.learningAssessment, ids.integrativeAssessment, ids.summativeAssessment] },
      },
    });
    await prisma.assessmentSession.deleteMany({ where: { id: ids.session } });
    await prisma.assessmentSession.deleteMany({
      where: { id: { in: [ids.learning, ids.integrative, ids.summative] } },
    });
    await prisma.student.deleteMany({ where: { id: ids.student } });
    await prisma.studentClass.deleteMany({ where: { id: ids.cls } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.user.deleteMany({ where: { id: ids.teacherB } });
    await prisma.$disconnect();
  });
});
