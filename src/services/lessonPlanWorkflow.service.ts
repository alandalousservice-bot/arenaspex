import type { TeacherPlanningSession } from './api';
import type { LessonPlan } from '../types/spex';

export type LessonMemoMode = 'operational' | 'standalone';

export function sortOperationalSessions(
  sessions: TeacherPlanningSession[]
): TeacherPlanningSession[] {
  return [...sessions].sort(
    (a, b) =>
      a.plannedDate.localeCompare(b.plannedDate) ||
      (a.startTime ? 0 : 1) - (b.startTime ? 0 : 1) ||
      (a.startTime || '').localeCompare(b.startTime || '') ||
      (a.reference?.sequenceIndex ?? Number.MAX_SAFE_INTEGER) -
        (b.reference?.sequenceIndex ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id)
  );
}

export function isOwnedOperationalSession(
  session: TeacherPlanningSession,
  scope: { teacherId: string; classId: string; academicYearId: string }
): boolean {
  return (
    session.teacherId === scope.teacherId &&
    session.classId === scope.classId &&
    session.academicYearId === scope.academicYearId
  );
}

export function findOperationalLessonPlan(
  lessonPlans: LessonPlan[],
  session: TeacherPlanningSession,
  teacherId: string
): LessonPlan | undefined {
  return lessonPlans.find(
    (plan) =>
      plan.teacherId === teacherId &&
      plan.classId === session.classId &&
      plan.academicYearId === session.academicYearId &&
      plan.classPlannedSessionId === session.id
  );
}
