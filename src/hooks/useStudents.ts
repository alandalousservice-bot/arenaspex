import { useMemo } from 'react';
import { Student, ClassRoom } from '../types/spex';

export interface UseStudentsResult {
  studentsByClass: (classId: string) => Student[];
  studentGenderStats: { total: number; male: number; female: number };
}

export function useStudents(students: Student[], classes: ClassRoom[]): UseStudentsResult {
  return useMemo(() => {
    const studentsByClass = (classId: string) => students.filter((s) => s.classId === classId);

    const total = students.length || classes.reduce((acc, c) => acc + (c.studentCount || 25), 0);
    const male = students.filter((s) => s.gender === 'ذكر').length || Math.round(total * 0.52);
    const female = total - male;

    return {
      studentsByClass,
      studentGenderStats: { total, male, female },
    };
  }, [students, classes]);
}
