import { describe, expect, it } from 'vitest';
import { buildStudentRosterReadModel } from '../src/services/studentRosterReadModel.service';

const classRow = (id: string, name = id) => ({
  id,
  institutionId: 'institution-1',
  teacherId: 'teacher-1',
  levelId: 'lvl_p1',
  name,
});

const studentRow = (id: string, classId: string, matricule = id) => ({
  id,
  classId,
  firstName: 'First ' + id,
  lastName: 'Last ' + id,
  birthDate: null,
  matricule,
  grade: 1,
  schoolYear: '2025-2026',
});

describe('student roster read model', () => {
  it('returns roster rows and counts from Student.classId', () => {
    const model = buildStudentRosterReadModel(
      [classRow('class-a')],
      [
        studentRow('student-1', 'class-a'),
        studentRow('student-2', 'class-a'),
        studentRow('student-3', 'class-a'),
      ]
    );

    expect(model.classes[0].studentCount).toBe(3);
    expect(model.students).toHaveLength(3);
    expect(model.students.every((student) => student.classId === 'class-a')).toBe(true);
  });

  it('keeps separate class counts without cross-linking', () => {
    const model = buildStudentRosterReadModel(
      [classRow('class-a'), classRow('class-b')],
      [
        studentRow('student-1', 'class-a'),
        studentRow('student-2', 'class-a'),
        studentRow('student-3', 'class-b'),
      ]
    );

    expect(model.classes.map((item) => item.studentCount)).toEqual([2, 1]);
  });

  it('preserves matricule and existing-class identity in the read model', () => {
    const model = buildStudentRosterReadModel(
      [classRow('canonical-class', 'Class A')],
      [studentRow('student-1', 'canonical-class', '001245')]
    );

    expect(model.classes[0]).toMatchObject({
      id: 'canonical-class',
      name: 'Class A',
      studentCount: 1,
    });
    expect(model.students[0]).toMatchObject({
      id: 'student-1',
      classId: 'canonical-class',
      registrationNumber: '001245',
      matricule: '001245',
    });
  });
});
