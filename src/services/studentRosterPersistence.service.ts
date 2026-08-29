import type { Prisma } from '@prisma/client';
import type { ParsedRosterStudent } from './studentRosterImport.service.js';

export interface StudentRosterPersistenceInput {
  rows: readonly ParsedRosterStudent[];
  teacherId: string;
  institutionId: string | null;
  persistedClassId: string;
}

export interface StudentRosterPersistenceSummary {
  created: number;
  existing: number;
  reassociated: number;
  conflicts: number;
  linkedStudents: number;
}

type ExistingStudent = {
  id: string;
  teacherId: string;
  classId: string | null;
  matricule: string;
  firstName: string;
  lastName: string;
};

export async function persistStudentRosterRows(
  tx: Prisma.TransactionClient,
  input: StudentRosterPersistenceInput
): Promise<StudentRosterPersistenceSummary> {
  const matricules = input.rows.map((row) => row.matricule);
  const existingStudents = matricules.length
    ? await tx.student.findMany({
        where: { institutionId: input.institutionId, matricule: { in: matricules } },
        select: {
          id: true,
          teacherId: true,
          classId: true,
          matricule: true,
          firstName: true,
          lastName: true,
        },
      })
    : [];
  const existingByMatricule = new Map<string, ExistingStudent[]>();
  for (const student of existingStudents) {
    const matches = existingByMatricule.get(student.matricule) || [];
    matches.push(student);
    existingByMatricule.set(student.matricule, matches);
  }

  const missingRows: ParsedRosterStudent[] = [];
  const updates: Promise<unknown>[] = [];
  let existing = 0;
  let reassociated = 0;
  let conflicts = 0;

  for (const row of input.rows) {
    const candidates = existingByMatricule.get(row.matricule) || [];
    const current = candidates.find((student) => student.teacherId === input.teacherId);
    if (!current) {
      // A matricule already owned by another teacher is not a new student:
      // report it for review instead of violating ownership or a unique key.
      if (candidates.length) conflicts += 1;
      else missingRows.push(row);
      continue;
    }
    if (current.firstName !== row.firstName || current.lastName !== row.lastName) {
      conflicts += 1;
      continue;
    }
    existing += 1;
    if (current.classId !== input.persistedClassId) {
      reassociated += 1;
      updates.push(
        tx.student.update({
          where: { id: current.id },
          data: { classId: input.persistedClassId },
        })
      );
    }
  }

  if (updates.length) await Promise.all(updates);
  if (missingRows.length) {
    await tx.student.createMany({
      data: missingRows.map((row, index) => ({
        id: `std_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
        teacherId: input.teacherId,
        institutionId: input.institutionId,
        classId: input.persistedClassId,
        matricule: row.matricule,
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate ? new Date(row.birthDate) : null,
        grade: row.grade || null,
        groupName: row.groupName || null,
        schoolYear: row.schoolYear || null,
      })),
    });
  }

  return {
    created: missingRows.length,
    existing,
    reassociated,
    conflicts,
    linkedStudents: await tx.student.count({
      where: { teacherId: input.teacherId, classId: input.persistedClassId },
    }),
  };
}
