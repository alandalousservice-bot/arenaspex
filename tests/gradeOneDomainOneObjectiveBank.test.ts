import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  getLearningObjectiveBank,
  GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_ONE_DOMAIN_ONE_RESOURCES,
  GRADE_ONE_DOMAIN_ONE_TRANSVERSAL_RESOURCES,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import { getLearningSectionComponents } from '../src/data/domainOneLearningSectionReference';
import {
  addTeacherLearningObjective,
  addTeacherLearningObjectiveFromBank,
  reorderTeacherLearningObjectives,
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
  updateTeacherLearningObjectiveDetails,
} from '../src/services/teacherLearningPlan.service';
import {
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';

const LEVEL = 'lvl_p1';
const DOMAIN = 'f_locomotion';
const bank = GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK;
const source = (path: string) => readFileSync(path, 'utf8');

describe('Grade 1 / Domain 1 reference objective bank', () => {
  it('exposes exactly the 14 curated objectives with stable unique IDs', () => {
    expect(bank).toHaveLength(14);
    expect(bank.map((item) => item.id)).toEqual(
      Array.from({ length: 14 }, (_, index) => `G1-D1-OBJ-${String(index + 1).padStart(2, '0')}`)
    );
    expect(new Set(bank.map((item) => item.id)).size).toBe(14);
    expect(getLearningObjectiveBank(LEVEL, DOMAIN)).toBe(bank);
    expect(getLearningObjectiveBank('lvl_p2', DOMAIN)).toEqual([]);
    expect(getLearningObjectiveBank(LEVEL, 'f_fundamentals')).toEqual([]);
    expect(getLearningObjectiveBank(LEVEL, 'f_structuring')).toEqual([]);
  });

  it('keeps every bank definition and nested relationship immutable', () => {
    expect(Object.isFrozen(bank)).toBe(true);
    for (const item of bank) {
      expect(Object.isFrozen(item)).toBe(true);
      expect(Object.isFrozen(item.competencyComponentIds)).toBe(true);
      expect(Object.isFrozen(item.curriculumResourceIds)).toBe(true);
      expect(Object.isFrozen(item.transversalResourceIds)).toBe(true);
      expect(Object.isFrozen(item.sourceReferences)).toBe(true);
      expect(Object.isFrozen(item.tags)).toBe(true);
    }
  });

  it('uses the approved direct observable formulations without أن', () => {
    const allowedVerbs = /^(يتخذ|ينتقل|يؤدي|يحافظ|يمشي|يهرول)/;
    expect(bank.every((item) => !item.objectiveText.trim().startsWith('أن'))).toBe(true);
    expect(bank.every((item) => allowedVerbs.test(item.objectiveText))).toBe(true);
    expect(bank.map((item) => item.objectiveText)).toEqual([
      'يتخذ وضعيات الوقوف المختلفة بصورة سليمة حسب الموقف.',
      'يتخذ وضعيات الجلوس المختلفة بصورة سليمة حسب الموقف.',
      'ينتقل بين وضعيتي الوقوف والجلوس محافظًا على توازنه.',
      'يؤدي وضعية الانبطاح موظفًا أطراف جسمه بصورة متكاملة.',
      'يؤدي الانتصاب على أربع موظفًا ارتكازاته بصورة سليمة.',
      'يؤدي الانتصاب على أربع المعكوس محافظًا على توازن جسمه.',
      'يحافظ على توازنه أثناء الوقوف على رجل واحدة.',
      'يتخذ وضعية الارتكاز على الركبتين محافظًا على توازنه.',
      'يمشي فرديًا بوتيرة منتظمة محافظًا على مسار تنقله.',
      'يمشي بوتيرة نشيطة محافظًا على انتظام حركته ومسار تنقله.',
      'يمشي ثنائيًا منسجمًا مع حركة زميله ووتيرة تنقله.',
      'يهرول فرديًا بوتيرة منتظمة محافظًا على مسار تنقله.',
      'يهرول ثنائيًا منسجمًا مع حركة زميله ووتيرة تنقله.',
      'ينتقل بين وضعيات جسمية مختلفة مستجيبًا للإشارة ومتطلبات الموقف.',
    ]);
  });

  it('has deterministic valid component, curriculum-resource, and transversal mappings', () => {
    const componentIds = new Set(
      getLearningSectionComponents(LEVEL, DOMAIN).map((item) => item.id)
    );
    const resourceIds = new Set(GRADE_ONE_DOMAIN_ONE_RESOURCES.map((item) => item.id));
    const transversalIds = new Set(
      GRADE_ONE_DOMAIN_ONE_TRANSVERSAL_RESOURCES.map((item) => item.id)
    );
    for (const item of bank) {
      expect(item.competencyComponentIds.length).toBeGreaterThan(0);
      expect(item.competencyComponentIds.every((id) => componentIds.has(id))).toBe(true);
      expect(item.curriculumResourceIds.length).toBeGreaterThan(0);
      expect(item.curriculumResourceIds.every((id) => resourceIds.has(id))).toBe(true);
      expect(item.transversalResourceIds.length).toBeGreaterThan(0);
      expect(item.transversalResourceIds.every((id) => transversalIds.has(id))).toBe(true);
      expect(item.sourceReferences).toContain('EPS-2023:grade-1:domain-1');
    }
  });

  it('provides supported enriched content without invented situations or equipment', () => {
    for (const item of bank) {
      expect(item.learningContent).not.toBe('');
      expect(item.mobilizedKnowledge).not.toBe('');
      expect(item.executionContent).not.toBe('');
      expect(item.guidance).not.toBe('');
      expect(Object.keys(item)).not.toContain('situations');
      expect(Object.keys(item)).not.toContain('resources');
    }
  });

  it('copies a bank objective into the teacher plan and preserves provenance', () => {
    const originalPlan = seedTeacherLearningPlan(LEVEL);
    const originalBank = structuredClone(bank[2]);
    const changed = addTeacherLearningObjectiveFromBank(originalPlan, DOMAIN, bank[2].id);
    const copy = changed.domains[0].objectives.at(-1)!;
    expect(copy.id).not.toBe(bank[2].id);
    expect(copy).toMatchObject({
      text: bank[2].objectiveText,
      sourceReferenceId: bank[2].id,
      competencyComponentIds: [...bank[2].competencyComponentIds],
      curriculumResourceIds: [...bank[2].curriculumResourceIds],
      transversalResourceIds: [...bank[2].transversalResourceIds],
      learningContent: bank[2].learningContent,
      pedagogicalKnowledge: bank[2].mobilizedKnowledge,
      executionContent: bank[2].executionContent,
      guidance: bank[2].guidance,
      situations: [],
      resources: [],
    });

    const edited = updateTeacherLearningObjectiveDetails(changed, DOMAIN, copy.id, {
      text: 'صياغة الأستاذ الخاصة للهدف المختار',
      learningContent: 'محتوى الأستاذ الخاص',
    });
    expect(edited.domains[0].objectives.at(-1)?.sourceReferenceId).toBe(bank[2].id);
    expect(edited.domains[0].objectives.at(-1)?.curriculumResourceIds).toEqual(
      bank[2].curriculumResourceIds
    );
    expect(bank[2]).toEqual(originalBank);
  });

  it('prevents duplicate bank selection by stable identity rather than text', () => {
    const once = addTeacherLearningObjectiveFromBank(
      seedTeacherLearningPlan(LEVEL),
      DOMAIN,
      bank[0].id
    );
    expect(() => addTeacherLearningObjectiveFromBank(once, DOMAIN, bank[0].id)).toThrow(
      'هذا الهدف مضاف إلى المقطع بالفعل.'
    );
    expect(() => addTeacherLearningObjective(once, DOMAIN, bank[0].objectiveText)).not.toThrow();
  });

  it('keeps custom objectives optional, dynamic, selectable as a subset, and reorderable', () => {
    let plan = seedTeacherLearningPlan(LEVEL);
    plan = addTeacherLearningObjectiveFromBank(plan, DOMAIN, bank[0].id);
    plan = addTeacherLearningObjectiveFromBank(plan, DOMAIN, bank[10].id);
    plan = addTeacherLearningObjective(plan, DOMAIN, 'هدف خاص يصوغه الأستاذ');
    const domain = plan.domains.find((item) => item.fieldId === DOMAIN)!;
    expect(
      domain.objectives.filter((item) => item.sourceReferenceId?.startsWith('G1-D1-OBJ-'))
    ).toHaveLength(2);
    expect(domain.objectives.at(-1)).toMatchObject({
      text: 'هدف خاص يصوغه الأستاذ',
      sourceReferenceId: null,
      curriculumResourceIds: [],
      transversalResourceIds: [],
    });
    const reordered = reorderTeacherLearningObjectives(
      plan,
      DOMAIN,
      domain.objectives.at(-1)!.id,
      'up'
    );
    expect(reordered.domains[0].objectives.at(-2)?.text).toBe('هدف خاص يصوغه الأستاذ');
  });

  it('calculates non-blocking coverage only from stable resource IDs', () => {
    let plan = seedTeacherLearningPlan(LEVEL);
    plan = addTeacherLearningObjectiveFromBank(plan, DOMAIN, bank[0].id);
    plan = addTeacherLearningObjectiveFromBank(plan, DOMAIN, bank[2].id);
    plan = addTeacherLearningObjective(plan, DOMAIN, 'المشي الثنائي');
    const objectives = plan.domains.find((item) => item.fieldId === DOMAIN)!.objectives;
    const coverage = calculateObjectiveBankCoverage(LEVEL, DOMAIN, objectives);
    expect(coverage.total).toBe(14);
    expect(coverage.covered.map((item) => item.label)).toEqual([
      'وضعيات الوقوف',
      'وضعيات الجلوس',
      'التحول بين الوقوف والجلوس',
    ]);
    expect(coverage.missing).toHaveLength(11);
    expect(coverage.missing.map((item) => item.label)).toContain('المشي الثنائي');
    expect(() => resolveTeacherLearningPlan(LEVEL, plan)).not.toThrow();
  });

  it('preserves old plans and newly added provenance through normalization', () => {
    const historical = structuredClone(seedTeacherLearningPlan(LEVEL));
    const historicalIds = historical.domains[0].objectives.map((item) => item.id);
    delete historical.domains[0].objectives[0].curriculumResourceIds;
    delete historical.domains[0].objectives[0].transversalResourceIds;
    const normalized = resolveTeacherLearningPlan(LEVEL, historical);
    expect(normalized.domains[0].objectives.map((item) => item.id)).toEqual(historicalIds);
    expect(normalized.domains[0].objectives[0].curriculumResourceIds).toEqual([]);
    expect(normalized.domains[0].objectives[0].transversalResourceIds).toEqual([]);

    const withBank = addTeacherLearningObjectiveFromBank(normalized, DOMAIN, bank[4].id);
    const persisted = resolveTeacherLearningPlan(LEVEL, structuredClone(withBank));
    expect(persisted.domains[0].objectives.at(-1)?.sourceReferenceId).toBe(bank[4].id);
    expect(persisted.domains[0].objectives.at(-1)?.curriculumResourceIds).toEqual(
      bank[4].curriculumResourceIds
    );
  });

  it('keeps G1 A/B identity and all special sessions single after bank selection', () => {
    const plan = addTeacherLearningObjectiveFromBank(
      seedTeacherLearningPlan(LEVEL),
      DOMAIN,
      bank[5].id
    );
    const selected = plan.domains[0].objectives.at(-1)!;
    const sessions = canonicalPlanningSessions(LEVEL, '2026-09-21', '2026-2027', 0, plan).filter(
      (item) => item.domainId === DOMAIN
    );
    const pair = sessions.filter((item) => item.objectiveId === selected.id);
    expect(pair).toHaveLength(2);
    expect(new Set(pair.map((item) => item.objectiveGroupId))).toEqual(new Set([selected.id]));
    expect(new Set(pair.map((item) => item.objective))).toEqual(new Set([selected.text]));
    for (const special of sessions.filter((item) => item.sessionType !== 'تعلمية')) {
      expect(
        sessions.filter((item) => item.objectiveGroupId === special.objectiveGroupId)
      ).toHaveLength(1);
    }
    expect(sessions[0].sessionType).toBe('تقويم تشخيصي');
    expect(sessions.at(-1)?.sessionType).toBe('تقويم تحصيلي');
  });

  it('remains consumable by Annual Distribution and existing downstream objective identity', () => {
    const plan = addTeacherLearningObjectiveFromBank(
      seedTeacherLearningPlan(LEVEL),
      DOMAIN,
      bank[7].id
    );
    const result = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([[LEVEL, plan]])
    );
    const level = result.levels.find((item) => item.levelId === LEVEL)!;
    const selected = plan.domains[0].objectives.at(-1)!;
    expect(level.status).toBe('generated');
    expect(level.sessions.filter((item) => item.objectiveId === selected.id)).toHaveLength(2);
    expect(
      level.sessions
        .filter((item) => item.objectiveId === selected.id)
        .every((item) => item.objective === selected.text)
    ).toBe(true);
  });

  it('exposes the two-path selector and non-blocking coverage without AI terminology', () => {
    const ui = source('src/components/curriculum/LearningSegmentsView.tsx');
    expect(ui).toContain('اختيار من بنك الأهداف المقترحة');
    expect(ui).toContain('إنشاء هدف خاص');
    expect(ui).toContain('اختيار الهدف');
    expect(ui).toContain('مضاف إلى المقطع');
    expect(ui).toContain('تغطية موارد الميدان');
    expect(ui).toContain('مؤشر إرشادي لا يمنع الحفظ أو التعديل أو الطباعة');
    expect(ui).not.toMatch(/الذكاء الاصطناعي|Gemini|API key/);
  });

  it('does not couple the objective bank to Annual Plan or populate other grades/domains', () => {
    const data = source('src/data/gradeOneDomainOneObjectiveBank.ts');
    expect(data).not.toContain('annualPlanReference');
    expect(data).not.toContain('AnnualPlanView');
    expect(data).not.toMatch(/G2-D1-OBJ|G3-D1-OBJ|G4-D1-OBJ|G5-D1-OBJ/);
    expect(data).not.toMatch(/f_fundamentals.*objective\(|f_structuring.*objective\(/);
  });
});
