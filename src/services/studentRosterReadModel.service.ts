export interface StudentRosterClassSource {
  id: string;
  institutionId: string | null;
  teacherId: string;
  levelId: string;
  name: string;
}

export interface StudentRosterStudentSource {
  id: string;
  classId: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  matricule: string;
  grade: number | null;
  schoolYear: string | null;
}

export function buildStudentRosterReadModel(
  classes: readonly StudentRosterClassSource[],
  students: readonly StudentRosterStudentSource[]
) {
  const counts = new Map<string, number>();
  students.forEach((student) => {
    counts.set(student.classId, (counts.get(student.classId) || 0) + 1);
  });

  return {
    classes: classes.map((item) => ({
      id: item.id,
      institutionId: item.institutionId || '',
      teacherId: item.teacherId,
      levelId: item.levelId,
      name: item.name,
      studentCount: counts.get(item.id) || 0,
    })),
    students: students.map((item) => ({
      id: item.id,
      classId: item.classId,
      firstName: item.firstName,
      lastName: item.lastName,
      gender: 'ذكر' as const,
      birthDate: item.birthDate?.toISOString().slice(0, 10),
      registrationNumber: item.matricule,
      matricule: item.matricule,
      grade: item.grade,
      schoolYear: item.schoolYear,
    })),
  };
}
