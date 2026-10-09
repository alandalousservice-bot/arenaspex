import { describe, expect, it } from 'vitest';
import {
  getAcademicCalendar,
  isAcademicTermTestDate,
  isValidAcademicSchoolDate,
} from '../src/data/academicCalendars';
import {
  canonicalPlanningSessions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';
import {
  getSchedulePeDuringTermTests,
  setSchedulePeDuringTermTests,
  type TeacherAcademicCalendarPreferenceStore,
} from '../src/services/teacherAcademicCalendarPreference.service';

function preferenceStore(): TeacherAcademicCalendarPreferenceStore {
  const records = new Map<string, { schedulePeDuringTermTests: boolean }>();
  return {
    teacherAcademicCalendarPreference: {
      findUnique: async ({
        where,
      }: {
        where: { teacherId_academicYearId: { teacherId: string; academicYearId: string } };
      }) =>
        records.get(
          `${where.teacherId_academicYearId.teacherId}|${where.teacherId_academicYearId.academicYearId}`
        ) || null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { teacherId_academicYearId: { teacherId: string; academicYearId: string } };
        create: { teacherId: string; academicYearId: string; schedulePeDuringTermTests: boolean };
        update: { schedulePeDuringTermTests: boolean };
      }) => {
        const { teacherId, academicYearId } = where.teacherId_academicYearId;
        const key = `${teacherId}|${academicYearId}`;
        const value = records.get(key)
          ? { schedulePeDuringTermTests: update.schedulePeDuringTermTests }
          : { schedulePeDuringTermTests: create.schedulePeDuringTermTests };
        records.set(key, value);
        return value;
      },
    },
  } as unknown as TeacherAcademicCalendarPreferenceStore;
}

describe('primary 2026-2027 calendar and PE scheduling preference', () => {
  it('treats official school holidays as unavailable for every preference value', () => {
    const cases = [
      ['2026-10-28', '2026-11-01'],
      ['2026-12-18', '2027-01-02'],
      ['2027-03-19', '2027-04-03'],
    ];
    for (const [start, end] of cases) {
      expect(isValidAcademicSchoolDate(start, '2026-2027', true)).toBe(false);
      expect(isValidAcademicSchoolDate(start, '2026-2027', false)).toBe(false);
      expect(isValidAcademicSchoolDate(end, '2026-2027', true)).toBe(false);
      expect(isValidAcademicSchoolDate(end, '2026-2027', false)).toBe(false);
    }
    expect(isValidAcademicSchoolDate('2026-11-02', '2026-2027')).toBe(true);
    expect(isValidAcademicSchoolDate('2027-01-03', '2026-2027')).toBe(true);
    expect(isValidAcademicSchoolDate('2027-04-04', '2026-2027')).toBe(true);
    expect(calendarEvent('2026-11-01')).toBe('عطلة الخريف');
  });

  it('keeps all official test dates eligible by default and excludes only their exact dates when disabled', () => {
    const calendar = getAcademicCalendar('2026-2027');
    const allDates = calendar.termTestPeriods!.flatMap((period) => period.dates);
    expect(allDates).toHaveLength(15);
    for (const date of allDates) {
      expect(isAcademicTermTestDate(date, '2026-2027')).toBe(true);
      expect(isValidAcademicSchoolDate(date, '2026-2027')).toBe(true);
      expect(isValidAcademicSchoolDate(date, '2026-2027', false)).toBe(false);
    }
    for (const date of ['2027-03-05', '2027-03-06']) {
      expect(isAcademicTermTestDate(date, '2026-2027')).toBe(false);
    }
  });

  it('shifts skipped test dates forward without deleting, duplicating, or reordering lessons', () => {
    const enabled = canonicalPlanningSessions(
      'lvl_p5',
      '2026-09-21',
      '2026-2027',
      0,
      undefined,
      'ONE_90',
      true
    );
    const disabled = canonicalPlanningSessions(
      'lvl_p5',
      '2026-09-21',
      '2026-2027',
      0,
      undefined,
      'ONE_90',
      false
    );
    const enabledIds = enabled.map((session) => session.referenceSessionId);
    const disabledIds = disabled.map((session) => session.referenceSessionId);
    const affectedIndex = enabled.findIndex((session) =>
      isAcademicTermTestDate(session.plannedDate, '2026-2027')
    );

    expect(affectedIndex).toBeGreaterThanOrEqual(0);
    expect(enabledIds).toEqual(disabledIds);
    expect(new Set(disabledIds).size).toBe(disabledIds.length);
    expect(Date.parse(disabled[affectedIndex].plannedDate)).toBeGreaterThan(
      Date.parse(enabled[affectedIndex].plannedDate)
    );
    expect(disabled[affectedIndex].plannedDate).toBe('2026-12-13');
    expect(disabled.every((session, index) => session.sequenceIndex === index + 1)).toBe(true);
    expect(
      disabled.every((session) => !isAcademicTermTestDate(session.plannedDate, '2026-2027'))
    ).toBe(true);
  });

  it('keeps weekly timetable constraints while shifting occurrences past tests and holidays', () => {
    const sessions = canonicalPlanningSessions(
      'lvl_p4',
      '2026-12-06',
      '2026-2027',
      0,
      undefined,
      'ONE_90',
      false
    );
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-A',
      'class-A',
      '2026-2027',
      sessions,
      [{ weekday: 0, startTime: '08:00', endTime: '09:30' }],
      'ONE_90',
      false
    );
    const pedagogicalSeeds = result.seeds.filter(
      (seed) => !seed.referenceSessionId.includes(':intro:')
    );
    const ids = pedagogicalSeeds.map((seed) => seed.referenceSessionId);

    expect(result.error).toBeUndefined();
    expect(ids).toEqual(sessions.map((session) => session.referenceSessionId));
    expect(new Set(ids).size).toBe(sessions.length);
    expect(pedagogicalSeeds.every((seed) => seed.plannedDate.getUTCDay() === 0)).toBe(true);
    expect(
      pedagogicalSeeds.every((seed) =>
        isValidAcademicSchoolDate(seed.plannedDate.toISOString().slice(0, 10), '2026-2027', false)
      )
    ).toBe(true);
  });

  it('defaults to enabled and isolates saved preferences by Teacher and academic year', async () => {
    const store = preferenceStore();
    expect(await getSchedulePeDuringTermTests('teacher-A', '2026-2027', store)).toBe(true);
    expect(await getSchedulePeDuringTermTests('teacher-B', '2026-2027', store)).toBe(true);

    await setSchedulePeDuringTermTests('teacher-A', '2026-2027', false, store);
    await setSchedulePeDuringTermTests('teacher-B', '2026-2027', true, store);
    expect(await getSchedulePeDuringTermTests('teacher-A', '2026-2027', store)).toBe(false);
    expect(await getSchedulePeDuringTermTests('teacher-B', '2026-2027', store)).toBe(true);
    expect(await getSchedulePeDuringTermTests('teacher-A', '2027-2028', store)).toBe(true);
  });
});

function calendarEvent(date: string): string | undefined {
  return getAcademicCalendar('2026-2027').events.find(
    (event) => event.startDate <= date && date <= event.endDate && event.type === 'SCHOOL_VACATION'
  )?.name;
}
