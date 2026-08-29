import type { Prisma } from '@prisma/client';

export type StudentClassDeletionErrorCode =
  'CLASS_NOT_FOUND' | 'CLASS_NOT_OWNED' | 'CLASS_DELETE_BLOCKED';

export interface StudentClassDeletionBlockers {
  studentsWithHistory: number;
  attendanceRecords: number;
  assessmentSessions: number;
  plannedSessions: number;
  weeklySlots: number;
  medicalExemptions: number;
  studentAssessments: number;
}

export class StudentClassDeletionError extends Error {
  constructor(
    public readonly code: StudentClassDeletionErrorCode,
    message: string,
    public readonly blockers?: StudentClassDeletionBlockers
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
  if (!classRecord) {
    throw new StudentClassDeletionError('CLASS_NOT_FOUND', 'القسم غير موجود.');
  }
  if (classRecord.teacherId !== input.ownerId) {
    throw new StudentClassDeletionError('CLASS_NOT_OWNED', 'لا تملك صلاحية حذف هذا القسم.');
  }

  const students = await tx.student.findMany({
    where: { classId: input.classId },
    select: { id: true, teacherId: true },
  });
  const foreignStudents = students.filter((student) => student.teacherId !== input.ownerId);
  if (foreignStudents.length) {
    throw new StudentClassDeletionError(
      'CLASS_DELETE_BLOCKED',
      'لا يمكن حذف القسم لوجود بيانات مرتبطة به يجب معالجتها أولًا.'
    );
  }

  const studentIds = students.map((student) => student.id);
  const [
    plannedSessions,
    attendanceRecords,
    weeklySlots,
    assessmentSessions,
    studentAssessmentRows,
    medicalExemptionRows,
  ] = await Promise.all([
    tx.classPlannedSession.count({ where: { classId: input.classId } }),
    tx.studentAttendance.count({ where: { classId: input.classId } }),
    tx.teacherWeeklySlot.count({ where: { classId: input.classId } }),
    tx.assessmentSession.count({ where: { classId: input.classId } }),
    studentIds.length
      ? tx.studentAssessment.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true },
        })
      : Promise.resolve([] as Array<{ studentId: string }>),
    studentIds.length
      ? tx.medicalExemption.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true },
        })
      : Promise.resolve([] as Array<{ studentId: string }>),
  ]);

  const studentAssessments = studentAssessmentRows.length;
  const medicalExemptions = medicalExemptionRows.length;
  const studentsWithHistory = new Set([
    ...studentAssessmentRows.map((row) => row.studentId),
    ...medicalExemptionRows.map((row) => row.studentId),
  ]).size;
  const blockers: StudentClassDeletionBlockers = {
    studentsWithHistory,
    attendanceRecords,
    assessmentSessions,
    plannedSessions,
    weeklySlots,
    medicalExemptions,
    studentAssessments,
  };
  const protectedRecordCount =
    plannedSessions +
    attendanceRecords +
    weeklySlots +
    assessmentSessions +
    studentAssessments +
    medicalExemptions;
  if (protectedRecordCount > 0) {
    throw new StudentClassDeletionError(
      'CLASS_DELETE_BLOCKED',
      'لا يمكن حذف القسم لوجود بيانات مرتبطة به يجب معالجتها أولًا.',
      blockers
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
    throw new StudentClassDeletionError('CLASS_NOT_FOUND', 'القسم غير موجود.');
  }

  return { classId: input.classId, deletedStudents };
}
