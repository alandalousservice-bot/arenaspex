import { describe, expect, it } from 'vitest';
import {
  annualDistributionUnitSummary,
  buildAnnualDistributionWeeks,
  buildClassPlannedSessionSeedsFromCanonicalSessions,
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';
import { lessonPhaseBudgetsForDuration } from '../src/services/lessonTiming.service';

const academicYearId = '2026-2027';
const planningStartDate = '2026-09-21';
const timetable = [
  { weekday: 1, startTime: '08:00', endTime: '09:30' },
  { weekday: 3, startTime: '10:00', endTime: '11:30' },
];

function grade4Distribution(mode: 'ONE_90' | 'TWO_45') {
  return generateAllPrimaryLevelDistributions(
    academicYearId,
    planningStartDate,
    undefined,
    mode
  ).levels.find((level) => level.levelId === 'lvl_p4')!;
}

describe('Grade 4 mode-aware annual distribution', () => {
  it('generates one learning reference per objective for ONE_90', () => {
    const level = grade4Distribution('ONE_90');
    const learning = level.sessions.filter((session) => session.sessionType === 'تعلمية');
    const objectives = learning.map((session) => session.objectiveId);

    expect(learning).toHaveLength(18);
    expect(new Set(objectives).size).toBe(18);
    expect(level.sessions.map((session) => session.sequenceIndex)).toEqual(
      level.sessions.map((_, index) => index + 1)
    );
    expect(
      learning.every((session, index) => session.fieldSessionNumber > 0 && objectives[index])
    ).toBe(true);
  });

  it('keeps ONE_90 at one weekly pedagogical lesson and coherent counters/hours', () => {
    const level = grade4Distribution('ONE_90');
    const weeks = buildAnnualDistributionWeeks(level, undefined, 'ONE_90');
    const summary = annualDistributionUnitSummary(weeks);
    const learningSlots = weeks
      .flatMap((week) => week.slots)
      .filter((slot) => slot.sessionType === 'تعلمية');

    expect(level.sessionCount).toBe(31);
    expect(level.annualHours).toBe(45);
    expect(summary.weekCount).toBe(31);
    expect(summary.learningUnitCount).toBe(18);
    expect(learningSlots).toHaveLength(18);
    expect(learningSlots.every((slot) => slot.meetingIndex === null)).toBe(true);
    expect(learningSlots.some((slot) => /\(أ|ب\)/u.test(slot.displayLabel))).toBe(false);
  });

  it('materializes one 90-minute CPS and keeps the 15/65/10 budget', () => {
    const level = grade4Distribution('ONE_90');
    const seeds = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-one90',
      'class-one90',
      academicYearId,
      level.sessions,
      timetable,
      'ONE_90'
    );
    const pedagogical = seeds.filter((seed) => !seed.referenceSessionId.includes(':intro:'));

    expect(pedagogical).toHaveLength(30);
    expect(new Set(pedagogical.map((seed) => seed.referenceSessionId)).size).toBe(30);
    expect(pedagogical.every((seed) => seed.durationMinutes === 90)).toBe(true);
    expect(lessonPhaseBudgetsForDuration(90)).toEqual({ warmup: 15, main: 65, final: 10 });
  });

  it('preserves TWO_45 paired realization and starts the next objective after each pair', () => {
    const level = grade4Distribution('TWO_45');
    const learning = level.sessions.filter((session) => session.sessionType === 'تعلمية');
    const groups = [...new Set(learning.map((session) => session.objectiveGroupId))];
    const seeds = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-two45',
      'class-two45',
      academicYearId,
      level.sessions,
      timetable,
      'TWO_45'
    );
    const learningSeeds = seeds.filter((seed) =>
      learning.some((session) => session.referenceSessionId === seed.referenceSessionId)
    );

    expect(learning).toHaveLength(36);
    expect(groups).toHaveLength(18);
    expect(learningSeeds).toHaveLength(36);
    expect(learningSeeds.every((seed) => seed.durationMinutes === 45)).toBe(true);
    expect(lessonPhaseBudgetsForDuration(45)).toEqual({ warmup: 10, main: 30, final: 5 });
    for (const group of groups) {
      expect(learning.filter((session) => session.objectiveGroupId === group)).toHaveLength(2);
    }
    expect(
      learning.every(
        (session, index) =>
          index === 0 || session.objectiveGroupId === learning[index - (index % 2)].objectiveGroupId
      )
    ).toBe(true);
  });

  it('keeps non-Grade-4 occurrence semantics unchanged', () => {
    const grade1 = canonicalPlanningSessions('lvl_p1', planningStartDate, academicYearId);
    const grade2 = canonicalPlanningSessions('lvl_p2', planningStartDate, academicYearId);
    const grade3 = canonicalPlanningSessions('lvl_p3', planningStartDate, academicYearId);
    const grade5 = canonicalPlanningSessions('lvl_p5', planningStartDate, academicYearId);

    expect(grade1.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(42);
    expect(grade2.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(42);
    expect(grade3.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(42);
    expect(grade5.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(18);
  });
});
