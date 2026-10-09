import { describe, expect, it } from 'vitest';
import {
  basePlanningReferenceId,
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';

const slot = (weekday: number, startTime = '08:00', endTime = '09:30') => ({
  weekday,
  startTime,
  endTime,
});

const pedagogicalSeeds = (
  seeds: ReturnType<typeof materializeClassPlannedSessionSeedsFromTimetable>['seeds']
) => seeds.filter((seed) => !seed.referenceSessionId.includes(':intro:'));

describe('authoritative session occurrence rules', () => {
  it('keeps annual reference sequences independent from class timetable details', () => {
    const annual = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    expect(annual.levels.map((level) => level.sessionCount)).toEqual([34, 34, 34, 31, 31]);

    const canonical = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels.find(
      (level) => level.levelId === 'lvl_p4'
    )!.sessions;
    expect(canonical.every((session) => !Object.hasOwn(session, 'weekday'))).toBe(true);
    expect(canonical.every((session) => !Object.hasOwn(session, 'startTime'))).toBe(true);

    const classA = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-a',
      '2026-2027',
      canonical,
      [slot(1)]
    );
    const classB = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-b',
      '2026-2027',
      canonical,
      [slot(2)]
    );
    expect(classA.error).toBeUndefined();
    expect(classB.error).toBeUndefined();
    expect(pedagogicalSeeds(classA.seeds)).toHaveLength(canonical.length);
    expect(pedagogicalSeeds(classB.seeds)).toHaveLength(canonical.length);
    expect(pedagogicalSeeds(classA.seeds)[0].plannedDate.toISOString().slice(0, 10)).not.toBe(
      pedagogicalSeeds(classB.seeds)[0].plannedDate.toISOString().slice(0, 10)
    );
  });

  it('materializes exactly one weekly operational lesson per canonical reference', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
      const canonical = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels.find(
        (level) => level.levelId === levelId
      )!.sessions;
      const duration = levelId === 'lvl_p4' ? 90 : 60;
      const result = materializeClassPlannedSessionSeedsFromTimetable(
        'teacher-1',
        `class-${levelId}`,
        '2026-2027',
        canonical,
        [slot(1, '08:00', duration === 90 ? '09:30' : '09:00')],
        levelId === 'lvl_p4' ? 'TWO_45' : undefined
      );
      expect(result.error).toBeUndefined();
      const seeds = pedagogicalSeeds(result.seeds);
      expect(seeds).toHaveLength(canonical.length);
      expect(seeds.every((seed) => seed.durationMinutes === duration)).toBe(true);
      expect(seeds.every((seed) => !seed.referenceSessionId.includes(':meeting:'))).toBe(true);
      expect(
        new Set(seeds.map((seed) => basePlanningReferenceId(seed.referenceSessionId))).size
      ).toBe(canonical.length);
      const schoolWeeks = seeds.map((seed) => {
        const date = new Date(seed.plannedDate);
        date.setUTCDate(date.getUTCDate() - date.getUTCDay());
        return date.toISOString().slice(0, 10);
      });
      expect(new Set(schoolWeeks).size).toBe(seeds.length);
    }
  });

  it('rejects a timetable slot that cannot fit the authoritative lesson duration', () => {
    const canonical = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels.find(
      (level) => level.levelId === 'lvl_p4'
    )!.sessions;
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-short-slot',
      '2026-2027',
      canonical,
      [slot(1, '08:00', '09:00')]
    );
    expect(result.error).toBeTruthy();
    expect(result.seeds).toHaveLength(0);
  });
});
