import { useMemo } from 'react';
import { LessonPlan, User } from '../types/spex';

export interface UseLessonPlansResult {
  filteredTeacherPlans: LessonPlan[];
}

export function useLessonPlans(
  lessonPlans: LessonPlan[] = [],
  selectedTeacher?: User,
  teachers: User[] = []
): UseLessonPlansResult {
  return useMemo(() => {
    const filteredTeacherPlans = lessonPlans.filter((lp) => {
      if (!lp) return false;
      if (lp.teacherId) return lp.teacherId === selectedTeacher?.id;
      if (lp.teacherName && selectedTeacher?.lastName)
        return lp.teacherName.includes(selectedTeacher.lastName);
      if (!lp.teacherId && selectedTeacher?.id === teachers[0]?.id) return true;
      return false;
    });

    return { filteredTeacherPlans };
  }, [lessonPlans, selectedTeacher, teachers]);
}
