import { describe, expect, it } from 'vitest';
import {
  basePlanningReferenceId,
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';

const slot = (weekday: number, startTime = '08:00', endTime = '09:00') => ({
  weekday,
  startTime,
  endTime,
});

const pedagogicalSeeds = (
  seeds: ReturnType<typeof materializeClassPlannedSessionSeedsFromTimetable>['seeds']
) => seeds.filter((seed) => !seed.referenceSessionId.includes(':intro:'));

const seedsForCanonicalGroup = (
  seeds: ReturnType<typeof materializeClassPlannedSessionSeedsFromTimetable>['seeds'],
  references: string[]
) => {
  const referenceSet = new Set(references);
  return seeds.filter((seed) => referenceSet.has(basePlanningReferenceId(seed.referenceSessionId)));
};

describe('authoritative session occurrence rules', () => {
  it('keeps annual distribution level/week based and leaves timetable details operational', () => {
    const annual = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21');
    expect(annual.levels.map((level) => level.sessionCount)).toEqual([56, 56, 56, 34, 34]);

    const canonical = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027');
    expect(canonical.every((session) => !Object.hasOwn(session, 'weekday'))).toBe(true);
    expect(canonical.every((session) => !Object.hasOwn(session, 'startTime'))).toBe(true);

    const mondayWednesday = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-a',
      '2026-2027',
      canonical,
      [slot(1), slot(3, '10:00', '11:00')]
    );
    const tuesdayThursday = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-b',
      '2026-2027',
      canonical,
      [slot(2), slot(4, '10:00', '11:00')]
    );

    expect(mondayWednesday.error).toBeUndefined();
    expect(tuesdayThursday.error).toBeUndefined();
    const firstA = pedagogicalSeeds(mondayWednesday.seeds)[0];
    const firstB = pedagogicalSeeds(tuesdayThursday.seeds)[0];
    expect(firstA.startTime).toBe('08:00');
    expect(firstB.startTime).toBe('08:00');
    expect(firstA.plannedDate.toISOString().slice(0, 10)).not.toBe(
      firstB.plannedDate.toISOString().slice(0, 10)
    );
  });

  it('materializes every Grade 1–4 learning objective as two weekday meetings', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4']) {
      const canonical = canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027');
      const result = materializeClassPlannedSessionSeedsFromTimetable(
        'teacher-1',
        `class-${levelId}`,
        '2026-2027',
        canonical,
        [slot(1), slot(3, '10:00', '11:00')]
      );
      expect(result.error).toBeUndefined();

      const seeds = pedagogicalSeeds(result.seeds);
      const learningGroups = [
        ...new Set(
          canonical
            .filter((session) => session.sessionType === 'تعلمية')
            .map((session) => session.objectiveGroupId)
        ),
      ];
      const firstGroup = learningGroups[0];
      const firstReferences = canonical
        .filter((session) => session.objectiveGroupId === firstGroup)
        .map((session) => session.referenceSessionId);
      const firstPair = seedsForCanonicalGroup(seeds, firstReferences);

      expect(firstPair).toHaveLength(2);
      expect(new Set(firstPair.map((seed) => seed.plannedDate.getUTCDay())).size).toBe(2);
      expect(
        new Set(
          canonical
            .filter((session) => session.objectiveGroupId === firstGroup)
            .map((session) => session.objective)
        ).size
      ).toBe(1);

      const secondGroup = learningGroups[1];
      const secondReferences = canonical
        .filter((session) => session.objectiveGroupId === secondGroup)
        .map((session) => session.referenceSessionId);
      const secondPair = seedsForCanonicalGroup(seeds, secondReferences);
      expect(secondPair).toHaveLength(2);
      const firstPairLastIndex = Math.max(...firstPair.map((seed) => seeds.indexOf(seed)));
      const secondPairFirstIndex = Math.min(...secondPair.map((seed) => seeds.indexOf(seed)));
      expect(firstPairLastIndex).toBeLessThan(secondPairFirstIndex);
    }
  });

  it('keeps diagnostic and integration sessions single, without artificial pairing', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4']) {
      const canonical = canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027');
      const result = materializeClassPlannedSessionSeedsFromTimetable(
        'teacher-1',
        `class-special-${levelId}`,
        '2026-2027',
        canonical,
        [slot(1), slot(3, '10:00', '11:00')]
      );
      const seeds = pedagogicalSeeds(result.seeds);

      for (const session of canonical.filter(
        (item) => item.sessionType === 'تقويم تشخيصي' || item.sessionType === 'إدماجية'
      )) {
        const matches = seedsForCanonicalGroup(seeds, [session.referenceSessionId]);
        expect(matches).toHaveLength(1);
        expect(matches[0].referenceSessionId).not.toContain(':meeting:');
      }
    }
  });

  it('keeps Grade 5 at one operational meeting per canonical session', () => {
    const canonical = canonicalPlanningSessions('lvl_p5', '2026-09-21', '2026-2027');
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-p5',
      '2026-2027',
      canonical,
      [slot(1)]
    );
    const seeds = pedagogicalSeeds(result.seeds);

    expect(result.error).toBeUndefined();
    expect(seeds).toHaveLength(canonical.length);
    expect(seeds.every((seed) => !seed.referenceSessionId.includes(':meeting:'))).toBe(true);
    expect(
      new Set(seeds.map((seed) => basePlanningReferenceId(seed.referenceSessionId))).size
    ).toBe(canonical.length);
  });

  it('realizes the same level sequence independently for different class timetables', () => {
    const canonical = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027');
    const classA = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-a',
      '2026-2027',
      canonical,
      [slot(1), slot(3)]
    );
    const classB = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-b',
      '2026-2027',
      canonical,
      [slot(2), slot(4)]
    );
    const canonicalReferences = new Set(canonical.map((session) => session.referenceSessionId));
    const baseReferences = (seeds: typeof classA.seeds) =>
      new Set(
        pedagogicalSeeds(seeds).map((seed) => basePlanningReferenceId(seed.referenceSessionId))
      );

    expect(baseReferences(classA.seeds)).toEqual(canonicalReferences);
    expect(baseReferences(classB.seeds)).toEqual(canonicalReferences);
  });
});
