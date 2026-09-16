import { describe, expect, it } from 'vitest';
import {
  getInstructionalCalendarCapacity,
  recommendLearningLessonCounts,
} from '../src/services/instructionalCalendarCapacity.service';
import { generateAllPrimaryLevelDistributions } from '../src/services/teacherPlanning.service';

describe('instructional calendar capacity', () => {
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
    expect(result.levels.some((level) => level.status === 'failed')).toBe(true);
    expect(
      result.levels
        .flatMap((level) => level.sessions)
        .every((session) => session.plannedDate <= result.endDate)
    ).toBe(true);
  });

  it('selects the highest fitting deterministic 7/8 combination without mutation', () => {
    const recommendation = recommendLearningLessonCounts(
      ['f_locomotion', 'f_fundamentals', 'f_structuring'],
      { f_locomotion: 8, f_fundamentals: 8, f_structuring: 8 },
      33
    );
    expect(recommendation?.counts).toEqual({
      f_locomotion: 7,
      f_fundamentals: 7,
      f_structuring: 7,
    });
    expect(recommendation?.requiredEncounters).toBe(33);
  });
});
