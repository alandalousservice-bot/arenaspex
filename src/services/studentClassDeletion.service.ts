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
  criterionResults: number;
}

export interface StudentClassForceDeletionResult {
  deleted: true;
  classId: string;
  deletedCounts: {
    students: number;
    plannedSessions: number;
    attendanceRecords: number;
    assessmentSessions: number;
    weeklySlots: number;
    medicalExemptions: number;
    studentAssessments: number;
    criterionResults: number;
  };
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

function blocked(blockers: StudentClassDeletionBlockers) {
  return new StudentClassDeletionError(
    'CLASS_DELETE_BLOCKED',
    'لا يمكن حذف القسم لوجود بيانات مرتبطة به يجب معالجتها أولًا.',
    blockers
  );
}

/**
 * Normal deletion is deliberately conservative. Force deletion is explicit
 * and still runs through this same ownership/dependency audit in one Prisma
 * transaction; it removes only records proven to belong to the target class.
 */
export async function deleteOwnedStudentClass(
  tx: Prisma.TransactionClient,
  input: { classId: string; ownerId: string },
  options: { force?: boolean } = {}
): Promise<StudentClassDeletionResult | StudentClassForceDeletionResult> {
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
  if (students.some((student) => student.teacherId !== input.ownerId)) {
    throw blocked({
      studentsWithHistory: 0,
      attendanceRecords: 0,
      assessmentSessions: 0,
      plannedSessions: 0,
      weeklySlots: 0,
      medicalExemptions: 0,
      studentAssessments: 0,
      criterionResults: 0,
    });
  }

  const studentIds = students.map((student) => student.id);
  const [
    plannedSessions,
    attendanceRecords,
    weeklySlots,
    assessmentSessionRows,
    foreignPlannedSessions,
    foreignAttendanceRecords,
    foreignWeeklySlots,
    foreignAssessmentSessions,
    foreignMedicalExemptions,
  ] = await Promise.all([
    tx.classPlannedSession.count({ where: { classId: input.classId } }),
    tx.studentAttendance.count({ where: { classId: input.classId } }),
    tx.teacherWeeklySlot.count({ where: { classId: input.classId } }),
    tx.assessmentSession.findMany({
      where: { classId: input.classId },
      select: { id: true, teacherId: true },
    }),
    tx.classPlannedSession.count({
      where: { classId: input.classId, teacherId: { not: input.ownerId } },
    }),
    tx.studentAttendance.count({
      where: { classId: input.classId, teacherId: { not: input.ownerId } },
    }),
    tx.teacherWeeklySlot.count({
      where: { classId: input.classId, teacherId: { not: input.ownerId } },
    }),
    tx.assessmentSession.count({
      where: { classId: input.classId, teacherId: { not: input.ownerId } },
    }),
    studentIds.length
      ? tx.medicalExemption.count({
          where: { studentId: { in: studentIds }, teacherId: { not: input.ownerId } },
        })
      : Promise.resolve(0),
  ]);

  const studentAssessmentRows =
    studentIds.length || assessmentSessionRows.length
      ? await tx.studentAssessment.findMany({
          where: {
            OR: [
              ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
              ...(assessmentSessionRows.length
                ? [{ assessmentSessionId: { in: assessmentSessionRows.map((row) => row.id) } }]
                : []),
            ],
          },
          select: { id: true, studentId: true },
        })
      : [];
  const medicalExemptionRows = studentIds.length
    ? await tx.medicalExemption.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true, studentId: true },
      })
    : [];
  const studentAssessmentIds = studentAssessmentRows.map((row) => row.id);
  const criterionResults = studentAssessmentIds.length
    ? await tx.criterionResult.count({
        where: { studentAssessmentId: { in: studentAssessmentIds } },
      })
    : 0;
  const studentAssessments = studentAssessmentRows.length;
  const medicalExemptions = medicalExemptionRows.length;
  const studentsWithHistory = new Set([
    ...studentAssessmentRows.map((row) => row.studentId),
    ...medicalExemptionRows.map((row) => row.studentId),
  ]).size;
  const blockers: StudentClassDeletionBlockers = {
    studentsWithHistory,
    attendanceRecords,
    assessmentSessions: assessmentSessionRows.length,
    plannedSessions,
    weeklySlots,
    medicalExemptions,
    studentAssessments,
    criterionResults,
  };
  const foreignClassRecords =
    foreignPlannedSessions +
    foreignAttendanceRecords +
    foreignWeeklySlots +
    foreignAssessmentSessions +
    foreignMedicalExemptions;
  const protectedRecordCount =
    plannedSessions +
    attendanceRecords +
    weeklySlots +
    assessmentSessionRows.length +
    studentAssessments +
    criterionResults +
    medicalExemptions;

  if (foreignClassRecords > 0 || (!options.force && protectedRecordCount > 0)) {
    throw blocked(blockers);
  }

  if (!options.force) {
    const deletedRoster = studentIds.length
      ? await tx.student.deleteMany({
          where: {
            id: { in: studentIds },
            teacherId: input.ownerId,
            classId: input.classId,
          },
        })
      : { count: 0 };
    if (deletedRoster.count !== studentIds.length) {
      throw new Error('Student roster changed while deleting the class.');
    }
    const deletedClass = await tx.studentClass.deleteMany({
      where: { id: input.classId, teacherId: input.ownerId },
    });
    if (deletedClass.count !== 1) {
      throw new StudentClassDeletionError('CLASS_NOT_FOUND', 'القسم غير موجود.');
    }
    return { classId: input.classId, deletedStudents: deletedRoster.count };
  }

  const deletedCriterionResults = studentAssessmentIds.length
    ? await tx.criterionResult.deleteMany({
        where: { studentAssessmentId: { in: studentAssessmentIds } },
      })
    : { count: 0 };
  const deletedStudentAssessments = studentAssessmentIds.length
    ? await tx.studentAssessment.deleteMany({
        where: {
          OR: [
            { studentId: { in: studentIds } },
            ...(assessmentSessionRows.length
              ? [{ assessmentSessionId: { in: assessmentSessionRows.map((row) => row.id) } }]
              : []),
          ],
        },
      })
    : { count: 0 };
  const deletedMedicalExemptions = studentIds.length
    ? await tx.medicalExemption.deleteMany({
        where: { teacherId: input.ownerId, studentId: { in: studentIds } },
      })
    : { count: 0 };
  const deletedAttendanceRecords = await tx.studentAttendance.deleteMany({
    where: {
      teacherId: input.ownerId,
      classId: input.classId,
      ...(studentIds.length ? { studentId: { in: studentIds } } : {}),
    },
  });
  const deletedAssessmentSessions = await tx.assessmentSession.deleteMany({
    where: { teacherId: input.ownerId, classId: input.classId },
  });
  const deletedPlannedSessions = await tx.classPlannedSession.deleteMany({
    where: { teacherId: input.ownerId, classId: input.classId },
  });
  const deletedWeeklySlots = await tx.teacherWeeklySlot.deleteMany({
    where: { teacherId: input.ownerId, classId: input.classId },
  });
  const deletedStudents = studentIds.length
    ? await tx.student.deleteMany({
        where: {
          id: { in: studentIds },
          teacherId: input.ownerId,
          classId: input.classId,
        },
      })
    : { count: 0 };
  if (deletedStudents.count !== studentIds.length) {
    throw new Error('Student roster changed while force-deleting the class.');
  }
  const deletedClass = await tx.studentClass.deleteMany({
    where: { id: input.classId, teacherId: input.ownerId },
  });
  if (deletedClass.count !== 1) {
    throw new StudentClassDeletionError('CLASS_NOT_FOUND', 'القسم غير موجود.');
  }

  return {
    deleted: true,
    classId: input.classId,
    deletedCounts: {
      students: deletedStudents.count,
      plannedSessions: deletedPlannedSessions.count,
      attendanceRecords: deletedAttendanceRecords.count,
      assessmentSessions: deletedAssessmentSessions.count,
      weeklySlots: deletedWeeklySlots.count,
      medicalExemptions: deletedMedicalExemptions.count,
      studentAssessments: deletedStudentAssessments.count,
      criterionResults: deletedCriterionResults.count,
    },
  };
}
