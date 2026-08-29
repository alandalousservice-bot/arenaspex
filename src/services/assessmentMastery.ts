import type { AssessmentGrade } from '../types/spex';

const GRADE_SCORES: Record<AssessmentGrade, number> = {
  أ: 4,
  ب: 3,
  ج: 2,
  د: 1,
};

/**
 * Derives the official overall mastery from the persisted criterion levels.
 * An empty set remains explicitly unassessed; no default level is invented.
 */
export function calculateAssessmentMastery(
  criteria: Partial<Record<string, AssessmentGrade | '' | null | undefined>>
): AssessmentGrade | null {
  const scores = Object.values(criteria)
    .map((value) => (value ? GRADE_SCORES[value] : undefined))
    .filter((score): score is number => score !== undefined);

  if (!scores.length) return null;

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  if (average >= 3.5) return 'أ';
  if (average >= 2.5) return 'ب';
  if (average >= 1.8) return 'ج';
  return 'د';
}
