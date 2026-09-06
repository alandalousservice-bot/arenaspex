import { describe, expect, it } from 'vitest';
import {
  DOMAIN_ONE_LEARNING_SECTION_REFERENCE,
  getDomainOneLearningSectionReference,
  getLearningSectionComponents,
} from '../src/data/domainOneLearningSectionReference';
import {
  addTeacherLearningObjective,
  normalizeTeacherLearningPlan,
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
  teacherLearningPlanSchema,
  updateTeacherLearningObjectiveDetails,
  updateTeacherLearningSpecialEntry,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

describe('Domain 1 Learning Section pedagogical reference', () => {
  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'resolves immutable official competency components for %s',
    (levelId) => {
      const reference = getDomainOneLearningSectionReference(levelId, 'f_locomotion');
      expect(reference?.components).toHaveLength(3);
      expect(new Set(reference?.components.map((component) => component.id)).size).toBe(3);
      expect(reference?.components.every((component) => component.title.length > 5)).toBe(true);
      expect(Object.isFrozen(DOMAIN_ONE_LEARNING_SECTION_REFERENCE)).toBe(true);
    }
  );

  it('does not populate Domain 2 or Domain 3 with invented components', () => {
    expect(getLearningSectionComponents('lvl_p1', 'f_fundamentals')).toEqual([]);
    expect(getLearningSectionComponents('lvl_p1', 'f_structuring')).toEqual([]);
    const plan = seedTeacherLearningPlan('lvl_p1');
    expect(plan.domains[1].objectives[0].competencyComponentIds).toEqual([]);
    expect(plan.domains[2].objectives[0].competencyComponentIds).toEqual([]);
    expect(plan.domains[1].diagnostic).toBeUndefined();
    expect(plan.domains[2].summative).toBeUndefined();
  });

  it('seeds rich teacher-owned fields while keeping component definitions outside the plan', () => {
    const plan = seedTeacherLearningPlan('lvl_p3');
    const objective = plan.domains[0].objectives[0];
    expect(objective).toMatchObject({
      competencyComponentIds: [expect.stringContaining('component:')],
      learningContent: expect.stringContaining('الجري'),
      pedagogicalKnowledge: expect.stringContaining('الرمي'),
      executionContent: expect.stringContaining('الجري والرمي'),
      guidance: expect.stringContaining('السلامة'),
      teacherNotes: '',
    });
    expect(objective).not.toHaveProperty('competencyComponents');
    expect(plan.domains[0].diagnostic?.competencyComponentIds).toHaveLength(3);
    expect(plan.domains[0].summative?.competencyComponentIds).toHaveLength(3);
  });

  it('rejects a teacher-authored component identity outside the official grade/domain reference', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    plan.domains[0].objectives[0].competencyComponentIds = ['teacher-free-text-component'];
    expect(() => teacherLearningPlanSchema.parse(plan)).toThrow(
      'مركب الكفاءة غير تابع للمرجع الرسمي'
    );
  });

  it('edits all objective fields and special assessments without changing official wording', () => {
    const before = JSON.stringify(DOMAIN_ONE_LEARNING_SECTION_REFERENCE.lvl_p1.components);
    const plan = seedTeacherLearningPlan('lvl_p1');
    const objective = plan.domains[0].objectives[0];
    const componentIds = plan.domains[0].diagnostic!.competencyComponentIds!;
    const situation = {
      situationId: 'REF-1',
      name: 'مسار الوضعيات',
      organization: 'أفواج',
      equipment: ['أقماع'],
    };
    const edited = updateTeacherLearningObjectiveDetails(plan, 'f_locomotion', objective.id, {
      competencyComponentIds: componentIds.slice(0, 2),
      learningContent: 'محتوى مخصص',
      pedagogicalKnowledge: 'معارف مخصصة',
      executionContent: 'إنجاز مخصص',
      guidance: 'توجيه مخصص',
      teacherNotes: 'ملاحظة الأستاذ',
      situations: [situation],
    });
    const withAssessment = updateTeacherLearningSpecialEntry(edited, 'f_locomotion', 'diagnostic', {
      objective: 'تشخيص مخصص',
      competencyComponentIds: componentIds,
      learningContent: 'محتوى التشخيص',
      situations: [situation],
    });
    expect(withAssessment.domains[0].objectives[0]).toMatchObject({
      competencyComponentIds: componentIds.slice(0, 2),
      learningContent: 'محتوى مخصص',
      pedagogicalKnowledge: 'معارف مخصصة',
      executionContent: 'إنجاز مخصص',
      guidance: 'توجيه مخصص',
      teacherNotes: 'ملاحظة الأستاذ',
      situations: [situation],
    });
    expect(withAssessment.domains[0].diagnostic?.objective).toBe('تشخيص مخصص');
    expect(JSON.stringify(DOMAIN_ONE_LEARNING_SECTION_REFERENCE.lvl_p1.components)).toBe(before);
  });

  it('normalizes an old plan without changing identity, wording, count, order, placement, or situations', () => {
    const seeded = seedTeacherLearningPlan('lvl_p1');
    const legacy = JSON.parse(JSON.stringify(seeded));
    for (const domain of legacy.domains) {
      delete domain.diagnostic;
      delete domain.summative;
      for (const objective of domain.objectives) delete objective.competencyComponentIds;
      for (const integration of domain.integrationPoints) delete integration.competencyComponentIds;
    }
    legacy.domains[0].objectives[0].text = 'صياغة قديمة محفوظة';
    legacy.domains[0].objectives[0].situations = [
      { situationId: 'OLD', name: 'موقف قديم', organization: 'فوج', equipment: [] },
    ];
    const beforeIds = legacy.domains[0].objectives.map((item: { id: string }) => item.id);
    const beforeAnchor = legacy.domains[0].integrationPoints[0].afterObjectiveId;
    const normalized = normalizeTeacherLearningPlan(legacy);
    expect(normalized.domains[0].objectives.map((item) => item.id)).toEqual(beforeIds);
    expect(normalized.domains[0].objectives).toHaveLength(7);
    expect(normalized.domains[0].objectives[0].text).toBe('صياغة قديمة محفوظة');
    expect(normalized.domains[0].objectives[0].situations?.[0].situationId).toBe('OLD');
    expect(normalized.domains[0].integrationPoints[0].afterObjectiveId).toBe(beforeAnchor);
  });

  it('enriches sparse persisted Domain 1 plans without overwriting teacher content', () => {
    const seeded = seedTeacherLearningPlan('lvl_p1');
    const legacy = JSON.parse(JSON.stringify(seeded));
    const domain = legacy.domains[0];
    delete domain.diagnostic;
    delete domain.summative;
    for (const objective of domain.objectives) {
      delete objective.competencyComponentIds;
      delete objective.learningContent;
      delete objective.pedagogicalKnowledge;
      delete objective.executionContent;
      delete objective.guidance;
      delete objective.resources;
    }
    for (const integration of domain.integrationPoints) {
      delete integration.competencyComponentIds;
      delete integration.learningContent;
      delete integration.pedagogicalKnowledge;
      delete integration.executionContent;
      delete integration.guidance;
      delete integration.resources;
    }
    domain.objectives[0].learningContent = 'محتوى الأستاذ المحفوظ';
    const resolved = resolveTeacherLearningPlan('lvl_p1', legacy);
    const resolvedDomain = resolved.domains[0];
    expect(resolvedDomain.objectives[0].learningContent).toBe('محتوى الأستاذ المحفوظ');
    expect(resolvedDomain.objectives[0].pedagogicalKnowledge).toContain('الوقوف والجلوس');
    expect(resolvedDomain.objectives[0].executionContent).toContain('اتخاذ وضعيات');
    expect(resolvedDomain.objectives[0].guidance).toContain('السلامة');
    expect(resolvedDomain.objectives[0].competencyComponentIds).toHaveLength(1);
    expect(resolvedDomain.integrationPoints[0].learningContent).toContain('الوضعيات الطبيعية');
    expect(resolvedDomain.diagnostic?.learningContent).toContain('الوضعيات الطبيعية');
    expect(resolvedDomain.summative?.guidance).toContain('السلامة');
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'resolves actual enriched content for sparse %s Domain 1 plans',
    (levelId) => {
      const seeded = seedTeacherLearningPlan(levelId);
      const legacy = JSON.parse(JSON.stringify(seeded));
      const domain = legacy.domains[0];
      delete domain.diagnostic;
      delete domain.summative;
      for (const objective of domain.objectives) {
        delete objective.competencyComponentIds;
        delete objective.learningContent;
        delete objective.pedagogicalKnowledge;
        delete objective.executionContent;
        delete objective.guidance;
      }
      const resolved = resolveTeacherLearningPlan(levelId, legacy).domains[0];
      expect(resolved.objectives[0].competencyComponentIds).toHaveLength(1);
      expect(resolved.objectives[0].learningContent).toBeTruthy();
      expect(resolved.objectives[0].pedagogicalKnowledge).toBeTruthy();
      expect(resolved.objectives[0].executionContent).toBeTruthy();
      expect(resolved.objectives[0].guidance).toBeTruthy();
      expect(resolved.diagnostic?.learningContent).toBeTruthy();
      expect(resolved.summative?.executionContent).toBeTruthy();
    }
  );

  it('does not contaminate a custom unmatched objective with Domain 1 defaults', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const custom = {
      ...plan,
      domains: plan.domains.map((domain, index) =>
        index === 0
          ? {
              ...domain,
              objectives: domain.objectives.map((objective, objectiveIndex) =>
                objectiveIndex === 0
                  ? {
                      ...objective,
                      sourceReferenceId: null,
                      learningContent: '',
                      pedagogicalKnowledge: '',
                      executionContent: '',
                      guidance: '',
                      competencyComponentIds: [],
                    }
                  : objective
              ),
            }
          : domain
      ),
    };
    const resolved = resolveTeacherLearningPlan('lvl_p1', custom).domains[0].objectives[0];
    expect(resolved.learningContent).toBe('');
    expect(resolved.pedagogicalKnowledge).toBe('');
    expect(resolved.executionContent).toBe('');
    expect(resolved.guidance).toBe('');
    expect(resolved.competencyComponentIds).toEqual([]);
  });

  it.each([7, 8, 9, 10])('keeps a dynamic %s-objective Domain 1 plan', (count) => {
    let plan = seedTeacherLearningPlan('lvl_p1');
    while (plan.domains[0].objectives.length < count) {
      plan = addTeacherLearningObjective(plan, 'f_locomotion', `هدف ${count}`);
    }
    expect(normalizeTeacherLearningPlan(plan).domains[0].objectives).toHaveLength(count);
  });

  it('keeps G1–4 paired meetings on one objective identity and G5 on one meeting', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4']) {
      const plan = seedTeacherLearningPlan(levelId);
      const sessions = canonicalPlanningSessions(levelId, '2026-09-20', undefined, 0, plan);
      const firstLearning = sessions.findIndex((session) => session.sessionType === 'تعلمية');
      expect(sessions[firstLearning].objectiveId).toBe(sessions[firstLearning + 1].objectiveId);
      expect(sessions[firstLearning].objective).toBe(sessions[firstLearning + 1].objective);
    }
    const gradeFivePlan = seedTeacherLearningPlan('lvl_p5');
    const gradeFive = canonicalPlanningSessions(
      'lvl_p5',
      '2026-09-20',
      undefined,
      0,
      gradeFivePlan
    );
    const firstLearning = gradeFive.findIndex((session) => session.sessionType === 'تعلمية');
    expect(gradeFive[firstLearning].objectiveId).not.toBe(gradeFive[firstLearning + 1].objectiveId);
  });
});
