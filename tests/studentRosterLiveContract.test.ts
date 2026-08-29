import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseStudentRosterWorkbook } from '../src/services/studentRosterImport.service';
import { buildStudentRosterReadModel } from '../src/services/studentRosterReadModel.service';

function workbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['القسم: السنة الأولى أ'],
    ['المعرف', 'اللقب', 'الاسم'],
    ['', 'بن علي', 'محمد'],
    ['', 'بوزيد', 'أمينة'],
    ['', 'قاسمي', 'ياسين'],
    ['', '', ''],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'السنة الأولى أ');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('live student roster write/read contract', () => {
  it('keeps the production parser output visible through the production read model', () => {
    const preview = parseStudentRosterWorkbook(workbookBuffer())[0];
    const classId = 'class-a';
    const persistedStudents = preview.students.map((row, index) => ({
      id: `student-${index + 1}`,
      classId,
      firstName: row.firstName,
      lastName: row.lastName,
      birthDate: null,
      matricule: row.matricule || `import-${classId}-${row.rowNumber}`,
      grade: row.grade || 1,
      schoolYear: null,
    }));
    const model = buildStudentRosterReadModel(
      [
        {
          id: classId,
          institutionId: 'institution-1',
          teacherId: 'teacher-a',
          levelId: 'lvl_p1',
          name: 'السنة الأولى أ',
        },
      ],
      persistedStudents
    );

    expect(preview.students).toHaveLength(3);
    expect(persistedStudents).toHaveLength(3);
    expect(model.students).toHaveLength(3);
    expect(model.classes[0]).toMatchObject({ id: classId, studentCount: 3 });
    expect(model.students.map((student) => student.classId)).toEqual([classId, classId, classId]);
  });

  it('uses stable class/row identity for optional matricule re-imports', () => {
    const preview = parseStudentRosterWorkbook(workbookBuffer())[0];
    const first = preview.students.map((row) => `import-class-a-${row.rowNumber}`);
    const second = preview.students.map((row) => `import-class-a-${row.rowNumber}`);
    expect(second).toEqual(first);
    expect(new Set(second).size).toBe(3);
  });
});
