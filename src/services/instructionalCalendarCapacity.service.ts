import { getAcademicCalendar, isValidAcademicSchoolDate } from '../data/academicCalendars';

export interface OperationalEncounterDescriptor {
  referenceSessionId: string;
  encounterIndex: number;
  lessonType: string;
  durationMinutes: number;
}

export interface InstructionalCalendarCapacity {
  availableEncounters: number;
  requiredEncounters: number;
  fits: boolean;
  lastAvailableInstructionalDate: string | null;
  projectedCompletionDate: string | null;
  configurationRequired: boolean;
}

export type LearningLessonCount = 7 | 8;
export interface PlanningCapacityRecommendation {
  counts: Record<string, LearningLessonCount>;
  requiredEncounters: number;
  availableEncounters: number;
}

export function recommendLearningLessonCounts(
  domains: readonly string[],
  currentCounts: Readonly<Record<string, LearningLessonCount>>,
  availableEncounters: number,
  encountersPerReference = 1
): PlanningCapacityRecommendation | null {
  const candidates: PlanningCapacityRecommendation[] = [];
  const total = 1 << domains.length;
  for (let mask = 0; mask < total; mask += 1) {
    const counts = Object.fromEntries(
      domains.map((domain, index) => [domain, (mask & (1 << index)) === 0 ? 7 : 8])
    ) as Record<string, LearningLessonCount>;
    const requiredEncounters =
      domains.reduce((sum, domain) => sum + counts[domain] + 4, 0) * encountersPerReference;
    if (requiredEncounters <= availableEncounters) {
      candidates.push({ counts, requiredEncounters, availableEncounters });
    }
  }
  candidates.sort((left, right) => {
    const learningDelta =
      Object.values(right.counts).reduce((a, b) => a + b, 0) -
      Object.values(left.counts).reduce((a, b) => a + b, 0);
    if (learningDelta) return learningDelta;
    const changedLeft = domains.filter(
      (domain) => left.counts[domain] !== currentCounts[domain]
    ).length;
    const changedRight = domains.filter(
      (domain) => right.counts[domain] !== currentCounts[domain]
    ).length;
    if (changedLeft !== changedRight) return changedLeft - changedRight;
    return (
      domains
        .map((domain) => left.counts[domain] - right.counts[domain])
        .find((value) => value !== 0) || 0
    );
  });
  return candidates[0] || null;
}

export function getInstructionalEndDate(academicYearId: string): string | null {
  return getAcademicCalendar(academicYearId).instructionalEndDate;
}

export function expandPlanningReferencesToOperationalEncounters(
  references: readonly { referenceSessionId: string; lessonType: string }[],
  options: { grade: number; grade4WeeklyScheduleMode?: 'ONE_90' | 'TWO_45' } = { grade: 5 }
): OperationalEncounterDescriptor[] {
  const encounterCount =
    options.grade <= 3 || (options.grade === 4 && options.grade4WeeklyScheduleMode === 'TWO_45')
      ? 2
      : 1;
  return references.flatMap((reference) =>
    Array.from({ length: encounterCount }, (_, index) => ({
      referenceSessionId: reference.referenceSessionId,
      encounterIndex: index + 1,
      lessonType: reference.lessonType,
      durationMinutes:
        options.grade === 4 && options.grade4WeeklyScheduleMode === 'TWO_45'
          ? 45
          : options.grade === 4
            ? 90
            : 60,
    }))
  );
}

export function getInstructionalCalendarCapacity(
  academicYearId: string,
  startDate: string,
  requiredEncounters: number,
  encountersPerWeek = 1
): InstructionalCalendarCapacity {
  const calendar = getAcademicCalendar(academicYearId);
  const endDate = calendar.instructionalEndDate;
  if (!endDate)
    return {
      availableEncounters: 0,
      requiredEncounters,
      fits: false,
      lastAvailableInstructionalDate: null,
      projectedCompletionDate: null,
      configurationRequired: true,
    };
  let availableEncounters = 0;
  let lastAvailableInstructionalDate: string | null = null;
  for (
    let cursor = startDate;
    cursor <= endDate;
    cursor = new Date(new Date(`${cursor}T00:00:00Z`).getTime() + 86400000)
      .toISOString()
      .slice(0, 10)
  ) {
    if (isValidAcademicSchoolDate(cursor, academicYearId)) {
      availableEncounters += 1;
      lastAvailableInstructionalDate = cursor;
    }
  }
  const normalizedWeeklyRate = Math.max(1, encountersPerWeek);
  const instructionalWeeks = Math.floor(availableEncounters / 5);
  const weeklyCapacity = instructionalWeeks * normalizedWeeklyRate;
  return {
    availableEncounters: weeklyCapacity,
    requiredEncounters,
    fits: availableEncounters >= requiredEncounters,
    lastAvailableInstructionalDate,
    projectedCompletionDate: null,
    configurationRequired: false,
  };
}
