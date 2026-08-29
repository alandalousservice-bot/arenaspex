import type { Prisma } from '@prisma/client';

export type StudentDeletionErrorCode =
  'STUDENT_NOT_FOUND' | 'STUDENT_NOT_OWNED' | 'STUDENT_DELETE_BLOCKED';

export interface StudentDeletionBlockers {
  attendanceRecords: number;
  studentAssessments: number;
  medicalExemptions: number;
}

export class StudentDeletionError extends Error {
  constructor(
    public readonly code: StudentDeletionErrorCode,
    message: string,
    public readonly blockers?: StudentDeletionBlockers
  ) {
    super(message);
    this.name = 'StudentDeletionError';
  }
}

export async function deleteOwnedStudent(
  tx: Prisma.TransactionClient,
  input: { studentId: string; ownerId: string }
) {
  const student = await tx.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, teacherId: true },
  });
  if (!student) throw new StudentDeletionError('STUDENT_NOT_FOUND', 'التلميذ غير موجود.');
  if (student.teacherId !== input.ownerId)
    throw new StudentDeletionError('STUDENT_NOT_OWNED', 'لا تملك صلاحية حذف هذا التلميذ.');

  const [attendanceRecords, studentAssessments, medicalExemptions] = await Promise.all([
    tx.studentAttendance.count({ where: { studentId: student.id } }),
    tx.studentAssessment.count({ where: { studentId: student.id } }),
    tx.medicalExemption.count({ where: { studentId: student.id, teacherId: input.ownerId } }),
  ]);
  const blockers = { attendanceRecords, studentAssessments, medicalExemptions };
  if (Object.values(blockers).some((count) => count > 0))
    throw new StudentDeletionError(
      'STUDENT_DELETE_BLOCKED',
      'لا يمكن حذف التلميذ لوجود بيانات تاريخية مرتبطة به.',
      blockers
    );

  await tx.student.delete({ where: { id: student.id } });
  return { studentId: student.id };
}
