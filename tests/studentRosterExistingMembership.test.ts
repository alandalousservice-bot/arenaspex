import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import type { Prisma } from '@prisma/client';
import { buildStudentRosterReadModel } from '../src/services/studentRosterReadModel.service';
import { persistStudentRosterRows } from '../src/services/studentRosterPersistence.service';
import {
  findCrossClassMatriculeConflicts,
  parseStudentRosterWorkbook,
} from '../src/services/studentRosterImport.service';

type TestStudent = {
  id: string;
  teacherId: string;
  classId: string | null;
  institutionId: string | null;
  matricule: string;
  firstName: string;
  lastName: string;
  grade: number | null;
  groupName: string | null;
  schoolYear: string | null;
  birthDate: Date | null;
};

const row = (matricule: string, firstName: string, lastName: string) => ({
  matricule,
  firstName,
  lastName,
  rowNumber: 2,
});

function transactionFor(students: TestStudent[]) {
  return {
    student: {
      findMany: async () =>
        students.map(({ id, teacherId, classId, matricule, firstName, lastName }) => ({
          id,
          teacherId,
          classId,
          institutionId: students.find((item) => item.id === id)?.institutionId || null,
          matricule,
          firstName,
          lastName,
        })),
      update: async ({ where, data }: { where: { id: string }; data: { classId: string } }) => {
        const student = students.find((item) => item.id === where.id);
        if (student) student.classId = data.classId;
        return student;
      },
      createMany: async ({ data }: { data: TestStudent[] }) => {
        students.push(...data);
        return { count: data.length };
      },
      count: async ({ where }: { where: { teacherId: string; classId: string } }) =>
        students.filter(
          (student) => student.teacherId === where.teacherId && student.classId === where.classId
        ).length,
    },
  } as unknown as Prisma.TransactionClient;
}

function existingStudent(
  id: string,
  matricule: string,
  firstName: string,
  lastName: string,
  classId: string | null,
  teacherId = 'teacher-a'
): TestStudent {
  return {
    id,
    teacherId,
    classId,
    institutionId: 'institution-1',
    matricule,
    firstName,
    lastName,
    grade: null,
    groupName: null,
    schoolYear: null,
    birthDate: null,
  };
}

const input = (rows: ReturnType<typeof row>[], persistedClassId = 'class-a') => ({
  rows,
  teacherId: 'teacher-a',
  institutionId: 'institution-1',
  persistedClassId,
});

describe('existing student class reconciliation', () => {
  it('relinks three existing null-class students and exposes them in the roster read model', async () => {
    const students = [
      existingStudent('student-1', '1001', 'محمد', 'بن علي', null),
      existingStudent('student-2', '1002', 'أمينة', 'بوزيد', null),
      existingStudent('student-3', '1003', 'ياسين', 'قاسمي', null),
    ];
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input([
        row('1001', 'محمد', 'بن علي'),
        row('1002', 'أمينة', 'بوزيد'),
        row('1003', 'ياسين', 'قاسمي'),
      ])
    );

    expect(summary).toMatchObject({ created: 0, existing: 3, reassociated: 3, conflicts: 0 });
    const model = buildStudentRosterReadModel(
      [
        {
          id: 'class-a',
          institutionId: 'institution-1',
          teacherId: 'teacher-a',
          levelId: 'lvl_p1',
          name: 'Class A',
        },
      ],
      students.map((student) => ({ ...student, classId: student.classId as string }))
    );
    expect(model.classes[0].studentCount).toBe(3);
    expect(model.students).toHaveLength(3);
  });

  it('handles mixed null, correct, and new students without duplicates', async () => {
    const students = [
      existingStudent('student-1', '1001', 'محمد', 'بن علي', null),
      existingStudent('student-2', '1002', 'أمينة', 'بوزيد', 'class-a'),
    ];
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input([
        row('1001', 'محمد', 'بن علي'),
        row('1002', 'أمينة', 'بوزيد'),
        row('1003', 'ياسين', 'قاسمي'),
      ])
    );

    expect(summary).toMatchObject({ created: 1, existing: 2, reassociated: 1, conflicts: 0 });
    expect(students).toHaveLength(3);
    expect(students.every((student) => student.classId === 'class-a')).toBe(true);
  });

  it('reassigns an owned student from a different class and is idempotent on reimport', async () => {
    const students = [existingStudent('student-1', '1001', 'محمد', 'بن علي', 'class-a')];
    const tx = transactionFor(students);
    const first = await persistStudentRosterRows(
      tx,
      input([row('1001', 'محمد', 'بن علي')], 'class-b')
    );
    const second = await persistStudentRosterRows(
      tx,
      input([row('1001', 'محمد', 'بن علي')], 'class-b')
    );

    expect(first).toMatchObject({ existing: 1, reassociated: 1 });
    expect(second).toMatchObject({ existing: 1, reassociated: 0 });
    expect(students[0].classId).toBe('class-b');
  });

  it('does not modify another teacher student and reports an ownership conflict', async () => {
    const students = [
      existingStudent('student-1', '1001', 'محمد', 'بن علي', 'other-class', 'teacher-b'),
    ];
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input([row('1001', 'محمد', 'بن علي')])
    );

    expect(summary).toMatchObject({ created: 0, existing: 0, reassociated: 0, conflicts: 1 });
    expect(summary.reviewReasonCounts).toMatchObject({ foreignOwner: 1 });
    expect(students[0].classId).toBe('other-class');
  });

  it('classifies a 152-like foreign-owner batch without exposing identities', async () => {
    const students = Array.from({ length: 152 }, (_, index) =>
      existingStudent(
        `student-${index}`,
        `10${String(index).padStart(3, '0')}`,
        `الاسم${index}`,
        'اللقب',
        'other-class',
        'teacher-b'
      )
    );
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input(students.map((student) => row(student.matricule, student.firstName, student.lastName)))
    );

    expect(summary).toMatchObject({ created: 0, existing: 0, reassociated: 0, conflicts: 152 });
    expect(summary.reviewReasonCounts).toEqual({
      foreignOwner: 152,
      ambiguousMatch: 0,
      duplicateWorkbookMembership: 0,
      invalidIdentity: 0,
      institutionMismatch: 0,
      other: 0,
    });
  });

  it('uses User.id for ownership because Student.teacherId references User.id', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    expect(schema).toContain('teacherId     String');
    expect(schema).toContain(
      'teacher       User     @relation(fields: [teacherId], references: [id]'
    );
    expect(readFileSync('src/server/apiRouter.ts', 'utf8')).toContain('teacherId: req.user!.id');
  });

  it('does not claim a matching matricule from another institution', async () => {
    const students = [existingStudent('student-1', '1001', 'محمد', 'بن علي', 'other-class')];
    students[0].institutionId = 'institution-2';
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input([row('1001', 'محمد', 'بن علي')])
    );

    expect(summary).toMatchObject({ created: 0, existing: 0, reassociated: 0, conflicts: 1 });
    expect(summary.reviewReasonCounts.institutionMismatch).toBe(1);
    expect(students[0].classId).toBe('other-class');
  });

  it('preserves 17- and 18-digit matricules from preview through persistence and roster read', async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['matricule', 'Nom', 'Prénom'],
        ['10015192900329001', 'Benali', 'Mohamed'],
        ['110151929009246001', 'Bouzid', 'Amine'],
      ]),
      'Class A'
    );
    const preview = parseStudentRosterWorkbook(
      XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    )[0];
    const students: TestStudent[] = [];
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input(preview.students)
    );
    const model = buildStudentRosterReadModel(
      [
        {
          id: 'class-a',
          institutionId: 'institution-1',
          teacherId: 'teacher-a',
          levelId: 'lvl_p1',
          name: 'Class A',
        },
      ],
      students.map((student) => ({ ...student, classId: student.classId as string }))
    );

    expect(preview.students.map((student) => student.matricule)).toEqual([
      '10015192900329001',
      '110151929009246001',
    ]);
    expect(summary).toMatchObject({ created: 2, existing: 0, reassociated: 0, conflicts: 0 });
    expect(students.map((student) => student.matricule)).toEqual([
      '10015192900329001',
      '110151929009246001',
    ]);
    expect(model.students.map((student) => student.matricule)).toEqual([
      '10015192900329001',
      '110151929009246001',
    ]);
  });

  it('keeps multiple same-institution matches in ambiguous review', async () => {
    const students = [
      existingStudent('student-1', '1001', 'محمد', 'بن علي', null),
      existingStudent('student-2', '1001', 'محمد', 'بن علي', null),
    ];
    const summary = await persistStudentRosterRows(
      transactionFor(students),
      input([row('1001', 'محمد', 'بن علي')])
    );

    expect(summary).toMatchObject({ created: 0, existing: 0, reassociated: 0, conflicts: 1 });
    expect(summary.reviewReasonCounts.ambiguousMatch).toBe(1);
    expect(students.every((student) => student.classId === null)).toBe(true);
  });

  it('rejects a matricule assigned to two worksheet classes before persistence', () => {
    const conflicts = findCrossClassMatriculeConflicts([
      {
        worksheet: 'Class A',
        groupName: 'Class A',
        grade: 1,
        needsGradeSelection: false,
        students: [row('1001', 'محمد', 'بن علي')],
        invalidRows: [],
      },
      {
        worksheet: 'Class B',
        groupName: 'Class B',
        grade: 1,
        needsGradeSelection: false,
        students: [row('1001', 'محمد', 'بن علي')],
        invalidRows: [],
      },
    ]);
    expect(conflicts).toEqual(['1001']);
  });

  it('canonicalizes scientific matricules before cross-class duplicate detection', () => {
    const conflicts = findCrossClassMatriculeConflicts([
      {
        worksheet: 'Class A',
        groupName: 'Class A',
        grade: 1,
        needsGradeSelection: false,
        students: [row('1.10172E+15', 'محمد', 'بن علي')],
        invalidRows: [],
      },
      {
        worksheet: 'Class B',
        groupName: 'Class B',
        grade: 1,
        needsGradeSelection: false,
        students: [row('1101720000000000', 'أمينة', 'بوزيد')],
        invalidRows: [],
      },
    ]);
    expect(conflicts).toEqual(['1101720000000000']);
  });
});
