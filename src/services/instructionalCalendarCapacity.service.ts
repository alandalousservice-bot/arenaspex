import { getAcademicCalendar, isValidAcademicSchoolDate } from '../data/academicCalendars';

export interface OperationalEncounterDescriptor {
  referenceSessionId: string;
  encounterIndex: number;
  lessonType: string;
  durationMinutes: number;
}

export interface OperationalEncounterOpportunity {
  plannedDate: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface OperationalEncounterEnumerationInput {
  planningStart: string;
  instructionalEndDate: string;
  weeklySlots: readonly { weekday: number; startTime: string; endTime: string }[];
  academicYearId: string;
}

export function enumerateOperationalEncounterOpportunities(
  input: OperationalEncounterEnumerationInput
): OperationalEncounterOpportunity[] {
  const slots = input.weeklySlots
    .filter((slot) => Number.isInteger(slot.weekday) && slot.weekday >= 0 && slot.weekday <= 4)
    .slice()
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  const opportunities: OperationalEncounterOpportunity[] = [];
  for (
    let cursor = input.planningStart;
    cursor <= input.instructionalEndDate;
    cursor = new Date(new Date(`${cursor}T00:00:00Z`).getTime() + 86400000)
      .toISOString()
      .slice(0, 10)
  ) {
    const weekday = new Date(`${cursor}T00:00:00Z`).getUTCDay();
    if (!isValidAcademicSchoolDate(cursor, input.academicYearId)) continue;
    for (const slot of slots.filter((item) => item.weekday === weekday)) {
      opportunities.push({
        plannedDate: cursor,
        weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }
  return opportunities;
}

export interface InstructionalCalendarCapacity {
  availableEncounters: number;
  requiredEncounters: number;
  totalOperationalOpportunities?: number;
  orientationOperationalRequired?: number;
  pedagogicalOperationalCapacity?: number;
  totalOperationalRequired?: number;
  fits: boolean;
  lastAvailableInstructionalDate: string | null;
  projectedCompletionDate: string | null;
  configurationRequired: boolean;
}

export type LearningLessonCount = 6 | 7 | 8;
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
  const candidatesPerDomain: LearningLessonCount[][] = domains.map(() => [6, 7, 8]);
  const visit = (index: number, partial: Record<string, LearningLessonCount>) => {
    if (index === domains.length) {
      const counts = { ...partial };
      const requiredEncounters =
        domains.reduce((sum, domain) => sum + counts[domain] + 4, 0) * encountersPerReference;
      if (requiredEncounters <= availableEncounters) {
        candidates.push({ counts, requiredEncounters, availableEncounters });
      }
      return;
    }
    for (const count of candidatesPerDomain[index]) {
      partial[domains[index]] = count;
      visit(index + 1, partial);
    }
  };
  visit(0, {});
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
  encountersPerWeek = 1,
  weeklySlots?: readonly { weekday: number; startTime: string; endTime: string }[]
): InstructionalCalendarCapacity {
  const calendar = getAcademicCalendar(academicYearId);
  const endDate = calendar.instructionalEndDate;
  if (!endDate)
    return {
      availableEncounters: 0,
      requiredEncounters,
      totalOperationalOpportunities: 0,
      orientationOperationalRequired: 0,
      pedagogicalOperationalCapacity: 0,
      totalOperationalRequired: requiredEncounters,
      fits: false,
      lastAvailableInstructionalDate: null,
      projectedCompletionDate: null,
      configurationRequired: true,
    };
  if (weeklySlots?.length) {
    const opportunities = enumerateOperationalEncounterOpportunities({
      planningStart: startDate,
      instructionalEndDate: endDate,
      weeklySlots,
      academicYearId,
    });
    const availableEncounters = opportunities.length;
    const orientationOperationalRequired = availableEncounters > 0 ? 1 : 0;
    const pedagogicalOperationalCapacity = Math.max(
      0,
      availableEncounters - orientationOperationalRequired
    );
    return {
      availableEncounters: pedagogicalOperationalCapacity,
      requiredEncounters,
      totalOperationalOpportunities: availableEncounters,
      orientationOperationalRequired,
      pedagogicalOperationalCapacity,
      totalOperationalRequired: requiredEncounters + orientationOperationalRequired,
      fits: requiredEncounters <= pedagogicalOperationalCapacity,
      lastAvailableInstructionalDate: opportunities.at(-1)?.plannedDate || null,
      projectedCompletionDate: null,
      configurationRequired: false,
    };
  }
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
    totalOperationalOpportunities: availableEncounters,
    orientationOperationalRequired: 0,
    pedagogicalOperationalCapacity: weeklyCapacity,
    totalOperationalRequired: requiredEncounters,
    fits: requiredEncounters <= weeklyCapacity,
    lastAvailableInstructionalDate,
    projectedCompletionDate: null,
    configurationRequired: false,
  };
}
