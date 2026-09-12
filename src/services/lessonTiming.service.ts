import type { Grade4WeeklyScheduleMode } from '../types/spex';

export type OperationalLessonGrade = string | number;

export interface LessonPhaseBudgets {
  warmup: number;
  main: number;
  final: number;
}

export interface OperationalLessonDurationInput {
  gradeId: OperationalLessonGrade;
  classPlanningMode?: Grade4WeeklyScheduleMode | null;
  classPlannedSessionDurationMinutes?: number | null;
}

function gradeNumber(value: OperationalLessonGrade): number {
  const match = String(value).match(/\d+/);
  if (match) return Number(match[0]);
  const normalized = String(value);
  const arabicGrade = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'].findIndex((label) =>
    normalized.includes(label)
  );
  return arabicGrade >= 0 ? arabicGrade + 1 : 0;
}

/**
 * Resolves the operational duration. A persisted ClassPlannedSession is the
 * strongest signal; the Grade 4 class/year mode is next; the historical
 * unset Grade 4 behavior remains ONE_90 without writing a fallback.
 */
export function resolveOperationalLessonDuration(input: OperationalLessonDurationInput): number {
  const actual = input.classPlannedSessionDurationMinutes;
  if (Number.isFinite(actual) && (actual ?? 0) > 0) return Math.round(actual as number);

  const grade = gradeNumber(input.gradeId);
  if (grade === 4) return input.classPlanningMode === 'TWO_45' ? 45 : 90;
  if (grade === 5) return 60;
  return 60;
}

export function lessonPhaseBudgetsForDuration(durationMinutes: number): LessonPhaseBudgets {
  if (durationMinutes === 45) return { warmup: 10, main: 30, final: 5 };
  if (durationMinutes === 60) return { warmup: 10, main: 40, final: 10 };
  if (durationMinutes === 90) return { warmup: 15, main: 65, final: 10 };
  const edge = Math.min(10, Math.max(1, Math.floor(durationMinutes / 5)));
  return { warmup: edge, main: Math.max(1, durationMinutes - edge * 2), final: edge };
}

export const legacyGrade4WeeklyScheduleMode = 'ONE_90' as const;
