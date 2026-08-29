import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Prisma } from '@prisma/client';
import {
  deleteOwnedStudentClass,
  StudentClassDeletionError,
} from '../src/services/studentClassDeletion.service';

type FakeOptions = {
  classId?: string;
  classTeacherId?: string;
  students?: Array<{ id: string; teacherId: string }>;
  medicalExemptionTeacherId?: string;
  protectedCounts?: Partial<
    Record<
      | 'planned'
      | 'attendance'
      | 'weekly'
      | 'assessment'
      | 'studentAssessment'
      | 'criterionResults'
      | 'exemption',
      number
    >
  >;
};

function fakeTransaction(options: FakeOptions = {}) {
  const deleted: Record<string, unknown> = {};
  const counts = options.protectedCounts || {};
  const tx = {
    studentClass: {
      findUnique: async () =>
        options.classTeacherId === undefined
          ? { id: options.classId || 'class-a', teacherId: 'teacher-a' }
          : { id: options.classId || 'class-a', teacherId: options.classTeacherId },
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
    classPlannedSession: {
      count: async ({ where }: { where?: { teacherId?: { not?: string } } }) =>
        where?.teacherId?.not ? 0 : counts.planned || 0,
      deleteMany: async (args: unknown) => {
        deleted.plannedSessions = args;
        return { count: counts.planned || 0 };
      },
    },
    studentAttendance: {
      count: async ({ where }: { where?: { teacherId?: { not?: string } } }) =>
        where?.teacherId?.not ? 0 : counts.attendance || 0,
      deleteMany: async (args: unknown) => {
        deleted.attendanceRecords = args;
        return { count: counts.attendance || 0 };
      },
    },
    teacherWeeklySlot: {
      count: async ({ where }: { where?: { teacherId?: { not?: string } } }) =>
        where?.teacherId?.not ? 0 : counts.weekly || 0,
      deleteMany: async (args: unknown) => {
        deleted.weeklySlots = args;
        return { count: counts.weekly || 0 };
      },
    },
    assessmentSession: {
      findMany: async () =>
        Array.from({ length: counts.assessment || 0 }, (_, index) => ({
          id: `assessment-${index}`,
          teacherId: 'teacher-a',
        })),
      count: async ({ where }: { where?: { teacherId?: { not?: string } } }) =>
        where?.teacherId?.not ? 0 : counts.assessment || 0,
      deleteMany: async (args: unknown) => {
        deleted.assessmentSessions = args;
        return { count: counts.assessment || 0 };
      },
    },
    criterionResult: {
      count: async () => counts.criterionResults || 0,
      deleteMany: async (args: unknown) => {
        deleted.criterionResults = args;
        return { count: counts.criterionResults || 0 };
      },
    },
    studentAssessment: {
      findMany: async () =>
        Array.from({ length: counts.studentAssessment || 0 }, (_, index) => ({
          id: `student-assessment-${index}`,
          studentId: 'student-a',
        })),
      deleteMany: async (args: unknown) => {
        deleted.studentAssessments = args;
        return { count: counts.studentAssessment || 0 };
      },
    },
    medicalExemption: {
      findMany: async () =>
        Array.from({ length: counts.exemption || 0 }, (_, index) => ({
          id: `exemption-${index}`,
          studentId: 'student-a',
          teacherId: options.medicalExemptionTeacherId || 'teacher-a',
        })),
      count: async () =>
        options.medicalExemptionTeacherId && options.medicalExemptionTeacherId !== 'teacher-a'
          ? counts.exemption || 0
          : 0,
      deleteMany: async (args: unknown) => {
        deleted.medicalExemptions = args;
        return { count: counts.exemption || 0 };
      },
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

  it('force-deletes an empty class with class-scoped dependencies', async () => {
    const { tx, deleted } = fakeTransaction({ protectedCounts: { planned: 2, weekly: 1 } });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' }, { force: true })
    ).resolves.toMatchObject({
      deleted: true,
      classId: 'class-a',
      deletedCounts: { plannedSessions: 2, weeklySlots: 1, students: 0 },
    });
    expect(deleted.class).toEqual({ where: { id: 'class-a', teacherId: 'teacher-a' } });
  });

  it('force-deletes two empty blocked classes independently', async () => {
    const first = fakeTransaction({ classId: 'class-a', protectedCounts: { planned: 1 } });
    const second = fakeTransaction({ classId: 'class-b', protectedCounts: { planned: 2 } });

    await Promise.all([
      deleteOwnedStudentClass(
        first.tx,
        { classId: 'class-a', ownerId: 'teacher-a' },
        { force: true }
      ),
      deleteOwnedStudentClass(
        second.tx,
        { classId: 'class-b', ownerId: 'teacher-a' },
        { force: true }
      ),
    ]);

    expect(first.deleted.class).toEqual({ where: { id: 'class-a', teacherId: 'teacher-a' } });
    expect(second.deleted.class).toEqual({ where: { id: 'class-b', teacherId: 'teacher-a' } });
  });

  it('force-deletes mixed target-class history without affecting the owner scope', async () => {
    const { tx, deleted } = fakeTransaction({
      students: [{ id: 'student-a', teacherId: 'teacher-a' }],
      protectedCounts: {
        planned: 2,
        attendance: 3,
        weekly: 1,
        assessment: 4,
        studentAssessment: 4,
        criterionResults: 4,
        exemption: 1,
      },
    });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' }, { force: true })
    ).resolves.toMatchObject({
      deleted: true,
      deletedCounts: {
        students: 1,
        plannedSessions: 2,
        attendanceRecords: 3,
        assessmentSessions: 4,
        weeklySlots: 1,
        medicalExemptions: 1,
        studentAssessments: 4,
        criterionResults: 4,
      },
    });
    expect(deleted.students).toMatchObject({
      where: { id: { in: ['student-a'] }, teacherId: 'teacher-a', classId: 'class-a' },
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

  it('rejects force deletion of a foreign-owned class without any mutation', async () => {
    const { tx, deleted } = fakeTransaction({ classTeacherId: 'teacher-b' });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' }, { force: true })
    ).rejects.toMatchObject({ code: 'CLASS_NOT_OWNED' });
    expect(deleted).toEqual({});
  });

  it('protects another teacher medical exemption during force deletion', async () => {
    const { tx, deleted } = fakeTransaction({
      students: [{ id: 'student-a', teacherId: 'teacher-a' }],
      protectedCounts: { exemption: 1 },
      medicalExemptionTeacherId: 'teacher-b',
    });

    await expect(
      deleteOwnedStudentClass(tx, { classId: 'class-a', ownerId: 'teacher-a' }, { force: true })
    ).rejects.toMatchObject({
      code: 'CLASS_DELETE_BLOCKED',
      blockers: { medicalExemptions: 1 },
    });
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
    expect(router).toContain('deleteOwnedStudentClass(');
    expect(router).toContain('prisma.$transaction(');
    expect(client).toContain('/api/students/classes/${encodeURIComponent(classId)}');
    expect(client).toContain("method: 'DELETE'");
    expect(client).toContain('?force=true');
    expect(store).toContain('await deleteStudentClass(classId);');
    expect(store).toContain('await forceDeleteStudentClass(classId);');
    expect(store).toContain('await refreshStudentRoster();');
    expect(view).toContain('await onDeleteClass?.(classId);');
    expect(view).toContain('سيتم حذف التلاميذ المسجلين فيه');
    expect(view).toContain('blockers.plannedSessions > 0');
    expect(view).toContain('blockers.weeklySlots > 0');
    expect(view).toContain('formatClassDeleteBlockers');
    expect(view).toContain('هذا القسم مرتبط ببيانات محفوظة.');
    expect(view).toContain('حذف القسم نهائياً مع البيانات المرتبطة');
    expect(view).toContain('تم حذف القسم نهائياً مع بياناته المرتبطة.');
    expect(view).toContain('await onRefreshRoster?.().catch(() => undefined);');
  });
});
