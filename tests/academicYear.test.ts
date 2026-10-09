import { describe, expect, it } from 'vitest';
import {
  getCurrentAcademicYear,
  getAcademicYearForDate,
  getAcademicYearOptions,
  getDefaultOperationalAcademicYear,
  getOperationalAcademicYearOptions,
  isCanonicalAcademicYearId,
  isOperationalAcademicYear,
  isPreLaunchAcademicYear,
  isPlanningStartDateConsistent,
} from '../src/services/academicYear';
import {
  buildClassPlannedSessionSeeds,
  isValidPlanningDate,
} from '../src/services/teacherPlanning.service';
import {
  calendarEventForDate,
  getAcademicCalendar,
  getCalendarEventsForDisplay,
  isAcademicTermTestDate,
  isValidAcademicSchoolDate,
} from '../src/data/academicCalendars';

describe('canonical academic year utility', () => {
  it('uses the 2026-2027 launch year for operational defaults', () => {
    expect(getCurrentAcademicYear()).toBe('2026-2027');
    expect(getDefaultOperationalAcademicYear()).toBe('2026-2027');
    expect(getOperationalAcademicYearOptions()).toEqual(['2026-2027']);
    expect(isOperationalAcademicYear('2025-2026')).toBe(false);
    expect(isOperationalAcademicYear('2026-2027')).toBe(true);
    expect(isPreLaunchAcademicYear('2026-2027')).toBe(true);
    expect(isPreLaunchAcademicYear('2027-2028')).toBe(false);
  });

  it('keeps future academic-year identities valid for later activation', () => {
    expect(isCanonicalAcademicYearId('2027-2028')).toBe(true);
    expect(isOperationalAcademicYear('2027-2028')).toBe(false);
  });

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
    expect(isPlanningStartDateConsistent('2026-2027', '2026-09-20')).toBe(false);
    expect(isPlanningStartDateConsistent('2026-2027', '2026-09-21')).toBe(true);
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

  it('uses versioned official calendar configuration and preserves blocking semantics', () => {
    expect(getAcademicCalendar('2026-2027')).toMatchObject({
      schoolStart: '2026-09-21',
      complete: false,
    });
    const events = getAcademicCalendar('2026-2027').events;
    expect(events.some((event) => event.name === 'عطلة الخريف')).toBe(true);
    expect(events.some((event) => event.name === 'عطلة الشتاء')).toBe(true);
    expect(events.some((event) => event.name === 'عطلة الربيع')).toBe(true);
    expect(events.some((event) => event.name === 'رأس السنة الأمازيغية - يناير')).toBe(true);
    expect(calendarEventForDate('2027-02-08', '2026-2027')).toBeNull();
    expect(calendarEventForDate('2026-11-01', '2026-2027')?.name).toBe('عطلة الخريف');
    const displayEvents = getCalendarEventsForDisplay('2025-2026');
    expect(displayEvents.some((event) => event.name.includes('الفطر'))).toBe(false);
    expect(displayEvents.some((event) => event.name === 'عطلة الربيع')).toBe(true);
  });

  it('uses the supplied primary 2026-2027 holidays and discrete term-test dates', () => {
    const calendar = getAcademicCalendar('2026-2027');
    expect(calendar.events.filter((event) => event.type === 'SCHOOL_VACATION')).toMatchObject([
      { name: 'عطلة الخريف', startDate: '2026-10-28', endDate: '2026-11-01' },
      { name: 'عطلة الشتاء', startDate: '2026-12-18', endDate: '2027-01-02' },
      { name: 'عطلة الربيع', startDate: '2027-03-19', endDate: '2027-04-03' },
    ]);
    expect(calendar.termTestPeriods?.map((period) => period.dates)).toEqual([
      ['2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10'],
      ['2027-03-02', '2027-03-03', '2027-03-04', '2027-03-07', '2027-03-08'],
      ['2027-05-23', '2027-05-24', '2027-05-25', '2027-05-26', '2027-05-27'],
    ]);
    expect(isAcademicTermTestDate('2027-03-05', '2026-2027')).toBe(false);
    expect(isAcademicTermTestDate('2027-03-06', '2026-2027')).toBe(false);
    expect(isAcademicTermTestDate('2027-03-08', '2026-2027')).toBe(true);
  });

  it('keeps tests available by default, while holidays always override the preference', () => {
    for (const date of [
      '2026-12-06',
      '2026-12-07',
      '2026-12-08',
      '2026-12-09',
      '2026-12-10',
      '2027-03-02',
      '2027-03-03',
      '2027-03-04',
      '2027-03-07',
      '2027-03-08',
      '2027-05-23',
      '2027-05-24',
      '2027-05-25',
      '2027-05-26',
      '2027-05-27',
    ]) {
      expect(isValidAcademicSchoolDate(date, '2026-2027')).toBe(true);
      expect(isValidAcademicSchoolDate(date, '2026-2027', false)).toBe(false);
    }
    for (const date of [
      '2026-10-28',
      '2026-11-01',
      '2026-12-18',
      '2027-01-02',
      '2027-03-19',
      '2027-04-03',
    ]) {
      expect(isValidAcademicSchoolDate(date, '2026-2027')).toBe(false);
      expect(isValidAcademicSchoolDate(date, '2026-2027', false)).toBe(false);
    }
    expect(isValidAcademicSchoolDate('2026-11-02', '2026-2027')).toBe(true);
    expect(isValidAcademicSchoolDate('2027-01-03', '2026-2027')).toBe(true);
    expect(isValidAcademicSchoolDate('2027-04-04', '2026-2027')).toBe(true);
  });

  it('enforces the confirmed 2026-2027 student boundary', () => {
    expect(isValidPlanningDate('2026-09-06')).toBe(false);
    expect(isValidPlanningDate('2026-09-13')).toBe(false);
    expect(isValidPlanningDate('2026-09-20')).toBe(false);
    expect(isValidPlanningDate('2026-09-21')).toBe(true);
    expect(isValidPlanningDate('2026-09-22')).toBe(true);
  });
});
