import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildClassPlannedSessionSeeds,
  canonicalPlanningSessions,
  findCanonicalPlanningSession,
} from '../src/services/teacherPlanning.service';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('class-scoped Teacher planning sessions', () => {
  it('shares canonical reference identity while isolating operational IDs and dates', () => {
    const classA = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2025-2026',
      'lvl_p1',
      '2025-09-22'
    );
    const classB = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-b',
      '2025-2026',
      'lvl_p1',
      '2025-10-06'
    );
    expect(classA.length).toBeGreaterThan(0);
    expect(classA.map((session) => session.referenceSessionId)).toEqual(
      classB.map((session) => session.referenceSessionId)
    );
    expect(classA[0].id).not.toBe(classB[0].id);
    expect(classA[0].plannedDate.toISOString()).not.toBe(classB[0].plannedDate.toISOString());
    expect(classA.every((session) => session.classId === 'class-a')).toBe(true);
    expect(classB.every((session) => session.classId === 'class-b')).toBe(true);
  });

  it('keeps initialization deterministic and grade-specific durations', () => {
    const first = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2025-2026',
      'lvl_p1',
      '2025-09-22'
    );
    const second = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2025-2026',
      'lvl_p1',
      '2025-09-22'
    );
    expect(first.map((session) => session.id)).toEqual(second.map((session) => session.id));
    expect(
      canonicalPlanningSessions('lvl_p4', '2025-09-22').every(
        (session) => session.durationMinutes === 90
      )
    ).toBe(true);
    expect(
      canonicalPlanningSessions('lvl_p5', '2025-09-22').every(
        (session) => session.durationMinutes === 60
      )
    ).toBe(true);
  });

  it('rejects unknown reference identities', () => {
    expect(findCanonicalPlanningSession('lvl_p1', 'not-a-reference', '2025-09-22')).toBeNull();
  });

  it('declares additive persistence and protected ownership routes', () => {
    const schema = read('prisma/schema.prisma');
    const router = read('src/server/apiRouter.ts');
    const migration = read('prisma/migrations/20260825090000_class_planned_sessions/migration.sql');
    expect(schema).toContain('model ClassPlannedSession');
    expect(schema).toContain('@@unique([classId, academicYearId, referenceSessionId])');
    expect(migration).toContain('CREATE TABLE "ClassPlannedSession"');
    expect(router).toContain("apiRouter.get('/teacher/planning/classes/:classId/sessions'");
    expect(router).toContain(
      "apiRouter.post('/teacher/planning/classes/:classId/sessions/initialize'"
    );
    expect(router).toContain(
      "apiRouter.patch('/teacher/planning/classes/:classId/sessions/:sessionId'"
    );
    expect(router).toContain('teacherId: req.user!.id');
    expect(router).toContain(
      'classPlannedSession.createMany({ data: seeds, skipDuplicates: true })'
    );
  });

  it('does not make legacy local weekly storage authoritative', () => {
    expect(read('src/hooks/usePlatformStore.ts')).toContain('spex_weekly_schedule');
    expect(read('src/services/teacherPlanning.service.ts')).not.toContain('spex_weekly_schedule');
  });
});
