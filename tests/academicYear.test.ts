import { describe, expect, it } from 'vitest';
import {
  getAcademicYearForDate,
  getAcademicYearOptions,
  isCanonicalAcademicYearId,
  isPlanningStartDateConsistent,
} from '../src/services/academicYear';
import { buildClassPlannedSessionSeeds } from '../src/services/teacherPlanning.service';

describe('canonical academic year utility', () => {
  it('resolves the September-to-August boundary deterministically', () => {
    const cases = [
      ['2026-01-15', '2025-2026'],
      ['2026-08-25', '2025-2026'],
      ['2026-09-01', '2026-2027'],
      ['2027-01-01', '2026-2027'],
      ['2027-08-31', '2026-2027'],
      ['2027-09-01', '2027-2028'],
    ] as const;
    for (const [date, expected] of cases) {
      expect(getAcademicYearForDate(new Date(`${date}T00:00:00`))).toBe(expected);
    }
  });

  it('accepts only canonical consecutive-year identities', () => {
    expect(isCanonicalAcademicYearId('2026-2027')).toBe(true);
    expect(isCanonicalAcademicYearId('2025-2026')).toBe(true);
    for (const value of ['2026', '2026/2027', '2026-2026', '2027-2026', 'abc-def']) {
      expect(isCanonicalAcademicYearId(value)).toBe(false);
    }
  });

  it('offers only previous, current, and next year options', () => {
    expect(getAcademicYearOptions(new Date('2026-08-25T00:00:00'))).toEqual([
      '2024-2025',
      '2025-2026',
      '2026-2027',
    ]);
  });

  it('rejects a stale start date for the selected year', () => {
    expect(isPlanningStartDateConsistent('2026-2027', '2025-09-21')).toBe(false);
    expect(isPlanningStartDateConsistent('2026-2027', '2026-09-01')).toBe(true);
    expect(isPlanningStartDateConsistent('2025-2026', '2025-09-21')).toBe(true);
  });

  it('keeps same-class references isolated by academic year', () => {
    const oldYear = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2025-2026',
      'lvl_p1',
      '2025-09-21'
    );
    const nextYear = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2026-2027',
      'lvl_p1',
      '2026-09-01'
    );
    expect(oldYear[0].referenceSessionId).toBe(nextYear[0].referenceSessionId);
    expect(oldYear[0].academicYearId).not.toBe(nextYear[0].academicYearId);
    expect(oldYear[0].id).not.toBe(nextYear[0].id);
  });
});
