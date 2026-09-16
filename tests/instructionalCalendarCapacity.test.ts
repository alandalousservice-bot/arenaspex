import { describe, expect, it } from 'vitest';
import { getInstructionalCalendarCapacity } from '../src/services/instructionalCalendarCapacity.service';

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
});
