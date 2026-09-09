import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  getLearningObjectiveBank,
  GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK,
  GRADE_ONE_DOMAIN_ONE_RESOURCES,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  addTeacherLearningObjective,
  addTeacherLearningObjectiveFromBank,
  generateTeacherLearningSectionStructure,
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
  updateTeacherLearningObjectiveDetails,
} from '../src/services/teacherLearningPlan.service';
import { normalizePlanningSessions } from '../src/services/dailyNotebook.service';
import { isLessonMemoEligible } from '../src/services/lessonPlanWorkflow.service';
import {
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';

const LEVEL = 'lvl_p1';
const DOMAIN = 'f_locomotion';
const bank = GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK;
const source = (path: string) => readFileSync(path, 'utf8');
const selected = (count = 8) =>
  selectRecommendedObjectives({
    bank,
    resources: GRADE_ONE_DOMAIN_ONE_RESOURCES,
    requestedCount: count,
  });
const generate = (
  objectiveCount = 8,
  integrationCount = 2,
  objectiveFillMode: 'bank-auto' | 'structure-only' = 'bank-auto'
) =>
  generateTeacherLearningSectionStructure(
    seedTeacherLearningPlan(LEVEL),
    DOMAIN,
    objectiveCount,
    integrationCount,
    {
      mode: 'replace',
      objectiveFillMode,
      allowDestructiveReplacement: true,
    }
  );
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Learning Section objective-bank auto-fill', () => {
  it('selects the exact requested count deterministically instead of taking first N', () => {
    const first = selected(8).map((item) => item.id);
    const second = selected(8).map((item) => item.id);
    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect(first).toEqual([
      'G1-D1-OBJ-03',
      'G1-D1-OBJ-04',
      'G1-D1-OBJ-05',
      'G1-D1-OBJ-07',
      'G1-D1-OBJ-09',
      'G1-D1-OBJ-10',
      'G1-D1-OBJ-12',
      'G1-D1-OBJ-14',
    ]);
    expect(first).not.toEqual(bank.slice(0, 8).map((item) => item.id));
  });

  it('maximizes distinct canonical coverage and represents the major resource families', () => {
    const recommendation = selected(8);
    const coverage = calculateObjectiveBankCoverage(LEVEL, DOMAIN, recommendation);
    expect(coverage.covered).toHaveLength(10);
    expect(coverage.covered.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        'وضعيات الوقوف',
        'وضعيات الجلوس',
        'التحول بين الوقوف والجلوس',
        'الانتصاب على أربع',
        'الوقوف على رجل واحدة',
        'المشي الفردي',
        'المشي النشيط',
        'الهرولة الفردية',
      ])
    );
    expect(new Set(recommendation.flatMap((item) => item.curriculumResourceIds)).size).toBe(10);
    expect(recommendation.map((item) => bank.indexOf(item))).toEqual(
      [...recommendation.map((item) => bank.indexOf(item))].sort((left, right) => left - right)
    );
  });

  it('auto-fills all generated slots as immutable snapshots with provenance', () => {
    const referenceBefore = structuredClone(bank);
    const plan = generate();
    const objectives = domain(plan).objectives;
    expect(objectives).toHaveLength(8);
    expect(objectives.every((item) => item.text && !item.isPlaceholder)).toBe(true);
    expect(objectives.map((item) => item.sourceReferenceId)).toEqual(
      selected(8).map((item) => item.id)
    );
    objectives.forEach((objective, index) => {
      const reference = selected(8)[index];
      expect(objective).toMatchObject({
        text: reference.objectiveText,
        competencyComponentIds: reference.competencyComponentIds,
        curriculumResourceIds: reference.curriculumResourceIds,
        transversalResourceIds: reference.transversalResourceIds,
        learningContent: reference.learningContent,
        pedagogicalKnowledge: reference.mobilizedKnowledge,
        executionContent: reference.executionContent,
        guidance: reference.guidance,
      });
    });
    expect(bank).toEqual(referenceBefore);
  });

  it('preserves generated teacher IDs when auto-filling existing empty slots', () => {
    const structure = generate(8, 2, 'structure-only');
    const ids = domain(structure).objectives.map((item) => item.id);
    const filled = generateTeacherLearningSectionStructure(structure, DOMAIN, 8, 2, {
      mode: 'reorganize',
      objectiveFillMode: 'bank-auto',
    });
    expect(domain(filled).objectives.map((item) => item.id)).toEqual(ids);
    expect(domain(filled).objectives.every((item) => item.sourceReferenceId)).toBe(true);
  });

  it('keeps structure-only generation fully operational without fabricated content', () => {
    const plan = generate(8, 2, 'structure-only');
    expect(domain(plan).objectives).toHaveLength(8);
    expect(domain(plan).objectives.every((item) => item.text === '' && item.isPlaceholder)).toBe(
      true
    );
    expect(calculateObjectiveBankCoverage(LEVEL, DOMAIN, domain(plan).objectives).covered).toEqual(
      []
    );
  });

  it('rejects bank overflow and unsupported banks without fabricating objectives', () => {
    expect(() => selected(15)).toThrow('بنك الأهداف المقترحة لهذا الميدان يحتوي على 14 هدفًا فقط.');
    expect(() =>
      generateTeacherLearningSectionStructure(seedTeacherLearningPlan('lvl_p2'), DOMAIN, 8, 2, {
        mode: 'replace',
        objectiveFillMode: 'bank-auto',
        allowDestructiveReplacement: true,
      })
    ).toThrow('لا يتوفر بنك أهداف مقترحة لهذا المستوى والميدان بعد.');
    expect(getLearningObjectiveBank('lvl_p2', DOMAIN)).toEqual([]);
  });

  it('protects populated plans from destructive bank regeneration', () => {
    const plan = seedTeacherLearningPlan(LEVEL);
    const before = structuredClone(plan);
    expect(() =>
      generateTeacherLearningSectionStructure(plan, DOMAIN, 8, 2, {
        mode: 'replace',
        objectiveFillMode: 'bank-auto',
      })
    ).toThrow('يحتاج إلى تأكيد صريح');
    expect(plan).toEqual(before);
  });

  it('replaces a populated objective from the bank while preserving teacher identity', () => {
    const plan = generate();
    const target = domain(plan).objectives[0];
    const replacement = bank.find(
      (item) =>
        !domain(plan).objectives.some((objective) => objective.sourceReferenceId === item.id)
    )!;
    const replaced = addTeacherLearningObjectiveFromBank(plan, DOMAIN, replacement.id, target.id);
    expect(domain(replaced).objectives[0]).toMatchObject({
      id: target.id,
      sourceReferenceId: replacement.id,
      text: replacement.objectiveText,
    });
    expect(() =>
      addTeacherLearningObjectiveFromBank(
        replaced,
        DOMAIN,
        domain(replaced).objectives[1].sourceReferenceId!,
        target.id
      )
    ).toThrow('مضاف إلى المقطع بالفعل');
  });

  it('keeps auto-filled snapshots editable and custom objectives supported', () => {
    const plan = generate();
    const target = domain(plan).objectives[0];
    const edited = updateTeacherLearningObjectiveDetails(plan, DOMAIN, target.id, {
      text: 'صياغة الأستاذ الخاصة',
      teacherNotes: 'ملاحظة الأستاذ',
    });
    expect(domain(edited).objectives[0]).toMatchObject({
      id: target.id,
      text: 'صياغة الأستاذ الخاصة',
      teacherNotes: 'ملاحظة الأستاذ',
      sourceReferenceId: target.sourceReferenceId,
    });
    const withCustom = addTeacherLearningObjective(edited, DOMAIN, 'هدف خاص إضافي');
    expect(domain(withCustom).objectives.at(-1)).toMatchObject({
      text: 'هدف خاص إضافي',
      sourceReferenceId: null,
    });
  });

  it('preserves 8+2 placement and the existing operational occurrence rules', () => {
    const plan = generate();
    const generatedDomain = domain(plan);
    expect(
      generatedDomain.integrationPoints.map(
        (point) =>
          generatedDomain.objectives.findIndex((item) => item.id === point.afterObjectiveId) + 1
      )
    ).toEqual([4, 8]);
    const sessions = canonicalPlanningSessions(LEVEL, '2026-09-21', '2026-2027', 0, plan).filter(
      (item) => item.domainId === DOMAIN
    );
    for (const objective of generatedDomain.objectives) {
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(2);
    }
    for (const special of sessions.filter((item) => item.sessionType !== 'تعلمية')) {
      expect(
        sessions.filter((item) => item.objectiveGroupId === special.objectiveGroupId)
      ).toHaveLength(1);
    }
  });

  it('keeps old plans compatible without automatic regeneration', () => {
    const oldPlan = seedTeacherLearningPlan(LEVEL);
    const identities = domain(oldPlan).objectives.map(({ id, text }) => ({ id, text }));
    const resolved = resolveTeacherLearningPlan(LEVEL, oldPlan);
    expect(domain(resolved).objectives.map(({ id, text }) => ({ id, text }))).toEqual(identities);
  });

  it('feeds auto-filled snapshots through Annual Distribution, Daily Notebook, and Lesson Memo', () => {
    const plan = generate();
    const distribution = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([[LEVEL, plan]])
    );
    expect(distribution.levels.find((item) => item.levelId === LEVEL)?.status).toBe('generated');
    const reference = canonicalPlanningSessions(LEVEL, '2026-09-21', '2026-2027', 0, plan)[0];
    const operational = normalizePlanningSessions([
      {
        id: 'auto-fill-operational-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        academicYearId: '2026-2027',
        referenceSessionId: reference.referenceSessionId,
        plannedDate: reference.plannedDate,
        durationMinutes: reference.durationMinutes,
        status: 'مبرمجة',
        reference,
      },
    ]);
    expect(operational).toHaveLength(1);
    expect(isLessonMemoEligible(operational[0])).toBe(true);
  });

  it('exposes auto/structure UI modes and corrected Learning Objective terminology', () => {
    const ui = source('src/components/curriculum/LearningSegmentsView.tsx');
    expect(ui).toContain('طريقة ملء الأهداف');
    expect(ui).toContain('تلقائيًا من بنك الأهداف المقترحة');
    expect(ui).toContain('إنشاء الهيكل فقط');
    expect(ui).toContain('إعادة تنظيم المقطع');
    expect(ui).toContain('إعادة توليد الأهداف من البنك');
    expect(ui).toContain('استبدال من البنك');
    expect(ui).toContain('disabled={objectiveBank.length === 0}');
    expect(ui).toContain('الهدف التعلمي ${index + 1}');
    expect(ui).toContain('لم يُحدَّد الهدف التعلمي بعد');
    expect(ui).toContain('مضاف إلى المقطع');
    expect(ui).not.toContain('هدف تعلمي غير معيّن');
    expect(ui).not.toMatch(/الذكاء الاصطناعي|Gemini|API key/);
  });

  it('keeps downstream architecture, Annual Plan, and Prisma out of the change', () => {
    const service = source('src/services/teacherLearningPlan.service.ts');
    expect(service).not.toContain('AnnualPlanView');
    expect(service).not.toContain('prisma.');
    expect(source('src/components/curriculum/LearningSectionPrintDocument.tsx')).not.toContain(
      'طريقة ملء الأهداف'
    );
  });
});
