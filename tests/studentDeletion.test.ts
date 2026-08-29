import { describe, expect, it } from 'vitest';
import { deleteOwnedStudent, StudentDeletionError } from '../src/services/studentDeletion.service';

function transactionFor(options: {
  student?: { id: string; teacherId: string } | null;
  attendance?: number;
  assessments?: number;
  exemptions?: number;
}) {
  let deleted = false;
  return {
    tx: {
      student: {
        findUnique: async () => options.student ?? null,
        delete: async () => {
          deleted = true;
          return options.student;
        },
      },
      studentAttendance: { count: async () => options.attendance || 0 },
      studentAssessment: { count: async () => options.assessments || 0 },
      medicalExemption: { count: async () => options.exemptions || 0 },
    },
    wasDeleted: () => deleted,
  };
}

describe('safe Teacher student deletion', () => {
  it('deletes an owned student with no historical dependencies', async () => {
    const fixture = transactionFor({ student: { id: 'student-a', teacherId: 'teacher-a' } });
    await expect(
      deleteOwnedStudent(fixture.tx as never, { studentId: 'student-a', ownerId: 'teacher-a' })
    ).resolves.toEqual({ studentId: 'student-a' });
    expect(fixture.wasDeleted()).toBe(true);
  });

  it('rejects a foreign student before deletion', async () => {
    const fixture = transactionFor({ student: { id: 'student-a', teacherId: 'teacher-b' } });
    await expect(
      deleteOwnedStudent(fixture.tx as never, { studentId: 'student-a', ownerId: 'teacher-a' })
    ).rejects.toMatchObject({ code: 'STUDENT_NOT_OWNED' });
    expect(fixture.wasDeleted()).toBe(false);
  });

  it('blocks deletion when attendance history exists', async () => {
    const fixture = transactionFor({
      student: { id: 'student-a', teacherId: 'teacher-a' },
      attendance: 1,
    });
    await expect(
      deleteOwnedStudent(fixture.tx as never, { studentId: 'student-a', ownerId: 'teacher-a' })
    ).rejects.toMatchObject({
      code: 'STUDENT_DELETE_BLOCKED',
      blockers: { attendanceRecords: 1 },
    });
    expect(fixture.wasDeleted()).toBe(false);
  });

  it('reports a missing student without deleting anything', async () => {
    const fixture = transactionFor({ student: null });
    await expect(
      deleteOwnedStudent(fixture.tx as never, { studentId: 'missing', ownerId: 'teacher-a' })
    ).rejects.toBeInstanceOf(StudentDeletionError);
    expect(fixture.wasDeleted()).toBe(false);
  });
});
