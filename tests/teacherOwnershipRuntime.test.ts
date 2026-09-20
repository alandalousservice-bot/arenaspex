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
});
