import type { TeacherPlanningSession } from './api';
import type { LessonPlan } from '../types/spex';

export type LessonMemoMode = 'operational' | 'standalone';

export interface LessonMemoEligibilitySession {
  domainId?: string | null;
  fieldName?: string | null;
  isIntro?: boolean | null;
  sessionType?: string | null;
  sessionTypeLabel?: string | null;
  reference?: {
    domainId?: string | null;
    fieldName?: string | null;
    isIntro?: boolean | null;
    sessionType?: string | null;
    sessionTypeLabel?: string | null;
  } | null;
}

function normalizeSessionIdentity(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toLocaleLowerCase('ar-DZ')
    .replace(/[\u0640\s]+/g, ' ');
}

/** Introductory organization/contact sessions stay operational but do not have lesson memos. */
export function isLessonMemoEligible(session: LessonMemoEligibilitySession): boolean {
  const reference = session.reference;
  const domainId = normalizeSessionIdentity(reference?.domainId ?? session.domainId);
  const isIntro = reference?.isIntro ?? session.isIntro;
  const sessionType = normalizeSessionIdentity(reference?.sessionType ?? session.sessionType);
  const sessionTypeLabel = normalizeSessionIdentity(
    reference?.sessionTypeLabel ?? session.sessionTypeLabel
  );
  const fieldName = normalizeSessionIdentity(reference?.fieldName ?? session.fieldName);

  if (isIntro === true) return false;
  if (isIntro === false) return true;
  if (
    sessionType === 'تعارف وتنظيم' ||
    sessionType === 'تعارف، تنظيم واتصال' ||
    sessionType === 'تعارف، تنظيم واتصال مع التلاميذ' ||
    sessionType === 'intro'
  )
    return false;
  if (domainId) return domainId !== 'intro';
  if (sessionType) return true;
  return !(
    sessionTypeLabel === 'تعارف، تنظيم واتصال' ||
    sessionTypeLabel === 'تعارف، تنظيم واتصال مع التلاميذ' ||
    fieldName === 'intro'
  );
}

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
