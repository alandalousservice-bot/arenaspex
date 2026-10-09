import { describe, expect, it } from 'vitest';
import {
  annualDistributionUnitSummary,
  buildAnnualDistributionWeeks,
  buildClassPlannedSessionSeedsFromCanonicalSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';
import { resolveGrade4WeeklyScheduleMode } from '../src/services/classPlanningConfiguration.service';
import { resolveOperationalLessonDuration } from '../src/services/lessonTiming.service';
import { isValidAcademicSchoolDate } from '../src/data/academicCalendars';

const academicYearId = '2026-2027';
const planningStartDate = '2026-09-21';
const timetable = [{ weekday: 1, startTime: '08:00', endTime: '09:30' }];

function generated(mode: 'ONE_90' | 'TWO_45', schedulePeDuringTermTests = true) {
  return generateAllPrimaryLevelDistributions(
    academicYearId,
    planningStartDate,
    undefined,
    mode,
    schedulePeDuringTermTests
  );
}

describe('authoritative primary weekly annual distributions', () => {
  it.each(['ONE_90', 'TWO_45'] as const)(
    'keeps every level at one reference lesson per week under legacy mode %s',
    (mode) => {
      const result = generated(mode);
      expect(result.levels.map((level) => level.levelId)).toEqual([
        'lvl_p1',
        'lvl_p2',
        'lvl_p3',
        'lvl_p4',
        'lvl_p5',
      ]);
      for (const level of result.levels) {
        expect(level.status).toBe('generated');
        expect(level.durationMinutes).toBe(level.grade === 4 ? 90 : 60);
        expect(
          level.sessions.every((session) => session.durationMinutes === level.durationMinutes)
        ).toBe(true);
        const weeks = buildAnnualDistributionWeeks(level, undefined, mode);
        expect(annualDistributionUnitSummary(weeks).weekCount).toBe(weeks.length);
        expect(weeks.slice(1).every((week) => week.slots.length === 1)).toBe(true);
        expect(new Set(level.sessions.map((session) => session.referenceSessionId)).size).toBe(
          level.sessions.length
        );
      }
    }
  );

  it('preserves shared family structures while keeping five distinct level identities', () => {
    const levels = generated('TWO_45').levels;
    const structure = (level: (typeof levels)[number]) =>
      level.sessions.map((session) =>
        [
          session.domainId,
          session.sessionType,
          session.fieldSessionNumber,
          Boolean(session.objectiveId),
        ].join('|')
      );
    expect(structure(levels[0])).toEqual(structure(levels[1]));
    expect(structure(levels[1])).toEqual(structure(levels[2]));
    expect(structure(levels[3])).toEqual(structure(levels[4]));
    expect(new Set(levels.map((level) => level.levelId)).size).toBe(5);
    expect(
      new Set(
        levels.flatMap((level) => level.sessions.map((session) => session.referenceSessionId))
      ).size
    ).toBe(levels.reduce((sum, level) => sum + level.sessions.length, 0));
  });

  it.each([true, false])('keeps holiday and test-date rules with preference=%s', (preference) => {
    const levels = generated('TWO_45', preference).levels;
    for (const level of levels) {
      expect(level.status).toBe('generated');
      expect(level.sessions.map((session) => session.sequenceIndex)).toEqual(
        level.sessions.map((_, index) => index + 1)
      );
      expect(
        level.sessions.every((session) =>
          isValidAcademicSchoolDate(session.plannedDate, academicYearId, preference)
        )
      ).toBe(true);
      expect(new Set(level.sessions.map((session) => session.referenceSessionId)).size).toBe(
        level.sessions.length
      );
    }
    expect(isValidAcademicSchoolDate('2026-10-28', academicYearId, preference)).toBe(false);
    expect(isValidAcademicSchoolDate('2026-12-06', academicYearId, preference)).toBe(preference);
  });

  it('materializes one official-duration operational lesson per real timetable week', () => {
    const level = generated('TWO_45').levels.find((item) => item.levelId === 'lvl_p4')!;
    const seeds = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-year4',
      'real-year4-class',
      academicYearId,
      level.sessions,
      timetable,
      'TWO_45'
    );
    const pedagogical = seeds.filter((seed) => !seed.referenceSessionId.includes(':intro:'));
    const occurrencesPerWeek = new Map<string, number>();
    for (const seed of pedagogical) {
      const sunday = new Date(seed.plannedDate);
      sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
      const key = sunday.toISOString().slice(0, 10);
      occurrencesPerWeek.set(key, (occurrencesPerWeek.get(key) || 0) + 1);
    }
    expect(seeds.length).toBe(level.sessions.length + 1);
    expect(pedagogical.every((seed) => seed.durationMinutes === 90)).toBe(true);
    expect([...occurrencesPerWeek.values()].every((count) => count === 1)).toBe(true);
  });

  it('ignores obsolete two-by-45-minute configuration for Year 4', () => {
    expect(resolveGrade4WeeklyScheduleMode('TWO_45')).toBe('ONE_90');
    expect(
      resolveOperationalLessonDuration({ gradeId: 'lvl_p4', classPlanningMode: 'TWO_45' })
    ).toBe(90);
    const level = generated('TWO_45').levels.find((item) => item.levelId === 'lvl_p4')!;
    const seeds = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-year4',
      'real-year4-class',
      academicYearId,
      level.sessions
    );
    expect(seeds.every((seed) => seed.durationMinutes === 90)).toBe(true);
  });
});
