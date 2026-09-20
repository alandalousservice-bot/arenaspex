import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth.js';

const enabled = process.env.ARENASPEX_TEACHER_G1_E2E === 'true';
const baseUrl = process.env.ARENASPEX_E2E_BASE_URL || 'http://127.0.0.1:4173';
const marker = `teacher-g1-1a-${process.pid}`;
const emailA = `${marker}-a@local.test`;
const emailB = `${marker}-b@local.test`;
const directorateId = `${marker}-directorate`;
const notificationId = `${marker}-notification`;
const classAId = `${marker}-class-a`;
const classBId = `${marker}-class-b`;
const studentAId = `${marker}-student-a`;
const studentBId = `${marker}-student-b`;
const academicYearId = '2026-2027';
const attendanceDate = '2026-09-20';
const slotAId = `${marker}-slot-a`;
const slotBId = `${marker}-slot-b`;
const extraSlotIds = [1, 2, 3, 4].flatMap((day) => [
  `${marker}-slot-a-${day}`,
  `${marker}-slot-b-${day}`,
]);
const standaloneMemoId = `${marker}-standalone-memo`;
const scheduledMemoId = `${marker}-scheduled-memo`;
const municipalityId = `${marker}-municipality`;
const schoolId = `${marker}-school`;
const assessmentSessionAId = `${marker}-assessment-a`;
const assessmentSessionBId = `${marker}-assessment-b`;
const foreignRosterClassId = `${marker}-foreign-roster-class`;
const foreignLessonBatchId = `${marker}-foreign-lesson-batch`;
const foreignNotebookBatchId = `${marker}-foreign-notebook-batch`;

type Session = { cookie: string };

function assertIsolatedTestDatabase(): void {
  if (!enabled) throw new Error('ARENASPEX_TEACHER_G1_E2E=true is required');
  const raw = process.env.DATABASE_URL || '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is missing or invalid');
  }
  if (
    url.protocol !== 'postgresql:' ||
    url.hostname.includes('pooler') ||
    !url.hostname.endsWith('.neon.tech') ||
    url.hostname.includes('localhost') ||
    url.hostname.includes('127.0.0.1') ||
    url.pathname !== '/neondb' ||
    process.env.ARENASPEX_TEACHER_G1_DATABASE !== 'polished-rain-62397371/production/neondb'
  ) {
    throw new Error('isolated Neon test database assertion failed');
  }
}

function cookieFrom(response: Response): string {
  const value = response.headers.get('set-cookie');
  if (!value) throw new Error('login did not return a session cookie');
  return value.split(';', 1)[0];
}

async function request(session: Session | null, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (session) headers.set('cookie', session.cookie);
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

async function login(email: string, password: string): Promise<Session> {
  const response = await request(null, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, portal: 'professional' }),
  });
  expect(response.status).toBe(200);
  return { cookie: cookieFrom(response) };
}

describe('Teacher G1.1-A runtime ownership harness', () => {
  const prisma = new PrismaClient();
  const passwordA = `${marker}-password-a`;
  const passwordB = `${marker}-password-b`;
  let teacherAId = '';
  let teacherBId = '';
  let situationARecordId = '';
  let situationBRecordId = '';
  let sessionA: Session;
  let sessionB: Session;

  beforeAll(async () => {
    assertIsolatedTestDatabase();
    await prisma.directorate.upsert({
      where: { id: directorateId },
      update: {},
      create: { id: directorateId, name: `${marker} Directorate`, wilayaCode: 'QA' },
    });
    const passwordHashA = await hashPassword(passwordA);
    const passwordHashB = await hashPassword(passwordB);
    const common = {
      role: 'teacher',
      directorateId,
      districtId: '',
      status: 'active',
      isApprovedByAdmin: true,
      specialization: 'QA',
    };
    const a = await prisma.user.create({
      data: {
        ...common,
        id: `${marker}-a`,
        username: `${marker}-a`,
        spexId: `${marker}-spex-a`,
        firstName: 'QA',
        lastName: 'Teacher A',
        email: emailA,
        passwordHash: passwordHashA,
      },
    });
    const b = await prisma.user.create({
      data: {
        ...common,
        id: `${marker}-b`,
        username: `${marker}-b`,
        spexId: `${marker}-spex-b`,
        firstName: 'QA',
        lastName: 'Teacher B',
        email: emailB,
        passwordHash: passwordHashB,
      },
    });
    teacherAId = a.id;
    teacherBId = b.id;
    await prisma.studentClass.createMany({
      data: [
        { id: classAId, teacherId: teacherAId, levelId: 'lvl_p1', name: `${marker} Class A` },
        { id: classBId, teacherId: teacherBId, levelId: 'lvl_p1', name: `${marker} Class B` },
      ],
    });
    await prisma.student.createMany({
      data: [
        {
          id: studentAId,
          teacherId: teacherAId,
          classId: classAId,
          matricule: `${marker}-mat-a`,
          firstName: 'QA',
          lastName: 'Student A',
          grade: 1,
          schoolYear: academicYearId,
        },
        {
          id: studentBId,
          teacherId: teacherBId,
          classId: classBId,
          matricule: `${marker}-mat-b`,
          firstName: 'QA',
          lastName: 'Student B',
          grade: 1,
          schoolYear: academicYearId,
        },
      ],
    });
    await prisma.teacherWeeklySlot.createMany({
      data: [
        {
          id: slotAId,
          teacherId: teacherAId,
          classId: classAId,
          academicYearId,
          weekday: 0,
          startTime: '08:00',
          endTime: '08:45',
        },
        {
          id: slotBId,
          teacherId: teacherBId,
          classId: classBId,
          academicYearId,
          weekday: 0,
          startTime: '09:00',
          endTime: '09:45',
        },
        ...[1, 2, 3, 4].flatMap((weekday) => [
          {
            id: `${marker}-slot-a-${weekday}`,
            teacherId: teacherAId,
            classId: classAId,
            academicYearId,
            weekday,
            startTime: '08:00',
            endTime: '08:45',
          },
          {
            id: `${marker}-slot-b-${weekday}`,
            teacherId: teacherBId,
            classId: classBId,
            academicYearId,
            weekday,
            startTime: '09:00',
            endTime: '09:45',
          },
        ]),
      ],
    });
    await prisma.municipality.create({
      data: { id: municipalityId, name: `${marker} Municipality`, directorateId },
    });
    await prisma.school.create({
      data: { id: schoolId, name: `${marker} School`, municipalityId },
    });
    await prisma.communityNotification.create({
      data: {
        id: notificationId,
        userId: teacherAId,
        senderId: teacherBId,
        type: 'qa',
        title: 'QA notification',
        message: marker,
        read: false,
        data: { marker },
      },
    });
    sessionA = await login(emailA, passwordA);
    sessionB = await login(emailB, passwordB);
  }, 30000);

  afterAll(async () => {
    try {
      await prisma.communityNotification.deleteMany({ where: { id: notificationId } });
      await prisma.directMessage.deleteMany({ where: { content: marker } });
      await prisma.medicalExemption.deleteMany({
        where: { studentId: { in: [studentAId, studentBId] } },
      });
      await prisma.studentAttendance.deleteMany({
        where: { studentId: { in: [studentAId, studentBId] } },
      });
      await prisma.lessonPlan.deleteMany({
        where: { id: { in: [standaloneMemoId, scheduledMemoId] } },
      });
      await prisma.classPlannedSession.deleteMany({
        where: { classId: { in: [classAId, classBId] } },
      });
      await prisma.annualPlan.deleteMany({
        where: { teacherId: { in: [teacherAId, teacherBId] }, academicYearId },
      });
      await prisma.teacherWeeklySlot.deleteMany({
        where: { id: { in: [slotAId, slotBId, ...extraSlotIds] } },
      });
      await prisma.educationalSituation.deleteMany({
        where: { id: { in: [situationARecordId, situationBRecordId].filter(Boolean) } },
      });
      await prisma.assessmentSession.deleteMany({
        where: { id: { in: [assessmentSessionAId, assessmentSessionBId] } },
      });
      await prisma.lessonPlan.deleteMany({ where: { id: foreignLessonBatchId } });
      await prisma.notebookEntry.deleteMany({ where: { id: foreignNotebookBatchId } });
      await prisma.studentClass.deleteMany({ where: { id: foreignRosterClassId } });
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.municipality.deleteMany({ where: { id: municipalityId } });
      await prisma.student.deleteMany({ where: { id: { in: [studentAId, studentBId] } } });
      await prisma.studentClass.deleteMany({ where: { id: { in: [classAId, classBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [teacherAId, teacherBId] } } });
      await prisma.directorate.deleteMany({ where: { id: directorateId } });
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it('authenticates two independent teachers and rejects unauthenticated /me', async () => {
    const [meA, meB, anonymous] = await Promise.all([
      request(sessionA, '/api/auth/me'),
      request(sessionB, '/api/auth/me'),
      request(null, '/api/auth/me'),
    ]);
    expect(meA.status).toBe(200);
    expect(meB.status).toBe(200);
    expect(anonymous.status).toBe(401);
    const [bodyA, bodyB] = await Promise.all([meA.json(), meB.json()]);
    expect(bodyA.user.id).toBe(teacherAId);
    expect(bodyB.user.id).toBe(teacherBId);
    expect(bodyA.user.id).not.toBe(bodyB.user.id);
  });

  it('isolates notifications by authenticated recipient', async () => {
    const foreign = await request(
      sessionB,
      `/api/communication/notifications/${notificationId}/read`,
      {
        method: 'POST',
      }
    );
    expect(foreign.status).toBe(404);
    const own = await request(sessionA, `/api/communication/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    expect(own.status).toBe(200);
    const row = await prisma.communityNotification.findUniqueOrThrow({
      where: { id: notificationId },
    });
    expect(row.userId).toBe(teacherAId);
    expect(row.read).toBe(true);
  });

  it('persists direct-message sender from the authenticated session', async () => {
    const response = await request(sessionB, '/api/communication/direct-messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        recipientId: teacherAId,
        senderId: teacherAId,
        authorId: teacherAId,
        userId: teacherAId,
        text: marker,
      }),
    });
    expect(response.status).toBe(201);
    const message = await prisma.directMessage.findFirstOrThrow({
      where: { content: marker },
      orderBy: { createdAt: 'desc' },
    });
    expect(message.senderId).toBe(teacherBId);
    expect(message.senderId).not.toBe(teacherAId);
  });

  it('enforces attendance ownership for reads, writes, and persisted records', async () => {
    const ownWrite = await request(sessionA, '/api/teacher/attendance', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classId: classAId,
        academicYearId,
        date: attendanceDate,
        records: [{ studentId: studentAId, status: 'حاضر', note: marker }],
      }),
    });
    expect(ownWrite.status).toBe(200);
    const ownRead = await request(
      sessionA,
      `/api/teacher/attendance?classId=${classAId}&academicYearId=${academicYearId}&date=${attendanceDate}`
    );
    expect(ownRead.status).toBe(200);
    const foreignRead = await request(
      sessionB,
      `/api/teacher/attendance?classId=${classAId}&academicYearId=${academicYearId}&date=${attendanceDate}`
    );
    expect(foreignRead.status).toBe(404);
    const foreignWrite = await request(sessionB, '/api/teacher/attendance', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classId: classAId,
        academicYearId,
        date: attendanceDate,
        records: [{ studentId: studentAId, status: 'غائب' }],
      }),
    });
    expect(foreignWrite.status).toBe(404);
    const row = await prisma.studentAttendance.findFirstOrThrow({
      where: { studentId: studentAId, classId: classAId, academicYearId },
    });
    expect({
      teacherId: row.teacherId,
      classId: row.classId,
      studentId: row.studentId,
      status: row.status,
    }).toEqual({ teacherId: teacherAId, classId: classAId, studentId: studentAId, status: 'حاضر' });
    expect(
      await prisma.studentAttendance.count({
        where: { teacherId: teacherBId, classId: classAId, studentId: studentAId },
      })
    ).toBe(0);
  }, 30000);

  it('enforces MedicalExemption ownership for read, create, update, and delete', async () => {
    const ownCreate = await request(sessionA, `/api/teacher/classes/${classAId}/exemptions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        studentId: studentAId,
        issuedOn: attendanceDate,
        expiresOn: '2026-09-30',
        reason: marker,
        note: marker,
      }),
    });
    expect(ownCreate.status).toBe(201);
    const created = await ownCreate.json();
    const exemptionId = created.exemption.id as string;
    const ownRead = await request(sessionA, `/api/teacher/classes/${classAId}/exemptions`);
    expect(ownRead.status).toBe(200);
    const foreignRead = await request(sessionB, `/api/teacher/classes/${classAId}/exemptions`);
    expect(foreignRead.status).toBe(404);
    const foreignCreate = await request(sessionB, `/api/teacher/classes/${classAId}/exemptions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: studentAId, issuedOn: attendanceDate, reason: marker }),
    });
    expect(foreignCreate.status).toBe(404);
    const foreignUpdate = await request(sessionB, `/api/teacher/exemptions/${exemptionId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: 'foreign' }),
    });
    expect(foreignUpdate.status).toBe(404);
    const foreignDelete = await request(sessionB, `/api/teacher/exemptions/${exemptionId}`, {
      method: 'DELETE',
    });
    expect(foreignDelete.status).toBe(404);
    const row = await prisma.medicalExemption.findUniqueOrThrow({ where: { id: exemptionId } });
    expect({
      teacherId: row.teacherId,
      studentId: row.studentId,
      reason: row.reason,
      note: row.note,
    }).toEqual({ teacherId: teacherAId, studentId: studentAId, reason: marker, note: marker });
    const ownDelete = await request(sessionA, `/api/teacher/exemptions/${exemptionId}`, {
      method: 'DELETE',
    });
    expect(ownDelete.status).toBe(200);
    expect(await prisma.medicalExemption.findUnique({ where: { id: exemptionId } })).toBeNull();
  }, 30000);

  it('enforces planning, CPS, scheduled memo, and standalone memo ownership', async () => {
    const planningPayload = { academicYearId, planningStartDate: '2026-09-21' };
    const initA = await request(sessionA, '/api/teacher/planning/annual-distribution/initialize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(planningPayload),
    });
    if (initA.status !== 201)
      throw new Error(
        `annual init A failed: ${initA.status} ${(await initA.text()).slice(0, 300)}`
      );
    const initB = await request(sessionB, '/api/teacher/planning/annual-distribution/initialize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(planningPayload),
    });
    if (initB.status !== 201)
      throw new Error(
        `annual init B failed: ${initB.status} ${(await initB.text()).slice(0, 300)}`
      );
    const [plansA, plansB] = await Promise.all([
      prisma.annualPlan.findMany({
        where: { teacherId: teacherAId, academicYearId, kind: 'annual_distribution' },
      }),
      prisma.annualPlan.findMany({
        where: { teacherId: teacherBId, academicYearId, kind: 'annual_distribution' },
      }),
    ]);
    expect(plansA.length).toBeGreaterThan(0);
    expect(plansB.length).toBeGreaterThan(0);
    expect(plansA.every((row) => row.teacherId === teacherAId)).toBe(true);
    expect(plansB.every((row) => row.teacherId === teacherBId)).toBe(true);
    const classInitA = await request(
      sessionA,
      `/api/teacher/planning/classes/${classAId}/sessions/initialize`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(planningPayload),
      }
    );
    if (classInitA.status !== 201)
      throw new Error(
        `class init failed: ${classInitA.status} ${(await classInitA.text()).slice(0, 500)}`
      );

    const ownDistribution = await request(
      sessionA,
      `/api/teacher/planning/annual-distribution?academicYearId=${academicYearId}`
    );
    expect(ownDistribution.status).toBe(200);
    const foreignDistribution = await request(
      sessionB,
      `/api/teacher/planning/annual-distribution?academicYearId=${academicYearId}&classId=${classAId}`
    );
    expect(foreignDistribution.status).toBe(404);
    const ownSessions = await request(
      sessionA,
      `/api/teacher/planning/classes/${classAId}/sessions?academicYearId=${academicYearId}`
    );
    expect(ownSessions.status).toBe(200);
    const ownSessionsBody = await ownSessions.json();
    const sessionId = ownSessionsBody.sessions?.[0]?.id as string | undefined;
    if (!sessionId)
      throw new Error(`no CPS sessions: ${JSON.stringify(ownSessionsBody).slice(0, 1000)}`);
    const foreignSessions = await request(
      sessionB,
      `/api/teacher/planning/classes/${classAId}/sessions?academicYearId=${academicYearId}`
    );
    expect(foreignSessions.status).toBe(404);
    const foreignSessionUpdate = await request(
      sessionB,
      `/api/teacher/planning/classes/${classAId}/sessions/${sessionId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationalNote: 'foreign' }),
      }
    );
    expect(foreignSessionUpdate.status).toBe(404);
    const beforeSession = await prisma.classPlannedSession.findUniqueOrThrow({
      where: { id: sessionId! },
    });
    expect({ teacherId: beforeSession.teacherId, classId: beforeSession.classId }).toEqual({
      teacherId: teacherAId,
      classId: classAId,
    });

    const scheduledGenerate = await request(sessionA, '/api/teacher/lesson-memos/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ classPlannedSessionId: sessionId }),
    });
    expect([200, 409]).toContain(scheduledGenerate.status);
    const foreignGenerate = await request(sessionB, '/api/teacher/lesson-memos/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ classPlannedSessionId: sessionId }),
    });
    expect(foreignGenerate.status).toBe(404);
    const scheduledSave = await request(sessionA, '/api/db/lesson-plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonPlan: {
          id: scheduledMemoId,
          memoSource: 'operational',
          classId: classAId,
          academicYearId,
          classPlannedSessionId: sessionId,
          title: marker,
        },
      }),
    });
    expect(scheduledSave.status).toBe(200);
    const foreignScheduledSave = await request(sessionB, '/api/db/lesson-plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonPlan: {
          id: `${marker}-foreign-scheduled`,
          memoSource: 'operational',
          classId: classAId,
          academicYearId,
          classPlannedSessionId: sessionId,
          title: 'foreign',
        },
      }),
    });
    expect(foreignScheduledSave.status).toBe(403);
    const ownStandalone = await request(sessionA, '/api/db/lesson-plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonPlan: { id: standaloneMemoId, memoSource: 'standalone', title: marker },
      }),
    });
    expect(ownStandalone.status).toBe(200);
    const ownList = await request(sessionA, '/api/db/lesson-plans');
    expect(ownList.status).toBe(200);
    const ownListBody = await ownList.json();
    expect(
      ownListBody.lessonPlans.some((item: { id: string }) => item.id === standaloneMemoId)
    ).toBe(true);
    const foreignList = await request(sessionB, '/api/db/lesson-plans');
    expect(foreignList.status).toBe(200);
    const foreignListBody = await foreignList.json();
    expect(
      foreignListBody.lessonPlans.some((item: { id: string }) => item.id === standaloneMemoId)
    ).toBe(false);
    const foreignStandaloneUpdate = await request(sessionB, '/api/db/lesson-plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonPlan: { id: standaloneMemoId, memoSource: 'standalone', title: 'foreign-update' },
      }),
    });
    expect(foreignStandaloneUpdate.status).toBe(403);
    const standaloneRow = await prisma.lessonPlan.findUniqueOrThrow({
      where: { id: standaloneMemoId },
    });
    expect({
      ownerId: standaloneRow.ownerId,
      title: (standaloneRow.data as { title?: string }).title,
    }).toEqual({ ownerId: teacherAId, title: marker });
  }, 60000);

  it('enforces assessment, private situation, and professional profile ownership', async () => {
    const catalogResponse = await request(
      sessionA,
      '/api/teacher/assessment-catalog?gradeLevelId=lvl_p1&domainId=f_fundamentals&finalCompetencyId=fc_lvl_p1_f_fundamentals'
    );
    expect(catalogResponse.status).toBe(200);
    const catalog = await catalogResponse.json();
    const criterionId = catalog.criteria?.[0]?.id as string | undefined;
    expect(criterionId).toBeTruthy();

    const assessmentPayload = {
      id: assessmentSessionAId,
      classId: classAId,
      academicYearId,
      assessmentType: 'DIAGNOSTIC',
      gradeLevelId: 'lvl_p1',
      domainId: 'f_fundamentals',
      finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
      title: marker,
      assessedAt: '2026-09-20T00:00:00.000Z',
    };
    const createAssessment = await request(sessionA, '/api/teacher/assessment-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(assessmentPayload),
    });
    expect(createAssessment.status).toBe(201);
    const createAssessmentB = await request(sessionB, '/api/teacher/assessment-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...assessmentPayload, id: assessmentSessionBId, classId: classBId }),
    });
    expect(createAssessmentB.status).toBe(201);
    const ownResult = await request(
      sessionA,
      `/api/teacher/assessment-sessions/${assessmentSessionAId}/students/${studentAId}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ numericMark: 8, note: marker }),
      }
    );
    expect(ownResult.status).toBe(200);
    const ownCriterion = await request(
      sessionA,
      `/api/teacher/assessment-sessions/${assessmentSessionAId}/students/${studentAId}/criteria/${criterionId}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ masteryLevel: 'ب', note: marker }),
      }
    );
    expect(ownCriterion.status).toBe(200);
    const foreignAssessmentRead = await request(
      sessionB,
      `/api/teacher/assessment-sessions/${assessmentSessionAId}`
    );
    expect(foreignAssessmentRead.status).toBe(404);
    const foreignResultUpdate = await request(
      sessionB,
      `/api/teacher/assessment-sessions/${assessmentSessionAId}/students/${studentAId}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ numericMark: 1 }),
      }
    );
    expect(foreignResultUpdate.status).toBe(404);
    const foreignCriterionUpdate = await request(
      sessionB,
      `/api/teacher/assessment-sessions/${assessmentSessionAId}/students/${studentAId}/criteria/${criterionId}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ masteryLevel: 'د' }),
      }
    );
    expect(foreignCriterionUpdate.status).toBe(404);
    const foreignClassCreate = await request(sessionB, '/api/teacher/assessment-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...assessmentPayload,
        id: `${marker}-assessment-foreign-class`,
        classId: classAId,
      }),
    });
    expect(foreignClassCreate.status).toBe(404);
    const foreignStudentCreate = await request(
      sessionB,
      `/api/teacher/assessment-sessions/${assessmentSessionBId}/students/${studentAId}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ numericMark: 2 }),
      }
    );
    expect(foreignStudentCreate.status).toBe(403);
    const assessmentRow = await prisma.assessmentSession.findUniqueOrThrow({
      where: { id: assessmentSessionAId },
    });
    const resultRow = await prisma.studentAssessment.findUniqueOrThrow({
      where: {
        assessmentSessionId_studentId: {
          assessmentSessionId: assessmentSessionAId,
          studentId: studentAId,
        },
      },
    });
    const criterionRow = await prisma.criterionResult.findUniqueOrThrow({
      where: {
        studentAssessmentId_criterionId: {
          studentAssessmentId: resultRow.id,
          criterionId: criterionId!,
        },
      },
    });
    expect({
      teacherId: assessmentRow.teacherId,
      classId: assessmentRow.classId,
      studentId: resultRow.studentId,
      numericMark: resultRow.numericMark,
      masteryLevel: criterionRow.masteryLevel,
    }).toEqual({
      teacherId: teacherAId,
      classId: classAId,
      studentId: studentAId,
      numericMark: 8,
      masteryLevel: 'ب',
    });

    const situationInput = {
      name: `${marker} situation`,
      grade: 1,
      fieldId: 'f_fundamentals',
      fieldName: 'المهارات الأساسية',
      objectiveIds: [],
      objectiveTexts: [],
      sourceGoal: marker,
      organization: 'QA',
      equipment: ['كرة'],
      executionConditions: marker,
      successCriteria: marker,
      observationIndicators: marker,
      motorActions: ['qa'],
    };
    const createSituationA = await request(sessionA, '/api/educational-situations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(situationInput),
    });
    expect(createSituationA.status).toBe(201);
    const situationA = (await createSituationA.json()).situation;
    const situationBResponse = await request(sessionB, '/api/educational-situations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...situationInput, name: `${marker} situation B` }),
    });
    expect(situationBResponse.status).toBe(201);
    const situationB = (await situationBResponse.json()).situation;
    situationARecordId = situationA.id;
    situationBRecordId = situationB.id;
    const situationList = await request(sessionB, '/api/educational-situations');
    expect(situationList.status).toBe(200);
    const situationListBody = await situationList.json();
    expect(
      situationListBody.situations.some((row: { id: string }) => row.id === situationA.id)
    ).toBe(false);
    const foreignSituationUpdate = await request(
      sessionB,
      `/api/educational-situations/${situationA.id}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...situationInput, name: 'foreign update' }),
      }
    );
    expect(foreignSituationUpdate.status).toBe(403);
    const foreignSituationDelete = await request(
      sessionB,
      `/api/educational-situations/${situationA.id}`,
      { method: 'DELETE' }
    );
    expect(foreignSituationDelete.status).toBe(403);
    const situationRow = await prisma.educationalSituation.findUniqueOrThrow({
      where: { id: situationA.id },
    });
    expect({
      ownerId: situationRow.ownerId,
      status: situationRow.status,
      name: situationRow.name,
    }).toEqual({ ownerId: teacherAId, status: 'PRIVATE', name: `${marker} situation` });

    const profilePayload = {
      directorateId,
      municipalityId,
      institutionId: schoolId,
      firstName: 'QA-A-Updated',
      lastName: 'Teacher A',
    };
    const ownProfile = await request(sessionA, '/api/teacher/professional-data', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profilePayload),
    });
    expect(ownProfile.status).toBe(200);
    const foreignProfile = await request(sessionB, '/api/teacher/professional-data', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...profilePayload, userId: teacherAId, firstName: 'HACKED' }),
    });
    expect(foreignProfile.status).toBe(200);
    const [profileA, profileB] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: teacherAId } }),
      prisma.user.findUniqueOrThrow({ where: { id: teacherBId } }),
    ]);
    expect(profileA.firstName).toBe('QA-A-Updated');
    expect(profileB.firstName).toBe('HACKED');
    expect(profileA.id).not.toBe(profileB.id);

    const foreignRosterImport = await request(sessionB, '/api/students/import/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classId: classAId,
        className: 'QA Class A',
        levelId: 'lvl_p1',
        grade: 1,
        rows: [
          {
            rowNumber: 2,
            firstName: 'QA',
            lastName: 'Foreign',
            matricule: '990001',
            schoolYear: academicYearId,
          },
        ],
      }),
    });
    expect(foreignRosterImport.status).toBe(403);
    expect(
      await prisma.student.findFirst({ where: { matricule: '990001', teacherId: teacherBId } })
    ).toBeNull();
    const foreignLessonBatch = await request(sessionB, '/api/db/lesson-plans/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonPlans: [
          {
            id: foreignLessonBatchId,
            memoSource: 'operational',
            classId: classAId,
            academicYearId,
            classPlannedSessionId: (
              await prisma.classPlannedSession.findFirstOrThrow({
                where: { classId: classAId, teacherId: teacherAId, academicYearId },
              })
            ).id,
            title: 'foreign batch',
          },
        ],
      }),
    });
    expect(foreignLessonBatch.status).toBe(200);
    expect(await prisma.lessonPlan.findUnique({ where: { id: foreignLessonBatchId } })).toBeNull();
    const foreignNotebookBatch = await request(sessionB, '/api/db/notebook/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dailyNotebook: [
          {
            id: foreignNotebookBatchId,
            classId: classAId,
            academicYearId,
            classPlannedSessionId: (
              await prisma.classPlannedSession.findFirstOrThrow({
                where: { classId: classAId, teacherId: teacherAId, academicYearId },
              })
            ).id,
            note: 'foreign batch',
          },
        ],
      }),
    });
    expect(foreignNotebookBatch.status).toBe(200);
    expect(
      await prisma.notebookEntry.findUnique({ where: { id: foreignNotebookBatchId } })
    ).toBeNull();
  }, 60000);
});
