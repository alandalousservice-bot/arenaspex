import { useMemo } from 'react';
import { User, ClassRoom, Student, WeeklyScheduleSlot } from '../types/spex';

export interface UseTeacherDataResult {
  selectedTeacher: User;
  teacherClasses: ClassRoom[];
  teacherStudents: Student[];
  totalStudentsTaught: number;
  maleCount: number;
  femaleCount: number;
  weeklyHoursCount: number;
}

export function useTeacher(
  teachers: User[],
  selectedTeacherId: string,
  classes: ClassRoom[] = [],
  students: Student[] = [],
  weeklySchedule: WeeklyScheduleSlot[] = []
): UseTeacherDataResult {
  return useMemo(() => {
    const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

    const teacherClasses: ClassRoom[] =
      classes.length > 0
        ? classes
        : [
            { id: 'cls_1', name: '1 ابتدائي 1', studentCount: 28, levelId: 'lvl_p1', institutionId: 'inst_1', teacherId: selectedTeacher?.id || 't_1' },
            { id: 'cls_2', name: '2 ابتدائي 1', studentCount: 26, levelId: 'lvl_p2', institutionId: 'inst_1', teacherId: selectedTeacher?.id || 't_1' },
            { id: 'cls_3', name: '3 ابتدائي 1', studentCount: 25, levelId: 'lvl_p3', institutionId: 'inst_1', teacherId: selectedTeacher?.id || 't_1' },
            { id: 'cls_4', name: '4 ابتدائي 1', studentCount: 24, levelId: 'lvl_p4', institutionId: 'inst_1', teacherId: selectedTeacher?.id || 't_1' },
            { id: 'cls_5', name: '5 ابتدائي 1', studentCount: 22, levelId: 'lvl_p5', institutionId: 'inst_1', teacherId: selectedTeacher?.id || 't_1' },
          ];

    const teacherStudents =
      students.filter((s) => teacherClasses.some((c) => c.id === s.classId)) || students;

    let calculatedClassCount = 0;
    teacherClasses.forEach((c) => {
      calculatedClassCount += c.studentCount || 25;
    });

    const totalStudentsTaught =
      teacherStudents.length > 0 ? teacherStudents.length : calculatedClassCount;

    const maleCount =
      teacherStudents.filter((s) => s.gender === 'ذكر').length || Math.round((totalStudentsTaught as number) * 0.52);

    const femaleCount = (totalStudentsTaught as number) - maleCount;

    const weeklyHoursCount = weeklySchedule.length || 18;

    return {
      selectedTeacher,
      teacherClasses,
      teacherStudents,
      totalStudentsTaught,
      maleCount,
      femaleCount,
      weeklyHoursCount,
    };
  }, [teachers, selectedTeacherId, classes, students, weeklySchedule]);
}
