import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildClassPlannedSessionSeedsFromCanonicalSessions,
  canonicalPlanningSessions,
  materializeClassPlannedSessionSeedsFromTimetable,
} from '../src/services/teacherPlanning.service';
import { earliestPlanningDate } from '../src/services/dailyNotebook.service';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const slot = (weekday: number, startTime: string, endTime: string) => ({
  weekday,
  startTime,
  endTime,
});

describe('Daily Notebook timetable materialization', () => {
  it('uses the timetable weekday instead of the annual date for class presence', () => {
    const annual = canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026');
    const monday = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-monday',
      '2025-2026',
      annual,
      [slot(1, '08:00', '09:30')]
    );
    const tuesday = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-tuesday',
      '2025-2026',
      annual,
      [slot(2, '10:00', '11:30')]
    );

    expect(monday.error).toBeUndefined();
    expect(tuesday.error).toBeUndefined();
    expect(monday.seeds[0].plannedDate.toISOString().slice(0, 10)).toBe('2025-09-22');
    expect(tuesday.seeds[0].plannedDate.toISOString().slice(0, 10)).toBe('2025-09-23');
    expect(monday.seeds[0].plannedDate).not.toEqual(tuesday.seeds[0].plannedDate);
    expect(monday.seeds[0].startTime).toBe('08:00');
    expect(tuesday.seeds[0].startTime).toBe('10:00');
  });

  it('keeps two Monday classes and their distinct timetable times', () => {
    const annual = canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026');
    const classA = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-a',
      '2025-2026',
      annual,
      [slot(1, '08:00', '09:30')]
    );
    const classB = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-b',
      '2025-2026',
      annual,
      [slot(1, '10:00', '11:30')]
    );

    expect(classA.seeds).toHaveLength(34);
    expect(classB.seeds).toHaveLength(34);
    expect(classA.seeds[0].plannedDate.toISOString().slice(0, 10)).toBe(
      classB.seeds[0].plannedDate.toISOString().slice(0, 10)
    );
    expect(classA.seeds[0].startTime).toBe('08:00');
    expect(classB.seeds[0].startTime).toBe('10:00');
  });

  it('preserves both weekly slots for grades 1–3 without an arbitrary session cap', () => {
    const annual = canonicalPlanningSessions('lvl_p1', '2025-09-21', '2025-2026');
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-p1',
      '2025-2026',
      annual,
      [slot(1, '08:00', '09:00'), slot(3, '10:00', '11:00')]
    );

    expect(result.error).toBeUndefined();
    expect(result.seeds).toHaveLength(56);
    expect(
      result.seeds
        .slice(0, 4)
        .map((item) => [item.plannedDate.toISOString().slice(0, 10), item.startTime])
    ).toEqual([
      ['2025-09-22', '08:00'],
      ['2025-09-24', '10:00'],
      ['2025-09-29', '08:00'],
      ['2025-10-01', '10:00'],
    ]);
    expect(result.seeds.every((item) => item.durationMinutes === 60)).toBe(true);
  });

  it('keeps G4 and G5 grade-specific sequence counts and durations', () => {
    const g4 = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-p4',
      '2025-2026',
      canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026'),
      [slot(2, '08:00', '09:30')]
    );
    const g5 = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-p5',
      '2025-2026',
      canonicalPlanningSessions('lvl_p5', '2025-09-21', '2025-2026'),
      [slot(4, '13:00', '14:00')]
    );

    expect(g4.seeds).toHaveLength(34);
    expect(g4.seeds.every((item) => item.durationMinutes === 90)).toBe(true);
    expect(g5.seeds).toHaveLength(34);
    expect(g5.seeds.every((item) => item.durationMinutes === 60)).toBe(true);
  });

  it('materializes the introductory session on the real class timetable', () => {
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-intro',
      '2025-2026',
      canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026'),
      [slot(3, '09:00', '10:30')]
    );

    expect(result.seeds[0].referenceSessionId).toContain('sequence:1');
    expect(result.seeds[0].plannedDate.toISOString().slice(0, 10)).toBe('2025-09-24');
    expect(result.seeds[0].startTime).toBe('09:00');
  });

  it('does not fabricate a weekday when a class has no weekly timetable', () => {
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-unscheduled',
      '2025-2026',
      canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026'),
      []
    );

    expect(result.seeds).toEqual([]);
    expect(result.error).toContain('توقيته الأسبوعي');
  });

  it('skips academic holidays while retaining local date semantics', () => {
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-holiday',
      '2025-2026',
      canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026'),
      [slot(1, '08:00', '09:30')]
    );

    expect(result.seeds).toHaveLength(34);
    expect(
      result.seeds.every((item) => item.plannedDate.toISOString().endsWith('T00:00:00.000Z'))
    ).toBe(true);
    expect(
      result.seeds.some((item) => item.plannedDate.toISOString().slice(0, 10) === '2025-12-22')
    ).toBe(false);
  });

  it('keeps pedagogical identity, operational identity, and first-date behavior stable', () => {
    const canonical = canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026');
    const result = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-safe',
      '2025-2026',
      canonical,
      [slot(2, '08:00', '09:30')]
    );
    const legacy = buildClassPlannedSessionSeedsFromCanonicalSessions(
      'teacher-1',
      'class-safe',
      '2025-2026',
      canonical
    );

    expect(result.seeds.map((item) => item.id)).toEqual(legacy.map((item) => item.id));
    expect(result.seeds.map((item) => item.referenceSessionId)).toEqual(
      canonical.map((item) => item.referenceSessionId)
    );
    expect(
      earliestPlanningDate(
        result.seeds.map((item) => ({
          plannedDate: item.plannedDate.toISOString().slice(0, 10),
        }))
      )
    ).toBe('2025-09-23');
    expect(result.seeds[0].venue).toBeNull();
    expect(result.seeds[0].operationalNote).toBeNull();
  });

  it('is idempotent and leaves executed-data safeguards in place', () => {
    const canonical = canonicalPlanningSessions('lvl_p4', '2025-09-21', '2025-2026');
    const timetable = [slot(1, '08:00', '09:30')];
    const first = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-idempotent',
      '2025-2026',
      canonical,
      timetable
    );
    const second = materializeClassPlannedSessionSeedsFromTimetable(
      'teacher-1',
      'class-idempotent',
      '2025-2026',
      canonical,
      timetable
    );

    expect(second.seeds).toEqual(first.seeds);
    const router = read('src/server/apiRouter.ts');
    expect(router).toContain('decideClassSessionRebuild');
    expect(router).toContain('prisma.$transaction');
    expect(router).toContain('weeklySlotsForTeacher');
    expect(router).toContain('materializeClassPlannedSessionSeedsFromTimetable');
    expect(router).not.toContain('classPlannedSession.deleteMany');
    expect(read('src/hooks/usePlatformStore.ts')).toContain('fetchTeacherWeeklyTimetable');
  });
});
