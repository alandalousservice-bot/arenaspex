import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildClassPlannedSessionSeeds,
  canonicalPlanningSessions,
  findCanonicalPlanningSession,
  effectiveCurriculumObjective,
  effectivePlanningObjective,
  isValidPlanningDate,
} from '../src/services/teacherPlanning.service';
import { COMPLETE_ANNUAL_CURRICULUM } from '../src/data/algerianCurriculum';

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

  it('preserves curriculum parity, sequencing, and effective wording overrides', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
      const curriculum = COMPLETE_ANNUAL_CURRICULUM[levelId];
      expect(Object.keys(curriculum.fields)).toHaveLength(3);
      expect(curriculum.totalSessions).toBe(30);
      expect(
        Object.values(curriculum.fields).reduce(
          (total, field) => total + field.sessionsList.length,
          0
        )
      ).toBe(30);
      expect(canonicalPlanningSessions(levelId, '2025-09-22')).toHaveLength(
        ['lvl_p1', 'lvl_p2', 'lvl_p3'].includes(levelId) ? 54 : 33
      );
    }
    const reference = canonicalPlanningSessions('lvl_p1', '2025-09-22').find(
      (session) => session.objectiveId === 'f_locomotion__2'
    )!;
    const override = { [reference.objectiveId!]: { objective: 'هدف معدل للأستاذ' } };
    expect(effectivePlanningObjective(reference, override)).toBe('هدف معدل للأستاذ');
    expect(effectivePlanningObjective(reference, override)).not.toBe(reference.objective);
    expect(
      effectiveCurriculumObjective('f_locomotion', 2, 'مرجع', {
        f_locomotion__2: override[reference.objectiveId!],
      })
    ).toBe('هدف معدل للأستاذ');
    expect(reference.referenceSessionId).toBeTruthy();
  });

  it('uses one school-day and holiday policy for generated and manual dates', () => {
    expect(isValidPlanningDate('2025-09-22')).toBe(true);
    expect(isValidPlanningDate('2025-09-19')).toBe(false);
    expect(isValidPlanningDate('2025-12-22')).toBe(false);
  });

  it('declares additive persistence and protected ownership routes', () => {
    const schema = read('prisma/schema.prisma');
    const router = read('src/server/apiRouter.ts');
    const migration = read('prisma/migrations/20260825090000_class_planned_sessions/migration.sql');
    const routerContract = router.replace(/\s+/g, ' ').replace(/\(\s+/g, '(');
    expect(schema).toContain('model ClassPlannedSession');
    expect(schema).toContain('@@unique([classId, academicYearId, referenceSessionId])');
    expect(migration).toContain('CREATE TABLE "ClassPlannedSession"');
    expect(routerContract).toContain("apiRouter.get('/teacher/planning/classes/:classId/sessions'");
    expect(routerContract).toContain(
      "apiRouter.post('/teacher/planning/classes/:classId/sessions/initialize'"
    );
    expect(routerContract).toContain(
      "apiRouter.patch('/teacher/planning/classes/:classId/sessions/:sessionId'"
    );
    expect(routerContract).toContain('teacherId: req.user!.id');
    expect(routerContract).toContain('prisma.$transaction(');
    expect(routerContract).toContain('classPlannedSession.update');
    expect(routerContract).toContain('classPlannedSession.create');
  });

  it('regenerates dates while preserving canonical and operational identities', () => {
    const original = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2025-2026',
      'lvl_p1',
      '2025-09-22'
    );
    const regenerated = buildClassPlannedSessionSeeds(
      'teacher-1',
      'class-a',
      '2025-2026',
      'lvl_p1',
      '2025-10-06'
    );
    expect(regenerated.map((session) => session.id)).toEqual(original.map((session) => session.id));
    expect(regenerated.map((session) => session.referenceSessionId)).toEqual(
      original.map((session) => session.referenceSessionId)
    );
    expect(regenerated.map((session) => session.plannedDate.toISOString())).not.toEqual(
      original.map((session) => session.plannedDate.toISOString())
    );
  });

  it('does not make legacy local weekly storage authoritative', () => {
    expect(read('src/hooks/usePlatformStore.ts')).toContain('spex_weekly_schedule');
    expect(read('src/services/teacherPlanning.service.ts')).not.toContain('spex_weekly_schedule');
  });
});
