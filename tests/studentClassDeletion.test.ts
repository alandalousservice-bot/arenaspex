import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Prisma } from '@prisma/client';
import {
  deleteOwnedStudentClass,
  StudentClassDeletionError,
} from '../src/services/studentClassDeletion.service';

type FakeOptions = {
  classTeacherId?: string;
  students?: Array<{ id: string; teacherId: string }>;
  protectedCounts?: Partial<
    Record<
      'planned' | 'attendance' | 'weekly' | 'assessment' | 'studentAssessment' | 'exemption',
      number
    >
  >;
};

function fakeTransaction(options: FakeOptions = {}) {
  const deleted: { students?: unknown; class?: unknown } = {};
  const counts = options.protectedCounts || {};
  const tx = {
    studentClass: {
      findUnique: async () =>
        options.classTeacherId === undefined
          ? { id: 'class-a', teacherId: 'teacher-a' }
          : { id: 'class-a', teacherId: options.classTeacherId },
      deleteMany: async (args: unknown) => {
        deleted.class = args;
        return { count: 1 };
      },
    },
    student: {
      findMany: async () => options.students || [],
      deleteMany: async (args: unknown) => {
        deleted.students = args;
        return { count: (options.students || []).length };
      },
    },
    classPlannedSession: { count: async () => counts.planned || 0 },
    studentAttendance: { count: async () => counts.attendance || 0 },
    teacherWeeklySlot: { count: async () => counts.weekly || 0 },
    assessmentSession: { count: async () => counts.assessment || 0 },
    studentAssessment: {
      findMany: async () =>
        Array.from({ length: counts.studentAssessment || 0 }, () => ({ studentId: 'student-a' })),
    },
    medicalExemption: {
      findMany: async () =>
        Array.from({ length: counts.exemption || 0 }, () => ({ studentId: 'student-a' })),
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, deleted };
}

describe('owned StudentClass deletion', () => {
  it('deletes an empty owned class with an owner-scoped mutation', async () => {
    const { tx, deleted } = fakeTransaction();

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' })
    ).resolves.toEqual({
      classId: 'class-a',
      deletedStudents: 0,
    });
    expect(deleted.class).toEqual({ where: { id: 'class-a', teacherId: 'teacher-a' } });
    expect(deleted.students).toBeUndefined();
  });

  it('removes roster-only students in the owned class before deleting the class', async () => {
    const { tx, deleted } = fakeTransaction({
      students: [
        { id: 'student-a', teacherId: 'teacher-a' },
        { id: 'student-b', teacherId: 'teacher-a' },
      ],
    });

    await deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' });

    expect(deleted.students).toEqual({
      where: {
        id: { in: ['student-a', 'student-b'] },
        teacherId: 'teacher-a',
        classId: 'class-a',
      },
    });
  });

  it('rejects a foreign class without any mutation', async () => {
    const { tx, deleted } = fakeTransaction({ classTeacherId: 'teacher-b' });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' })
    ).rejects.toMatchObject({
      code: 'CLASS_NOT_OWNED',
    });
    expect(deleted).toEqual({});
  });

  it('rejects a class with historical data before any delete', async () => {
    const { tx, deleted } = fakeTransaction({
      students: [{ id: 'student-a', teacherId: 'teacher-a' }],
      protectedCounts: { attendance: 1 },
    });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' })
    ).rejects.toMatchObject({
      code: 'CLASS_DELETE_BLOCKED',
      blockers: { attendanceRecords: 1 },
    });
    expect(deleted).toEqual({});
  });

  it.each([
    ['planning', { planned: 2 }, 'plannedSessions'],
    ['attendance', { attendance: 3 }, 'attendanceRecords'],
    ['assessment', { assessment: 4 }, 'assessmentSessions'],
    ['weekly slot', { weekly: 1 }, 'weeklySlots'],
    ['medical exemption', { exemption: 2 }, 'medicalExemptions'],
  ])('returns the exact %s blocker count', async (_label, protectedCounts, field) => {
    const { tx, deleted } = fakeTransaction({
      students: [{ id: 'student-a', teacherId: 'teacher-a' }],
      protectedCounts,
    });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' })
    ).rejects.toMatchObject({
      code: 'CLASS_DELETE_BLOCKED',
      blockers: { [field]: Object.values(protectedCounts)[0] },
    });
    expect(deleted).toEqual({});
  });

  it('returns every non-zero blocker in a mixed dependency response', async () => {
    const { tx } = fakeTransaction({
      students: [{ id: 'student-a', teacherId: 'teacher-a' }],
      protectedCounts: { planned: 2, attendance: 3, assessment: 4, weekly: 1, exemption: 1 },
    });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' })
    ).rejects.toMatchObject({
      code: 'CLASS_DELETE_BLOCKED',
      blockers: {
        plannedSessions: 2,
        attendanceRecords: 3,
        assessmentSessions: 4,
        weeklySlots: 1,
        medicalExemptions: 1,
      },
    });
  });

  it('rejects foreign-owned students without deleting them', async () => {
    const { tx, deleted } = fakeTransaction({
      students: [{ id: 'student-a', teacherId: 'teacher-b' }],
    });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' })
    ).rejects.toBeInstanceOf(StudentClassDeletionError);
    expect(deleted).toEqual({});
  });
});

describe('StudentClass deletion integration contracts', () => {
  it('keeps the route, API client, authoritative refresh, and awaited UI flow aligned', () => {
    const router = readFileSync('src/server/apiRouter.ts', 'utf8');
    const client = readFileSync('src/services/api.ts', 'utf8');
    const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
    const view = readFileSync('src/components/students/StudentsBookView.tsx', 'utf8');

    expect(router).toContain(
      "apiRouter.delete('/students/classes/:classId', requireRole('teacher')"
    );
    expect(router).toContain('deleteOwnedStudentClass(tx,');
    expect(router).toContain('prisma.$transaction(');
    expect(client).toContain('/api/students/classes/${encodeURIComponent(classId)}');
    expect(client).toContain("method: 'DELETE'");
    expect(store).toContain('await deleteStudentClass(classId);');
    expect(store).toContain('await refreshStudentRoster();');
    expect(view).toContain('await onDeleteClass?.(classId);');
    expect(view).toContain('سيتم حذف التلاميذ المسجلين فيه');
    expect(view).toContain('error.blockers.plannedSessions > 0');
    expect(view).toContain('error.blockers.weeklySlots > 0');
    expect(view).toContain("reasons.join('\\n')");
    expect(view).toContain('await onRefreshRoster?.().catch(() => undefined);');
  });
});
