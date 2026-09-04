import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPLETE_ANNUAL_CURRICULUM } from '../src/data/algerianCurriculum';
import {
  addTeacherLearningObjective,
  deleteTeacherLearningObjective,
  normalizeTeacherLearningPlan,
  reorderTeacherLearningObjectives,
  seedTeacherLearningPlan,
  teacherLearningPlanSchema,
  updateTeacherLearningObjective,
} from '../src/services/teacherLearningPlan.service';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('teacher-owned learning plan foundation', () => {
  it('keeps the official curriculum as the immutable seven-objective seed', () => {
    const before = JSON.stringify(COMPLETE_ANNUAL_CURRICULUM);
    const plan = seedTeacherLearningPlan('lvl_p1');
    expect(JSON.stringify(COMPLETE_ANNUAL_CURRICULUM)).toBe(before);
    expect(plan.domains).toHaveLength(3);
    expect(plan.domains.every((domain) => domain.objectives.length === 7)).toBe(true);
  });

  it('preserves legacy section wording while seeding a plan', () => {
    const plan = seedTeacherLearningPlan('lvl_p1', {
      f_locomotion__2: { objective: 'صياغة الأستاذ للهدف الثاني' },
    });
    const objective = plan.domains
      .find((domain) => domain.fieldId === 'f_locomotion')!
      .objectives.find((item) => item.sourceReferenceId === 'f_locomotion__2');
    expect(objective?.text).toBe('صياغة الأستاذ للهدف الثاني');
    expect(objective?.id).toBe('teacher-objective:lvl_p1:f_locomotion:2');
  });

  it.each([8, 9, 10])('supports %s objectives without index identity', (targetCount) => {
    let plan = seedTeacherLearningPlan('lvl_p1');
    while (plan.domains[0].objectives.length < targetCount) {
      plan = addTeacherLearningObjective(
        plan,
        'f_locomotion',
        `هدف إضافي ${plan.domains[0].objectives.length + 1}`
      );
    }
    expect(plan.domains[0].objectives).toHaveLength(targetCount);
    expect(new Set(plan.domains[0].objectives.map((objective) => objective.id)).size).toBe(
      targetCount
    );
    expect(
      plan.domains[0].objectives.every((objective, index) => objective.orderIndex === index + 1)
    ).toBe(true);
  });

  it('edits text without changing the stable objective id', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const original = plan.domains[0].objectives[0];
    const edited = updateTeacherLearningObjective(plan, 'f_locomotion', original.id, 'هدف معدل');
    expect(edited.domains[0].objectives[0]).toMatchObject({ id: original.id, text: 'هدف معدل' });
  });

  it('deletes an objective without touching the official source', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const target = plan.domains[0].objectives[0];
    const deleted = deleteTeacherLearningObjective(plan, 'f_locomotion', target.id);
    expect(deleted.domains[0].objectives).toHaveLength(6);
    expect(COMPLETE_ANNUAL_CURRICULUM.lvl_p1.fields.f_locomotion.sessionsList).toHaveLength(10);
  });

  it('reorders objectives by metadata while preserving their identities', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const firstIds = plan.domains[0].objectives.map((objective) => objective.id);
    const reordered = reorderTeacherLearningObjectives(plan, 'f_locomotion', firstIds[0], 'down');
    expect(reordered.domains[0].objectives.map((objective) => objective.id)).toEqual([
      firstIds[1],
      firstIds[0],
      ...firstIds.slice(2),
    ]);
    expect(reordered.domains[0].objectives.map((objective) => objective.orderIndex)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('validates known domains and normalizes stale integration references safely', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const duplicate = {
      ...plan,
      domains: plan.domains.map((domain, index) =>
        index === 1
          ? {
              ...domain,
              objectives: [
                { ...domain.objectives[0], id: plan.domains[0].objectives[0].id },
                ...domain.objectives.slice(1),
              ],
            }
          : domain
      ),
    };
    expect(() => teacherLearningPlanSchema.parse(duplicate)).toThrow();
    expect(() =>
      teacherLearningPlanSchema.parse({
        ...plan,
        domains: plan.domains.map((domain, index) =>
          index === 0
            ? {
                ...domain,
                integrationPoints: [
                  { ...domain.integrationPoints[0], afterObjectiveId: 'missing' },
                  ...domain.integrationPoints.slice(1),
                ],
              }
            : domain
        ),
      })
    ).toThrow();
    const staleIntegration = normalizeTeacherLearningPlan({
      ...plan,
      domains: plan.domains.map((domain, index) =>
        index === 0
          ? {
              ...domain,
              integrationPoints: [
                { ...domain.integrationPoints[0], afterObjectiveId: 'deleted-objective' },
                { ...domain.integrationPoints[0], id: 'duplicate-integration' },
                ...domain.integrationPoints.slice(1),
              ],
            }
          : domain
      ),
    });
    expect(staleIntegration.domains[0].integrationPoints).toHaveLength(2);
    expect(staleIntegration.domains[0].integrationPoints[0].afterObjectiveId).toBeNull();
    expect(
      new Set(staleIntegration.domains[0].integrationPoints.map((point) => point.label)).size
    ).toBe(2);
    expect(() =>
      normalizeTeacherLearningPlan({
        ...plan,
        domains: plan.domains.map((domain, index) =>
          index === 0
            ? {
                ...domain,
                objectives: [{ ...domain.objectives[0], text: ' ' }, ...domain.objectives.slice(1)],
              }
            : domain
        ),
      })
    ).toThrow();
  });

  it('isolates plans by teacher, academic year, and level at the storage contract', () => {
    const teacherA = seedTeacherLearningPlan('lvl_p1');
    const teacherB = seedTeacherLearningPlan('lvl_p1');
    const otherLevel = seedTeacherLearningPlan('lvl_p2');
    const changedA = updateTeacherLearningObjective(
      addTeacherLearningObjective(teacherA, 'f_locomotion', 'هدف خاص'),
      'f_locomotion',
      teacherA.domains[0].objectives[0].id,
      'هدف الأستاذ أ'
    );
    expect(changedA.domains[0].objectives).not.toEqual(teacherB.domains[0].objectives);
    expect(otherLevel.levelId).toBe('lvl_p2');
    expect(teacherB.levelId).toBe('lvl_p1');
  });

  it('keeps official competency editing out of teacher-facing controls', () => {
    const table = read('src/components/curriculum/AnnualPlanOfficialTable.tsx');
    const view = read('src/components/curriculum/AnnualPlanView.tsx');
    expect(table).toContain('editable={false}');
    expect(table).not.toContain('onComprehensiveChange');
    expect(view).not.toContain('onComprehensiveChange');
    expect(view).not.toContain("overrides['comprehensive']");
    expect(view).not.toContain('overrides[`${fieldId}__final`]');
    expect(view).toContain('overallCompetency: referenceLevel.comprehensive');
  });

  it('exposes an authenticated, validated teacher-plan API contract', () => {
    const router = read('src/server/apiRouter.ts');
    expect(router).toContain("apiRouter.get('/teacher/learning-plan', requireRole('teacher')");
    expect(router).toContain("apiRouter.post('/teacher/learning-plan', requireRole('teacher')");
    expect(router).toContain('teacherLearningPlanSchema.safeParse');
    expect(router).toContain('normalizeTeacherLearningPlan');
    expect(router).toContain('req.user!.id');
    expect(router).toContain('kind: TEACHER_LEARNING_PLAN_KIND');
    expect(router).toContain('kind === TEACHER_LEARNING_PLAN_KIND');
    expect(router).toContain("kind: 'section_wording'");
  });

  it('exposes the plan as the source consumed by annual distribution', () => {
    const planning = read('src/services/teacherPlanning.service.ts');
    const distribution = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    expect(planning).toContain('resolveTeacherLearningPlan');
    expect(planning).toContain('teacherLearningPlan?:');
    expect(distribution).not.toContain('teacherLearningPlan');
    expect(read('src/services/teacherLearningPlan.service.ts')).not.toContain(
      'ClassPlannedSession'
    );
  });
});
