import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DOMAIN_ONE_LEARNING_SECTION_REFERENCE,
  getLearningSectionComponents,
} from '../src/data/domainOneLearningSectionReference';
import {
  addTeacherLearningObjective,
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
  updateTeacherLearningObjectiveDetails,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const read = (path: string) => readFileSync(path, 'utf8');
const domainOne = (levelId: string) =>
  seedTeacherLearningPlan(levelId).domains.find((domain) => domain.fieldId === 'f_locomotion')!;
const domainSessions = (levelId: string) =>
  canonicalPlanningSessions(
    levelId,
    '2026-09-21',
    '2026-2027',
    0,
    seedTeacherLearningPlan(levelId)
  ).filter((session) => session.domainId === 'f_locomotion');

describe('Learning Sections pedagogical core', () => {
  it('keeps Domain 1 competency components immutable official reference data for Grades 1–5', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
      const reference = DOMAIN_ONE_LEARNING_SECTION_REFERENCE[levelId];
      expect(reference.components).toHaveLength(3);
      expect(Object.isFrozen(reference)).toBe(true);
      expect(Object.isFrozen(reference.components)).toBe(true);
      expect(reference.components.every(Object.isFrozen)).toBe(true);
      expect(Object.isFrozen(reference.defaults)).toBe(true);
      expect(Object.isFrozen(reference.defaults.resources)).toBe(true);
    }
  });

  it('lets the teacher select component IDs but never submit component definitions', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const objective = domainOne('lvl_p1').objectives[0];
    const components = getLearningSectionComponents('lvl_p1', 'f_locomotion');
    const officialBefore = structuredClone(components);
    const changed = updateTeacherLearningObjectiveDetails(plan, 'f_locomotion', objective.id, {
      competencyComponentIds: components.map((component) => component.id),
    });

    expect(changed.domains[0].objectives[0].competencyComponentIds).toEqual(
      components.map((component) => component.id)
    );
    expect(getLearningSectionComponents('lvl_p1', 'f_locomotion')).toEqual(officialBefore);
    expect(Object.keys(changed.domains[0].objectives[0])).not.toContain('competencyComponents');
  });

  it('supports the complete enriched objective model without a duplicate تعلمات field', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const objective = plan.domains[0].objectives[0];
    const changed = updateTeacherLearningObjectiveDetails(plan, 'f_locomotion', objective.id, {
      text: 'أن ينتقل المتعلم محافظًا على توازنه أثناء الأداء.',
      competencyComponentIds: [getLearningSectionComponents('lvl_p1', 'f_locomotion')[0].id],
      learningContent: 'التوازن أثناء التنقل',
      pedagogicalKnowledge: 'وضعية الجسم واتجاه الحركة',
      executionContent: 'مسار حركي متدرج',
      situations: [
        {
          situationId: 'safe-reference',
          name: 'مسار التوازن',
          organization: 'أفواج صغيرة',
          equipment: ['أقماع'],
        },
      ],
      guidance: 'مراعاة مسافة الأمان',
      teacherNotes: 'تكييف المسار عند الحاجة',
    });
    const saved = changed.domains[0].objectives[0];

    expect(saved).toMatchObject({
      id: objective.id,
      learningContent: 'التوازن أثناء التنقل',
      pedagogicalKnowledge: 'وضعية الجسم واتجاه الحركة',
      executionContent: 'مسار حركي متدرج',
      guidance: 'مراعاة مسافة الأمان',
      teacherNotes: 'تكييف المسار عند الحاجة',
    });
    expect(saved.situations).toHaveLength(1);
    expect(Object.keys(saved)).not.toContain('التعلمات');
    expect(Object.keys(saved)).not.toContain('learnings');
  });

  it('normalizes an old plan without changing objective identity, wording, order, or count', () => {
    const original = seedTeacherLearningPlan('lvl_p1');
    const historical = structuredClone(original);
    const first = historical.domains[0].objectives[0];
    first.text = 'هدف تاريخي صاغه الأستاذ';
    delete first.competencyComponentIds;
    delete first.learningContent;
    delete first.pedagogicalKnowledge;
    delete first.executionContent;
    delete first.guidance;
    delete first.teacherNotes;
    delete first.situations;
    const beforeIds = historical.domains[0].objectives.map((objective) => objective.id);

    const resolved = resolveTeacherLearningPlan('lvl_p1', historical);
    expect(resolved.domains[0].objectives.map((objective) => objective.id)).toEqual(beforeIds);
    expect(resolved.domains[0].objectives).toHaveLength(historical.domains[0].objectives.length);
    expect(resolved.domains[0].objectives[0].text).toBe('هدف تاريخي صاغه الأستاذ');
    expect(resolved.domains[0].objectives[0].learningContent).not.toBe('');
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4'])(
    '%s maps every normal objective to A/B with one canonical enriched identity',
    (levelId) => {
      const plan = seedTeacherLearningPlan(levelId);
      const domain = plan.domains[0];
      const sessions = canonicalPlanningSessions(
        levelId,
        '2026-09-21',
        '2026-2027',
        0,
        plan
      ).filter(
        (session) => session.domainId === domain.fieldId && session.sessionType === 'تعلمية'
      );
      for (const objective of domain.objectives) {
        const pair = sessions.filter((session) => session.objectiveId === objective.id);
        expect(pair).toHaveLength(2);
        expect(new Set(pair.map((session) => session.objectiveGroupId))).toEqual(
          new Set([objective.id])
        );
        expect(new Set(pair.map((session) => session.objective))).toEqual(
          new Set([objective.text])
        );
        expect(domain.objectives.find((item) => item.id === pair[0].objectiveId)).toBe(objective);
        expect(domain.objectives.find((item) => item.id === pair[1].objectiveId)).toBe(objective);
      }
    }
  );

  it('maps every Grade 5 objective to one meeting', () => {
    const sessions = domainSessions('lvl_p5').filter((session) => session.sessionType === 'تعلمية');
    expect(sessions).toHaveLength(domainOne('lvl_p5').objectives.length);
    expect(new Set(sessions.map((session) => session.objectiveId)).size).toBe(sessions.length);
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    '%s keeps diagnostic, integrations, and summative single and ordered',
    (levelId) => {
      const sessions = domainSessions(levelId);
      expect(sessions[0].sessionType).toBe('تقويم تشخيصي');
      expect(sessions.at(-1)?.sessionType).toBe('تقويم تحصيلي');
      for (const special of sessions.filter((session) => session.sessionType !== 'تعلمية')) {
        expect(
          sessions.filter((candidate) => candidate.objectiveGroupId === special.objectiveGroupId)
        ).toHaveLength(1);
      }
    }
  );

  it('derives meeting totals from a dynamic objective count and dynamic integration positions', () => {
    let plan = seedTeacherLearningPlan('lvl_p1');
    for (const count of [8, 9, 10]) {
      plan = addTeacherLearningObjective(plan, 'f_locomotion', `هدف إضافي ${count}`);
    }
    const domain = plan.domains[0];
    const sessions = canonicalPlanningSessions('lvl_p1', '2026-09-21', '2026-2027', 0, plan).filter(
      (session) => session.domainId === domain.fieldId
    );
    expect(domain.objectives).toHaveLength(10);
    expect(sessions.filter((session) => session.sessionType === 'تعلمية')).toHaveLength(20);
    expect(sessions).toHaveLength(24);
    for (const integration of domain.integrationPoints) {
      const integrationIndex = sessions.findIndex(
        (session) => session.objectiveGroupId === integration.id
      );
      const precedingObjective = [...sessions]
        .slice(0, integrationIndex)
        .reverse()
        .find((session) => session.sessionType === 'تعلمية');
      expect(precedingObjective?.objectiveId).toBe(integration.afterObjectiveId);
    }
  });

  it('keeps the expandable UI, controlled selector, snapshots, and print mapping wired', () => {
    const ui = read('src/components/curriculum/LearningSegmentsView.tsx');
    const print = read('src/components/curriculum/LearningSectionPrintDocument.tsx');
    expect(ui).toContain('مركبات الكفاءة الرسمية');
    expect(ui).toContain('type="checkbox"');
    expect(ui).toContain('نصوص المركبات غير قابلة للتعديل');
    expect(ui).toContain('snapshotSituation');
    expect(ui).toContain('محتوى التعلم');
    expect(ui).toContain('المعارف المجندة');
    expect(ui).toContain('محتوى الإنجاز');
    expect(ui).toContain('ملاحظات الأستاذ');
    expect(print).toContain('<th>مركبات الكفاءة</th>');
    expect(print).not.toContain('معايير تحقيق الكفاءة');
    expect(print).not.toContain('مؤشرات تحقيق الكفاءة');
    expect(print).not.toContain('الكفاءة الشاملة');
  });

  it('does not introduce Domain 2/3 Learning Section content or touch Annual Plan code', () => {
    expect(getLearningSectionComponents('lvl_p1', 'f_fundamentals')).toEqual([]);
    expect(getLearningSectionComponents('lvl_p1', 'f_structuring')).toHaveLength(3);
    const service = read('src/services/teacherLearningPlan.service.ts');
    expect(service).not.toContain('annualPlanReference');
    expect(service).not.toContain('AnnualPlanView');
  });
});
