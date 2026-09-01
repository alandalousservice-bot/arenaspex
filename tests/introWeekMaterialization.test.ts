import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canonicalPlanningSessions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';
import { getAcademicCalendar, isValidAcademicSchoolDate } from '../src/data/academicCalendars';

const read = (file: string) => fs.readFileSync(file, 'utf8');
const slot = (weekday: number, startTime: string, endTime: string) => ({
  weekday,
  startTime,
  endTime,
});

const materialize = (
  levelId: string,
  slots: Array<{ weekday: number; startTime: string; endTime: string }>
) =>
  materializeClassPlannedSessionSeedsFromTimetable(
    'teacher-1',
    `class-${levelId}`,
    '2026-2027',
    canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027'),
    slots
  );

describe('official entry week operational materialization', () => {
  it('excludes Sunday before official entry and starts Sunday pedagogical work next week', () => {
    const result = materialize('lvl_p4', [slot(0, '08:00', '09:30')]);
    const canonical = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027');

    expect(result.error).toBeUndefined();
    expect(result.seeds.filter((seed) => seed.referenceSessionId.includes(':intro:'))).toEqual([]);
    expect(result.seeds[0].referenceSessionId).toBe(canonical[0].referenceSessionId);
    expect(result.seeds[0].plannedDate.toISOString().slice(0, 10)).toBe('2026-09-27');
  });

  it.each([
    [1, '2026-09-21'],
    [2, '2026-09-22'],
    [3, '2026-09-23'],
    [4, '2026-09-24'],
  ])('materializes a real %s timetable occurrence as intro on %s', (weekday, date) => {
    const result = materialize('lvl_p4', [slot(weekday, '08:00', '09:30')]);
    const intro = result.seeds.find((seed) => seed.referenceSessionId.includes(':intro:'));

    expect(intro?.plannedDate.toISOString().slice(0, 10)).toBe(date);
    expect(intro?.startTime).toBe('08:00');
    expect(
      result.seeds
        .find((seed) => !seed.referenceSessionId.includes(':intro:'))
        ?.plannedDate.toISOString()
        .slice(0, 10)
    ).toBe(
      weekday === 1
        ? '2026-09-28'
        : weekday === 2
          ? '2026-09-29'
          : weekday === 3
            ? '2026-09-30'
            : '2026-10-01'
    );
  });

  it('does not materialize Friday or Saturday timetable entries', () => {
    const result = materialize('lvl_p5', [slot(5, '08:00', '09:00'), slot(6, '08:00', '09:00')]);
    expect(result.seeds).toEqual([]);
    expect(result.error).toContain('توقيته الأسبوعي');
  });

  it('keeps diagnostic as canonical session zero and does not consume it for intro', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
      const canonical = canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027');
      expect(canonical[0].sessionType).toBe('تقويم تشخيصي');
      expect(canonical.some((session) => session.isIntro)).toBe(false);
      expect(canonical[0].referenceSessionId).toContain('sequence:1');
    }
  });

  it('preserves the requested pedagogical counts and adds intro operationally', () => {
    const counts = ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'].map(
      (levelId) => canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027').length
    );
    expect(counts).toEqual([56, 56, 56, 34, 34]);

    const result = materialize('lvl_p4', [slot(1, '08:00', '09:30')]);
    expect(result.seeds.filter((seed) => seed.referenceSessionId.includes(':intro:'))).toHaveLength(
      1
    );
    expect(result.seeds).toHaveLength(35);
  });

  it('supports different same-level timetables without changing pedagogical identity order', () => {
    const classA = materialize('lvl_p1', [slot(0, '08:00', '09:00'), slot(3, '10:00', '11:00')]);
    const classB = materialize('lvl_p1', [slot(1, '08:00', '09:00'), slot(4, '10:00', '11:00')]);
    const canonical = canonicalPlanningSessions('lvl_p1', '2026-09-21', '2026-2027');
    const pedagogicalA = classA.seeds.filter(
      (seed) => !seed.referenceSessionId.includes(':intro:')
    );
    const pedagogicalB = classB.seeds.filter(
      (seed) => !seed.referenceSessionId.includes(':intro:')
    );

    expect(pedagogicalA.map((seed) => seed.referenceSessionId)).toEqual(
      canonical.map((session) => session.referenceSessionId)
    );
    expect(pedagogicalB.map((seed) => seed.referenceSessionId)).toEqual(
      canonical.map((session) => session.referenceSessionId)
    );
    expect(classA.seeds.filter((seed) => seed.referenceSessionId.includes(':intro:'))).toHaveLength(
      1
    );
    expect(classB.seeds.filter((seed) => seed.referenceSessionId.includes(':intro:'))).toHaveLength(
      2
    );
    expect(pedagogicalA[0].plannedDate.toISOString().slice(0, 10)).toBe('2026-09-27');
    expect(pedagogicalB[0].plannedDate.toISOString().slice(0, 10)).toBe('2026-09-28');
  });

  it('preserves one-slot and multi-slot daily workload without fixed daily assumptions', () => {
    const oneSlot = materialize('lvl_p5', [slot(1, '08:00', '09:00')]);
    const fiveSlots = materialize('lvl_p5', [
      slot(1, '08:00', '09:00'),
      slot(1, '09:15', '10:15'),
      slot(1, '10:30', '11:30'),
      slot(1, '11:45', '12:45'),
      slot(1, '13:00', '14:00'),
    ]);
    expect(oneSlot.seeds[0].startTime).toBe('08:00');
    expect(fiveSlots.seeds.slice(0, 5).map((seed) => seed.startTime)).toEqual([
      '08:00',
      '09:15',
      '10:30',
      '11:45',
      '13:00',
    ]);
    expect(
      fiveSlots.seeds
        .slice(0, 5)
        .every((seed) => seed.plannedDate.toISOString().slice(0, 10) === '2026-09-21')
    ).toBe(true);
  });

  it('skips excluded dates without shifting a timetable occurrence to another weekday', () => {
    const result = materialize('lvl_p4', [slot(1, '08:00', '09:30')]);
    expect(
      result.seeds.every((seed) =>
        isValidAcademicSchoolDate(seed.plannedDate.toISOString().slice(0, 10), '2026-2027')
      )
    ).toBe(true);
    expect(
      result.seeds.every((seed) => seed.plannedDate.toISOString().endsWith('T00:00:00.000Z'))
    ).toBe(true);
    expect(getAcademicCalendar('2026-2027').schoolStart).toBe('2026-09-21');
  });

  it('keeps intro identity separate, memo behavior unchanged, and avoids UI scheduling hacks', () => {
    const result = materialize('lvl_p4', [slot(1, '08:00', '09:30')]);
    const intro = result.seeds.find((seed) => seed.referenceSessionId.includes(':intro:'))!;
    const diagnostic = result.seeds.find((seed) => !seed.referenceSessionId.includes(':intro:'))!;
    const planning = read('src/services/teacherPlanning.service.ts');
    const notebook = read('src/components/notebook/DailyNotebookView.tsx');
    const workflow = read('src/services/lessonPlanWorkflow.service.ts');

    expect(intro.referenceSessionId).not.toBe(diagnostic.referenceSessionId);
    expect(intro.id).not.toBe(diagnostic.id);
    expect(planning).toContain("fieldName: 'أسبوع التعارف والتنظيم'");
    expect(read('src/server/apiRouter.ts')).toContain('introPlanningReference');
    expect(workflow).toContain("sessionType === 'تعارف وتنظيم'");
    expect(workflow).toContain('return false');
    expect(planning).not.toContain('LessonPlan');
    expect(notebook).not.toContain('materializeClassPlannedSessionSeedsFromTimetable');
  });

  it('leaves protected rebuild and persistence schema boundaries intact', () => {
    const router = read('src/server/apiRouter.ts');
    expect(router).toContain('decideClassSessionRebuild');
    expect(router).toContain('executionDependencyIds');
    expect(router).toContain('prisma.$transaction');
    expect(read('prisma/schema.prisma')).not.toContain('IntroOperationalSession');
    expect(fs.readdirSync('prisma/migrations').some((name) => name.includes('intro_week'))).toBe(
      false
    );
  });
});
