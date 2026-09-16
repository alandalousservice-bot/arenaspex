import { describe, expect, it } from 'vitest';
import {
  enumerateOperationalEncounterOpportunities,
  getInstructionalCalendarCapacity,
  recommendLearningLessonCounts,
} from '../src/services/instructionalCalendarCapacity.service';
import { generateAllPrimaryLevelDistributions } from '../src/services/teacherPlanning.service';

describe('instructional calendar capacity', () => {
  const monday = [{ weekday: 1, startTime: '08:00', endTime: '09:30' }];

  it('uses actual weekly slots and keeps capacity units consistent', () => {
    const result = getInstructionalCalendarCapacity('2026-2027', '2026-09-21', 33, 1, monday);
    expect(result.totalOperationalOpportunities).toBe(29);
    expect(result.orientationOperationalRequired).toBe(1);
    expect(result.availableEncounters).toBe(28);
    expect(result.pedagogicalOperationalCapacity).toBe(28);
    expect(result.fits).toBe(false);
    expect(result.requiredEncounters).toBe(33);
    expect(result.totalOperationalRequired).toBe(34);
  });

  it('never allows the impossible 28/33/true result and computes deficit exactly', () => {
    const result = getInstructionalCalendarCapacity('2026-2027', '2026-09-21', 33, 1, monday);
    expect(result.fits).toBe(result.requiredEncounters <= result.availableEncounters);
    expect(Math.max(0, result.requiredEncounters - result.availableEncounters)).toBe(5);
  });

  it('allows weekday-specific holiday effects without generic week arithmetic', () => {
    const mondayDates = enumerateOperationalEncounterOpportunities({
      planningStart: '2026-09-21',
      instructionalEndDate: '2027-05-09',
      academicYearId: '2026-2027',
      weeklySlots: monday,
    });
    const thursdayDates = enumerateOperationalEncounterOpportunities({
      planningStart: '2026-09-21',
      instructionalEndDate: '2027-05-09',
      academicYearId: '2026-2027',
      weeklySlots: [{ weekday: 4, startTime: '08:00', endTime: '09:30' }],
    });
    expect(mondayDates.length).not.toBe(thursdayDates.length);
    expect(mondayDates.every((item) => item.weekday === 1)).toBe(true);
    expect(mondayDates.at(-1)?.plannedDate).toBe('2027-05-03');
  });

  it('uses the configured instructional end date and never counts a holiday', () => {
    const result = getInstructionalCalendarCapacity('2025-2026', '2025-09-21', 1);
    expect(result.configurationRequired).toBe(false);
    expect(result.lastAvailableInstructionalDate).toBe('2026-06-30');
    expect(result.fits).toBe(true);
  });

  it('returns an explicit configuration state when the calendar has no instructional cap', () => {
    expect(
      getInstructionalCalendarCapacity('2099-2100', '2099-09-21', 1).configurationRequired
    ).toBe(true);
  });

  it('uses the production generator boundary for the 2026-2027 annual path', () => {
    const result = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    expect(result.endDate).toBe('2027-05-09');
    expect(result.levels.every((level) => level.status === 'generated')).toBe(true);
    expect(
      result.levels
        .flatMap((level) => level.sessions)
        .every((session) => session.plannedDate >= '2026-09-21')
    ).toBe(true);
  });

  it('selects the highest fitting deterministic 7/8 combination without mutation', () => {
    const recommendation = recommendLearningLessonCounts(
      ['f_locomotion', 'f_fundamentals', 'f_structuring'],
      { f_locomotion: 8, f_fundamentals: 8, f_structuring: 8 },
      33
    );
    expect(recommendation?.counts).toEqual({
      f_locomotion: 6,
      f_fundamentals: 7,
      f_structuring: 8,
    });
    expect(recommendation?.requiredEncounters).toBe(33);
  });

  it('returns no recommendation when exact capacity cannot fit the supported minimum', () => {
    expect(
      recommendLearningLessonCounts(
        ['f_locomotion', 'f_fundamentals', 'f_structuring'],
        { f_locomotion: 8, f_fundamentals: 8, f_structuring: 8 },
        28
      )
    ).toBeNull();
  });

  it('selects the best fitting 6/7/8 combination when capacity permits only the minimum', () => {
    const recommendation = recommendLearningLessonCounts(
      ['f_locomotion', 'f_fundamentals', 'f_structuring'],
      { f_locomotion: 8, f_fundamentals: 8, f_structuring: 8 },
      30
    );
    expect(recommendation?.counts).toEqual({
      f_locomotion: 6,
      f_fundamentals: 6,
      f_structuring: 6,
    });
  });
});
