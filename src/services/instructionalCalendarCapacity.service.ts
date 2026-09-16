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
  requiredEncounters: number
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
  return {
    availableEncounters,
    requiredEncounters,
    fits: availableEncounters >= requiredEncounters,
    lastAvailableInstructionalDate,
    projectedCompletionDate: null,
    configurationRequired: false,
  };
}
