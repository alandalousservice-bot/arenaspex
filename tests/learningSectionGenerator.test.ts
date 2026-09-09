import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import { normalizePlanningSessions } from '../src/services/dailyNotebook.service';
import { isLessonMemoEligible } from '../src/services/lessonPlanWorkflow.service';
import {
  addTeacherLearningObjective,
  addTeacherLearningObjectiveFromBank,
  balancedIntegrationObjectiveIndexes,
  generateTeacherLearningSectionStructure,
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
  summarizeLearningSectionStructure,
  updateTeacherLearningObjectiveDetails,
} from '../src/services/teacherLearningPlan.service';
import {
  canonicalPlanningSessions,
  generateAllPrimaryLevelDistributions,
} from '../src/services/teacherPlanning.service';

const LEVEL = 'lvl_p1';
const DOMAIN = 'f_locomotion';
const read = (path: string) => readFileSync(path, 'utf8');
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;
const replace = (objectives: number, integrations: number, levelId = LEVEL) =>
  generateTeacherLearningSectionStructure(
    seedTeacherLearningPlan(levelId),
    DOMAIN,
    objectives,
    integrations,
    { mode: 'replace', allowDestructiveReplacement: true }
  );

describe('Learning Section structure generator', () => {
  it.each([
    [8, 2, [4, 8]],
    [7, 2, [4, 7]],
    [10, 2, [5, 10]],
    [8, 3, [3, 6, 8]],
  ])(
    'distributes %i objectives and %i integrations deterministically',
    (count, integrations, expected) => {
      expect(balancedIntegrationObjectiveIndexes(count, integrations)).toEqual(expected);
      const generated = domain(replace(count, integrations));
      expect(generated.objectives).toHaveLength(count);
      expect(generated.integrationPoints).toHaveLength(integrations);
      expect(
        generated.integrationPoints.map(
          (point) =>
            generated.objectives.findIndex((item) => item.id === point.afterObjectiveId) + 1
        )
      ).toEqual(expected);
    }
  );

  it('creates unique stable teacher slots without fabricated content or coverage', () => {
    const generated = domain(replace(8, 2));
    expect(new Set(generated.objectives.map((item) => item.id)).size).toBe(8);
    for (const objective of generated.objectives) {
      expect(objective.id).toMatch(/^teacher-objective:lvl_p1:f_locomotion:/);
      expect(objective).toMatchObject({
        text: '',
        isPlaceholder: true,
        sourceReferenceId: null,
        competencyComponentIds: [],
        curriculumResourceIds: [],
        transversalResourceIds: [],
        situations: [],
      });
    }
    expect(calculateObjectiveBankCoverage(LEVEL, DOMAIN, generated.objectives).covered).toEqual([]);
  });

  it('calculates operational summaries correctly for Grades 1–4 and Grade 5', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4']) {
      expect(summarizeLearningSectionStructure(levelId, 8, 2)).toMatchObject({
        objectiveCount: 8,
        learningMeetingCount: 16,
        integrationCount: 2,
        totalOperationalMeetings: 20,
      });
    }
    expect(summarizeLearningSectionStructure('lvl_p5', 8, 2)).toMatchObject({
      learningMeetingCount: 8,
      totalOperationalMeetings: 12,
    });
  });

  it('rejects invalid, decimal, empty-equivalent, and excessive values transparently', () => {
    expect(() => summarizeLearningSectionStructure(LEVEL, -1, 0)).toThrow();
    expect(() => summarizeLearningSectionStructure(LEVEL, 0, 0)).toThrow();
    expect(() => summarizeLearningSectionStructure(LEVEL, 2.5, 1)).toThrow(
      'يجب إدخال أعداد صحيحة دون فواصل.'
    );
    expect(() => summarizeLearningSectionStructure(LEVEL, 31, 1)).toThrow();
    expect(() => summarizeLearningSectionStructure(LEVEL, 3, 4)).toThrow(
      'لا يمكن أن يتجاوز عدد الحصص الإدماجية عدد الأهداف التعلمية.'
    );
    expect(() => summarizeLearningSectionStructure(LEVEL, 3, 11)).toThrow();
  });

  it('supports zero integrations while keeping objective order', () => {
    const generated = domain(replace(5, 0));
    expect(generated.integrationPoints).toEqual([]);
    expect(generated.objectives.map((item) => item.orderIndex)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not replace a populated section without explicit destructive authority', () => {
    const plan = seedTeacherLearningPlan(LEVEL);
    const before = structuredClone(plan);
    expect(() =>
      generateTeacherLearningSectionStructure(plan, DOMAIN, 8, 2, { mode: 'replace' })
    ).toThrow('يحتاج إلى تأكيد صريح');
    expect(plan).toEqual(before);
  });

  it('reorganizes while preserving objective identity and all authored content', () => {
    const plan = seedTeacherLearningPlan(LEVEL);
    const first = domain(plan).objectives[0];
    const enriched = updateTeacherLearningObjectiveDetails(plan, DOMAIN, first.id, {
      text: 'صياغة الأستاذ المحفوظة',
      competencyComponentIds: first.competencyComponentIds,
      learningContent: 'محتوى محفوظ',
      pedagogicalKnowledge: 'معارف محفوظة',
      executionContent: 'إنجاز محفوظ',
      guidance: 'توجيه محفوظ',
      teacherNotes: 'ملاحظة محفوظة',
      situations: [
        {
          situationId: 'situation-1',
          name: 'موقف محفوظ',
          organization: 'أفواج',
          equipment: [],
        },
      ],
    });
    const reorganized = generateTeacherLearningSectionStructure(enriched, DOMAIN, 10, 3, {
      mode: 'reorganize',
    });
    expect(domain(reorganized).objectives[0]).toEqual(domain(enriched).objectives[0]);
    expect(
      domain(reorganized)
        .objectives.slice(0, 7)
        .map((item) => item.id)
    ).toEqual(domain(enriched).objectives.map((item) => item.id));
    expect(domain(reorganized).objectives).toHaveLength(10);
    expect(domain(reorganized).integrationPoints).toHaveLength(3);
  });

  it('requires confirmation before reducing authored objectives', () => {
    const plan = seedTeacherLearningPlan(LEVEL);
    expect(() =>
      generateTeacherLearningSectionStructure(plan, DOMAIN, 3, 1, { mode: 'reorganize' })
    ).toThrow('تقليل عدد الأهداف');
    const reduced = generateTeacherLearningSectionStructure(plan, DOMAIN, 3, 1, {
      mode: 'reorganize',
      allowObjectiveRemoval: true,
    });
    expect(domain(reduced).objectives).toHaveLength(3);
  });

  it('fills a generated slot from the bank without replacing its teacher identity', () => {
    const generated = replace(3, 1);
    const targetId = domain(generated).objectives[1].id;
    const referenceBefore = structuredClone(GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK[2]);
    const filled = addTeacherLearningObjectiveFromBank(
      generated,
      DOMAIN,
      referenceBefore.id,
      targetId
    );
    const selected = domain(filled).objectives.find((item) => item.id === targetId)!;
    expect(selected).toMatchObject({
      id: targetId,
      text: referenceBefore.objectiveText,
      isPlaceholder: false,
      sourceReferenceId: referenceBefore.id,
      curriculumResourceIds: referenceBefore.curriculumResourceIds,
    });
    expect(GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK[2]).toEqual(referenceBefore);
    expect(
      calculateObjectiveBankCoverage(LEVEL, DOMAIN, domain(filled).objectives).covered.length
    ).toBeGreaterThan(0);
    expect(() => addTeacherLearningObjectiveFromBank(filled, DOMAIN, referenceBefore.id)).toThrow(
      'مضاف إلى المقطع بالفعل'
    );
  });

  it('keeps custom objectives available without fabricated provenance', () => {
    const generated = replace(2, 0);
    const withCustom = addTeacherLearningObjective(generated, DOMAIN, 'هدف خاص للأستاذ');
    expect(domain(withCustom).objectives.at(-1)).toMatchObject({
      text: 'هدف خاص للأستاذ',
      sourceReferenceId: null,
      curriculumResourceIds: [],
      transversalResourceIds: [],
    });
  });

  it.each([
    ['lvl_p1', 2],
    ['lvl_p2', 2],
    ['lvl_p3', 2],
    ['lvl_p4', 2],
    ['lvl_p5', 1],
  ])(
    'keeps operational materialization for %s at %i meeting(s) per objective',
    (levelId, expected) => {
      const plan = replace(3, 1, levelId);
      const firstObjective = domain(plan).objectives[0];
      const sessions = canonicalPlanningSessions(
        levelId,
        '2026-09-21',
        '2026-2027',
        0,
        plan
      ).filter((item) => item.domainId === DOMAIN);
      expect(sessions.filter((item) => item.objectiveId === firstObjective.id)).toHaveLength(
        expected
      );
      for (const special of sessions.filter((item) => item.sessionType !== 'تعلمية')) {
        expect(
          sessions.filter((item) => item.objectiveGroupId === special.objectiveGroupId)
        ).toHaveLength(1);
      }
      expect(sessions[0].sessionType).toBe('تقويم تشخيصي');
      expect(sessions.at(-1)?.sessionType).toBe('تقويم تحصيلي');
    }
  );

  it('remains compatible with Annual Distribution, Daily Notebook, and Lesson Memo', () => {
    const plan = replace(8, 2);
    const distribution = generateAllPrimaryLevelDistributions(
      '2026-2027',
      '2026-09-21',
      new Map([[LEVEL, plan]])
    );
    expect(distribution.levels.find((item) => item.levelId === LEVEL)?.status).toBe('generated');
    const canonical = canonicalPlanningSessions(LEVEL, '2026-09-21', '2026-2027', 0, plan)[0];
    const daily = normalizePlanningSessions([
      {
        id: 'operational-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        academicYearId: '2026-2027',
        referenceSessionId: canonical.referenceSessionId,
        plannedDate: canonical.plannedDate,
        durationMinutes: canonical.durationMinutes,
        status: 'مبرمجة',
        reference: canonical,
      },
    ]);
    expect(daily).toHaveLength(1);
    expect(isLessonMemoEligible(daily[0])).toBe(true);
  });

  it('normalizes old sections without regeneration or data loss', () => {
    const oldPlan = seedTeacherLearningPlan(LEVEL);
    const before = structuredClone(oldPlan);
    const resolved = resolveTeacherLearningPlan(LEVEL, oldPlan);
    expect(resolved.domains.map((item) => item.fieldId)).toEqual(
      before.domains.map((item) => item.fieldId)
    );
    expect(
      resolved.domains.map((item) =>
        item.objectives.map(({ id, text, sourceReferenceId }) => ({ id, text, sourceReferenceId }))
      )
    ).toEqual(
      before.domains.map((item) =>
        item.objectives.map(({ id, text, sourceReferenceId }) => ({ id, text, sourceReferenceId }))
      )
    );
    expect(resolved.domains.map((item) => item.integrationPoints.map(({ id }) => id))).toEqual(
      before.domains.map((item) => item.integrationPoints.map(({ id }) => id))
    );
  });

  it('keeps generator and bank controls out of print and avoids fixed counts or AI wording', () => {
    const ui = read('src/components/curriculum/LearningSegmentsView.tsx');
    const print = read('src/components/curriculum/LearningSectionPrintDocument.tsx');
    expect(ui).toContain('إعداد المقطع');
    expect(ui).toContain('عدد الأهداف التعلمية');
    expect(ui).not.toContain('عدد الحصص التعلمية');
    expect(ui).toContain('توليد المقطع');
    expect(ui).toContain('print:hidden');
    expect(print).not.toContain('إعداد المقطع');
    expect(print).not.toContain('توليد المقطع');
    expect(print).not.toContain('بنك الأهداف المقترحة');
    expect(ui).not.toMatch(/الذكاء الاصطناعي|Gemini|API key/);
    expect(read('src/services/teacherLearningPlan.service.ts')).not.toMatch(
      /objectiveCount\s*===\s*[78]/
    );
  });

  it('does not modify Annual Plan or introduce schema persistence', () => {
    const service = read('src/services/teacherLearningPlan.service.ts');
    expect(service).not.toContain('AnnualPlanView');
    expect(service).not.toContain('annualPlanReference');
    expect(service).not.toContain('prisma.');
  });
});
