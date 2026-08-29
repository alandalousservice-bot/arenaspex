import type { Prisma } from '@prisma/client';

export type StudentClassDeletionErrorCode = 'NOT_FOUND' | 'PROTECTED';

export class StudentClassDeletionError extends Error {
  constructor(
    public readonly code: StudentClassDeletionErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'StudentClassDeletionError';
  }
}

export interface StudentClassDeletionResult {
  classId: string;
  deletedStudents: number;
}

/**
 * Deletes an owned class only after checking every StudentClass dependent that
 * is part of the current schema.  Historical records are intentionally kept
 * safe: a class with attendance, assessment, planning, timetable, or student
 * history is rejected instead of relying on Prisma's database cascades.
 */
export async function deleteOwnedStudentClass(
  tx: Prisma.TransactionClient,
  input: { classId: string; ownerId: string }
): Promise<StudentClassDeletionResult> {
  const classRecord = await tx.studentClass.findUnique({
    where: { id: input.classId },
    select: { id: true, teacherId: true },
  });
  if (!classRecord || classRecord.teacherId !== input.ownerId) {
    throw new StudentClassDeletionError('NOT_FOUND', 'القسم غير موجود أو لا تملك صلاحية حذفه.');
  }

  const students = await tx.student.findMany({
    where: { classId: input.classId },
    select: { id: true, teacherId: true },
  });
  const foreignStudents = students.filter((student) => student.teacherId !== input.ownerId);
  if (foreignStudents.length) {
    throw new StudentClassDeletionError(
      'PROTECTED',
      'لا يمكن حذف القسم لأنه مرتبط بتلاميذ مملوكين لحساب آخر.'
    );
  }

  const studentIds = students.map((student) => student.id);
  const [
    plannedSessions,
    attendanceRecords,
    weeklySlots,
    assessmentSessions,
    studentAssessments,
    medicalExemptions,
  ] = await Promise.all([
    tx.classPlannedSession.count({ where: { classId: input.classId } }),
    tx.studentAttendance.count({ where: { classId: input.classId } }),
    tx.teacherWeeklySlot.count({ where: { classId: input.classId } }),
    tx.assessmentSession.count({ where: { classId: input.classId } }),
    studentIds.length
      ? tx.studentAssessment.count({ where: { studentId: { in: studentIds } } })
      : Promise.resolve(0),
    studentIds.length
      ? tx.medicalExemption.count({ where: { studentId: { in: studentIds } } })
      : Promise.resolve(0),
  ]);

  const protectedRecordCount =
    plannedSessions +
    attendanceRecords +
    weeklySlots +
    assessmentSessions +
    studentAssessments +
    medicalExemptions;
  if (protectedRecordCount > 0) {
    throw new StudentClassDeletionError(
      'PROTECTED',
      'لا يمكن حذف القسم لأنه يحتوي على بيانات تاريخية (حضور أو تقييم أو تخطيط أو إعفاءات).'
    );
  }

  let deletedStudents = 0;
  if (studentIds.length) {
    const deletedRoster = await tx.student.deleteMany({
      where: {
        id: { in: studentIds },
        teacherId: input.ownerId,
        classId: input.classId,
      },
    });
    if (deletedRoster.count !== studentIds.length) {
      throw new Error('Student roster changed while deleting the class.');
    }
    deletedStudents = deletedRoster.count;
  }

  const deletedClass = await tx.studentClass.deleteMany({
    where: { id: input.classId, teacherId: input.ownerId },
  });
  if (deletedClass.count !== 1) {
    throw new StudentClassDeletionError('NOT_FOUND', 'القسم غير موجود أو لا تملك صلاحية حذفه.');
  }

  return { classId: input.classId, deletedStudents };
}
