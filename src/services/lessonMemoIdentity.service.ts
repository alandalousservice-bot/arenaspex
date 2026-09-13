import type { LessonPlan } from '../types/spex';

export interface LessonMemoIdentityContext {
  teacherId: string;
  referenceSessionId: string;
  classId?: string;
  academicYearId?: string;
}

function stablePart(value: string): string {
  return encodeURIComponent(value.trim());
}

/** The scheduled session remains the authoritative identity for operational memos. */
export function scheduledLessonMemoIdFor(classPlannedSessionId: string): string {
  return `lp_session_${classPlannedSessionId}`;
}

/** Stable identity for a pedagogical memo not attached to a ClassPlannedSession. */
export function standaloneLessonMemoIdFor(context: LessonMemoIdentityContext): string {
  const { teacherId, referenceSessionId, classId, academicYearId } = context;
  if (!teacherId || !referenceSessionId) throw new Error('MEMO_IDENTITY_CONTEXT_INVALID');
  return [
    'lp_standalone',
    stablePart(teacherId),
    stablePart(classId || 'no-class'),
    stablePart(academicYearId || 'no-academic-year'),
    stablePart(referenceSessionId),
  ].join('_');
}

/** Unique identity for a teacher-authored memo with no annual or class reference. */
export function manualStandaloneLessonMemoIdFor(teacherId: string, createdAt: string): string {
  if (!teacherId || !createdAt) throw new Error('MANUAL_MEMO_IDENTITY_CONTEXT_INVALID');
  return ['lp_standalone_manual', stablePart(teacherId), stablePart(createdAt)].join('_');
}

/** Annual-distribution memos use a separate namespace and ownership scope. */
export function annualDistributionLessonMemoIdFor(
  context: LessonMemoIdentityContext & { academicYearId: string }
): string {
  return [
    'lp_annual',
    stablePart(context.teacherId),
    stablePart(context.classId || 'no-class'),
    stablePart(context.academicYearId),
    stablePart(context.referenceSessionId),
  ].join('_');
}

export function isStandaloneLessonMemo(plan: LessonPlan): boolean {
  return !plan.classPlannedSessionId && plan.memoSource === 'standalone';
}

export function isAnnualDistributionLessonMemo(plan: LessonPlan): boolean {
  return (
    !plan.classPlannedSessionId &&
    (plan.memoSource === 'annual-distribution' || plan.id.startsWith('lp_annual_'))
  );
}
