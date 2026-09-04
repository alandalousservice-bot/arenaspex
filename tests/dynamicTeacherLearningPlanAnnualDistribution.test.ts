import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addTeacherLearningObjective,
  normalizeTeacherLearningPlan,
  reorderTeacherLearningObjectives,
  seedTeacherLearningPlan,
  updateTeacherLearningObjective,
} from '../src/services/teacherLearningPlan.service';
import {
  annualDistributionUnitSummary,
  buildAnnualDistributionWeeks,
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';

const read = (file: string) => fs.readFileSync(file, 'utf8');

function planWithObjectiveCount(levelId: string, fieldId: string, count: number) {
  let plan = seedTeacherLearningPlan(levelId);
  while (plan.domains.find((domain) => domain.fieldId === fieldId)!.objectives.length < count) {
    plan = addTeacherLearningObjective(plan, fieldId, `هدف إضافي ${count}`);
  }
  return plan;
}

function domainSessions(
  levelId: string,
  fieldId: string,
  plan: ReturnType<typeof seedTeacherLearningPlan>
) {
  return canonicalPlanningSessions(levelId, '2026-09-21', '2026-2027', 0, plan).filter(
    (session) => session.domainId === fieldId
  );
}

describe('dynamic Teacher Learning Plan annual distribution', () => {
  it.each([7, 8, 9, 10])('derives Grade 1 domain meetings from %s objectives', (count) => {
    const plan = planWithObjectiveCount('lvl_p1', 'f_locomotion', count);
    const sessions = domainSessions('lvl_p1', 'f_locomotion', plan);
    expect(sessions.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(count * 2);
    expect(sessions).toHaveLength(count * 2 + 2 + 2);
    expect(
      new Set(
        sessions
          .filter((session) => session.sessionType === 'تعلمية')
          .map((session) => session.objectiveId)
      ).size
    ).toBe(count);
    const secondIntegrationIndex = sessions.findIndex(
      (session) => session.sessionTypeLabel === 'إدماجية 2'
    );
    const finalLearningIndex = sessions.reduce(
      (lastIndex, session, index) => (session.sessionType === 'تعلمية' ? index : lastIndex),
      -1
    );
    const summativeIndex = sessions.findIndex((session) => session.sessionType === 'تقويم تحصيلي');
    expect(secondIntegrationIndex).toBeGreaterThan(finalLearningIndex);
    expect(secondIntegrationIndex).toBe(summativeIndex - 1);
  });

  it('supports the explicit 8-8-7 scenario without hard-coding it', () => {
    const plans = new Map([
      ['lvl_p1', planWithObjectiveCount('lvl_p1', 'f_locomotion', 8)],
      ['lvl_p2', planWithObjectiveCount('lvl_p2', 'f_locomotion', 8)],
      ['lvl_p3', seedTeacherLearningPlan('lvl_p3')],
    ]);
    const generation = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21', plans);
    const p1 = generation.levels.find((level) => level.levelId === 'lvl_p1')!;
    const p2 = generation.levels.find((level) => level.levelId === 'lvl_p2')!;
    const p3 = generation.levels.find((level) => level.levelId === 'lvl_p3')!;
    const customP3 = planWithObjectiveCount('lvl_p3', 'f_locomotion', 7);
    const customGeneration = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([
        ['lvl_p1', plans.get('lvl_p1')!],
        ['lvl_p2', plans.get('lvl_p2')!],
        ['lvl_p3', customP3],
      ])
    );
    expect(p1.sessions.filter((session) => session.domainId === 'f_locomotion')).toHaveLength(20);
    expect(p2.sessions.filter((session) => session.domainId === 'f_locomotion')).toHaveLength(20);
    expect(p3.sessions.filter((session) => session.domainId === 'f_locomotion')).toHaveLength(18);
    expect(
      customGeneration.levels
        .slice(0, 3)
        .reduce(
          (total, level) =>
            total + level.sessions.filter((session) => session.domainId === 'f_locomotion').length,
          0
        )
    ).toBe(58);
  });

  it('uses one meeting per objective for Grade 5', () => {
    const plan = planWithObjectiveCount('lvl_p5', 'f_locomotion', 10);
    const sessions = domainSessions('lvl_p5', 'f_locomotion', plan);
    expect(sessions).toHaveLength(10 + 2 + 2);
    expect(sessions.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(10);
    expect(sessions.every((session) => !session.referenceSessionId.includes(':meeting:'))).toBe(
      true
    );
    const weeks = buildAnnualDistributionWeeks({
      levelId: 'lvl_p5',
      grade: 5,
      sessionCount: 0,
      annualHours: 0,
      firstSessionDate: sessions[0].plannedDate,
      lastSessionDate: sessions.at(-1)!.plannedDate,
      durationMinutes: 60,
      sessions,
      status: 'generated',
    });
    expect(annualDistributionUnitSummary(weeks).meetingCount).toBe(15);
    expect(weeks.slice(1).every((week) => week.slots.length === 1)).toBe(true);
  });

  it('places integrations by stable objective reference, not array slices', () => {
    const source = seedTeacherLearningPlan('lvl_p1');
    const domain = source.domains[0];
    const positioned = normalizeTeacherLearningPlan({
      ...source,
      domains: source.domains.map((item, index) =>
        index === 0
          ? {
              ...item,
              integrationPoints: item.integrationPoints.map((point, pointIndex) => ({
                ...point,
                afterObjectiveId: domain.objectives[pointIndex === 0 ? 2 : 5].id,
              })),
            }
          : item
      ),
    });
    const sessions = domainSessions('lvl_p1', 'f_locomotion', positioned);
    const firstIntegrationIndex = sessions.findIndex(
      (session) => session.sessionTypeLabel === 'إدماجية 1'
    );
    const secondIntegrationIndex = sessions.findIndex(
      (session) => session.sessionTypeLabel === 'إدماجية 2'
    );
    expect(sessions[firstIntegrationIndex - 1].objectiveId).toBe(domain.objectives[2].id);
    expect(sessions[secondIntegrationIndex - 1].objectiveId).toBe(domain.objectives.at(-1)!.id);
    expect(sessions[secondIntegrationIndex + 1].sessionType).toBe('تقويم تحصيلي');
  });

  it('normalizes malformed Integration 2 placement for Grade 5 as well', () => {
    const source = seedTeacherLearningPlan('lvl_p5');
    const domain = source.domains[0];
    const malformed = normalizeTeacherLearningPlan({
      ...source,
      domains: source.domains.map((item, index) =>
        index === 0
          ? {
              ...item,
              integrationPoints: item.integrationPoints.map((point) =>
                point.label === 'إدماجية 2'
                  ? { ...point, afterObjectiveId: domain.objectives[0].id }
                  : point
              ),
            }
          : item
      ),
    });
    const sessions = domainSessions('lvl_p5', 'f_locomotion', malformed);
    const secondIntegrationIndex = sessions.findIndex(
      (session) => session.sessionTypeLabel === 'إدماجية 2'
    );
    const finalLearningIndex = sessions.reduce(
      (lastIndex, session, index) => (session.sessionType === 'تعلمية' ? index : lastIndex),
      -1
    );
    expect(secondIntegrationIndex).toBe(finalLearningIndex + 1);
    expect(sessions[secondIntegrationIndex + 1].sessionType).toBe('تقويم تحصيلي');
  });

  it('keeps stable identity through reorder and text edits', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const first = plan.domains[0].objectives[0];
    const reordered = reorderTeacherLearningObjectives(plan, 'f_locomotion', first.id, 'down');
    const edited = updateTeacherLearningObjective(
      reordered,
      'f_locomotion',
      first.id,
      'صياغة جديدة'
    );
    const sessions = domainSessions('lvl_p1', 'f_locomotion', edited).filter(
      (session) => session.sessionType === 'تعلمية'
    );
    expect(sessions[0].objectiveId).toBe(reordered.domains[0].objectives[0].id);
    expect(sessions[0].objectiveId).not.toBe(first.id);
    expect(sessions[0].objective).toBe(reordered.domains[0].objectives[0].text);
    expect(sessions[2].objectiveId).toBe(first.id);
    expect(sessions[2].objective).toBe('صياغة جديدة');
  });

  it('isolates teachers, academic years, and levels at the resolved-plan boundary', () => {
    const teacherA = planWithObjectiveCount('lvl_p1', 'f_locomotion', 8);
    const teacherB = planWithObjectiveCount('lvl_p1', 'f_locomotion', 10);
    const yearA = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([['lvl_p1', teacherA]])
    );
    const yearB = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([['lvl_p1', teacherB]])
    );
    expect(
      yearA.levels[0].sessions.filter((session) => session.domainId === 'f_locomotion')
    ).toHaveLength(20);
    expect(
      yearB.levels[0].sessions.filter((session) => session.domainId === 'f_locomotion')
    ).toHaveLength(24);
    const levels = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([
        ['lvl_p1', teacherA],
        ['lvl_p2', planWithObjectiveCount('lvl_p2', 'f_locomotion', 10)],
      ])
    );
    expect(
      levels.levels[0].sessions.filter((session) => session.domainId === 'f_locomotion')
    ).toHaveLength(20);
    expect(
      levels.levels[1].sessions.filter((session) => session.domainId === 'f_locomotion')
    ).toHaveLength(24);
    expect(seedTeacherLearningPlan('lvl_p1').domains[0].objectives).toHaveLength(7);
  });

  it('falls back safely and reports capacity instead of truncating', () => {
    const fallback = canonicalPlanningSessions('lvl_p1', '2026-09-21', '2026-2027');
    expect(
      new Set(
        fallback
          .filter(
            (session) => session.domainId === 'f_locomotion' && session.sessionType === 'تعلمية'
          )
          .map((session) => session.objectiveId)
      ).size
    ).toBe(7);
    let oversized = seedTeacherLearningPlan('lvl_p1');
    while (oversized.domains[0].objectives.length < 200) {
      oversized = addTeacherLearningObjective(oversized, 'f_locomotion', 'هدف زائد');
    }
    const generation = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([['lvl_p1', oversized]])
    );
    expect(generation.levels[0].status).toBe('failed');
    expect(generation.levels[0].error).toContain('سعة');
  });

  it('keeps API resolution, operational protection, and shared screen/print model connected', () => {
    const router = read('src/server/apiRouter.ts');
    const planning = read('src/services/teacherPlanning.service.ts');
    const calendar = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    const lesson = read('src/components/lesson/LessonPlanView.tsx');
    expect(router).toContain('resolveTeacherLearningPlansForLevels');
    expect(router).toContain("kind: { in: [TEACHER_LEARNING_PLAN_KIND, 'section_wording'] }");
    expect(router).toContain('generateAllPrimaryLevelDistributions(');
    expect(planning).not.toContain('slice(0, 3)');
    expect(planning).not.toContain('slice(3)');
    expect(router).toContain('executionDependencyIds');
    expect(router).toContain('decideClassSessionRebuild');
    expect(router).not.toContain('prisma.notebookEntry.delete');
    expect(router).not.toContain('prisma.lessonPlan.delete');
    expect(calendar).toContain('AnnualDistributionTable');
    expect(calendar).toContain('print:block');
    expect(lesson).toContain('operationalSession.reference || canonicalReference');
  });
});
