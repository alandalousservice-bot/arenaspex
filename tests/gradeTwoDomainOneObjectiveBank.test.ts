import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  GRADE_TWO_DOMAIN_ONE_OBJECTIVE_BANK as bank,
  GRADE_TWO_DOMAIN_ONE_RESOURCES as resources,
  GRADE_TWO_LEVEL_ID,
} from '../src/data/gradeTwoDomainOneObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import { getDomainOneLearningSectionReference } from '../src/data/domainOneLearningSectionReference';
import {
  addTeacherLearningObjectiveFromBank,
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const DOMAIN = 'f_locomotion';
const source = (path: string) => readFileSync(path, 'utf8');
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Grade 2 / Domain 1 objective bank', () => {
  it('has stable immutable IDs and the official final competency/components', () => {
    expect(bank.length).toBeGreaterThanOrEqual(14);
    expect(new Set(bank.map((item) => item.id)).size).toBe(bank.length);
    expect(
      bank.every((item, index) => item.id === `G2-D1-OBJ-${String(index + 1).padStart(2, '0')}`)
    ).toBe(true);
    expect(Object.isFrozen(bank)).toBe(true);
    expect(getDomainOneLearningSectionReference(GRADE_TWO_LEVEL_ID, DOMAIN)?.finalCompetency).toBe(
      'يعدل في الوقت المناسب وضعياته وتنقلاته من موقف إلى آخر.'
    );
    expect(
      getDomainOneLearningSectionReference(GRADE_TWO_LEVEL_ID, DOMAIN)?.components
    ).toHaveLength(3);
    expect(
      bank.every((item) =>
        item.competencyComponentIds.every((id) => id.includes('lvl_p2:f_locomotion:component:'))
      )
    ).toBe(true);
  });

  it('uses direct observable motor objectives without invented quantities', () => {
    expect(bank.every((item) => !item.objectiveText.trim().startsWith('أن'))).toBe(true);
    expect(bank.every((item) => item.curriculumResourceIds.length > 0)).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-2:domain-1'))).toBe(
      true
    );
    expect(bank.join(' ')).not.toMatch(/\d+\s*(مرة|متر|ثانية|٪|%)/);
  });

  it('covers posture, transitions, balance, locomotion, speed, paths, and adaptation families', () => {
    const familySet = new Set(resources.map((resource) => resource.family));
    for (const family of [
      'posture',
      'transition',
      'balance-support',
      'walking',
      'jogging',
      'running',
      'speed-control',
      'path-straight',
      'path-zigzag',
      'path-circular',
      'adaptation',
      'organization',
    ]) {
      expect(familySet.has(family as never)).toBe(true);
    }
    expect(resources.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        'المسار المستقيم',
        'المسار المتعرج',
        'الدائرة المغلقة',
        'الجري السريع',
      ])
    );
  });

  it('keeps selection and ordering metadata separate and deterministic', () => {
    const first = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    const second = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    const ordered = orderRecommendedObjectives(first);
    expect(ordered.map((item) => item.id)).toEqual([
      'G2-D1-OBJ-02',
      'G2-D1-OBJ-05',
      'G2-D1-OBJ-10',
      'G2-D1-OBJ-11',
      'G2-D1-OBJ-12',
      'G2-D1-OBJ-15',
      'G2-D1-OBJ-17',
      'G2-D1-OBJ-14',
    ]);
    expect(ordered[0].sequenceWeight).toBeLessThan(ordered.at(-1)!.sequenceWeight);
    expect(resources[0]).toHaveProperty('selectionWeight');
    expect(resources[0]).not.toHaveProperty('sequenceWeight');
  });

  it('registers only G1/D1 and G2/D1 while keeping other banks unavailable', () => {
    expect(getObjectiveBank('lvl_p2', DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources('lvl_p2', DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p3', DOMAIN)).toEqual([]);
    expect(getObjectiveBank('lvl_p2', 'f_fundamentals')).toEqual([]);
    expect(source('src/data/objectiveBankRegistry.ts')).not.toMatch(/lvl_p3|lvl_p4|lvl_p5/);
  });

  it('auto-generates ordered G2 snapshots with integrations and Grade 2 A/B behavior', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_TWO_LEVEL_ID),
      DOMAIN,
      8,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    expect(generated.objectives.map((item) => item.sourceReferenceId)).toEqual(
      orderRecommendedObjectives(
        selectRecommendedObjectives({ bank, resources, requestedCount: 8 })
      ).map((item) => item.id)
    );
    expect(
      generated.integrationPoints.map(
        (point) => generated.objectives.findIndex((item) => item.id === point.afterObjectiveId) + 1
      )
    ).toEqual([4, 8]);
    expect(
      calculateObjectiveBankCoverage(GRADE_TWO_LEVEL_ID, DOMAIN, generated.objectives, resources)
        .covered.length
    ).toBeGreaterThan(0);
    const sessions = canonicalPlanningSessions(
      GRADE_TWO_LEVEL_ID,
      '2026-09-21',
      '2026-2027',
      0,
      plan
    ).filter((item) => item.domainId === DOMAIN);
    for (const objective of generated.objectives) {
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(2);
    }
    for (const special of sessions.filter((item) => item.sessionType !== 'تعلمية')) {
      expect(
        sessions.filter((item) => item.objectiveGroupId === special.objectiveGroupId)
      ).toHaveLength(1);
    }
  });

  it('supports manual replacement, duplicate-source protection, snapshots, and coverage by IDs', () => {
    const structure = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_TWO_LEVEL_ID),
      DOMAIN,
      2,
      0,
      { mode: 'replace', objectiveFillMode: 'structure-only', allowDestructiveReplacement: true }
    );
    const target = domain(structure).objectives[0];
    const manual = addTeacherLearningObjectiveFromBank(structure, DOMAIN, bank[0].id, target.id);
    expect(domain(manual).objectives[0]).toMatchObject({
      id: target.id,
      sourceReferenceId: bank[0].id,
      text: bank[0].objectiveText,
    });
    expect(
      calculateObjectiveBankCoverage(
        GRADE_TWO_LEVEL_ID,
        DOMAIN,
        domain(manual).objectives,
        resources
      ).covered.map((item) => item.id)
    ).toContain(resources[0].id);
    expect(() => addTeacherLearningObjectiveFromBank(manual, DOMAIN, bank[0].id)).toThrow(
      'مضاف إلى المقطع بالفعل'
    );
  });

  it('keeps print/downstream boundaries and no AI or Annual Plan coupling', () => {
    const ui = source('src/components/curriculum/LearningSegmentsView.tsx');
    const service = source('src/services/teacherLearningPlan.service.ts');
    const print = source('src/components/curriculum/LearningSectionPrintDocument.tsx');
    expect(ui).toContain('توليد وترتيب تلقائي من بنك الأهداف');
    expect(ui).toContain('اختيار يدوي من بنك الأهداف');
    expect(ui).not.toMatch(/الذكاء الاصطناعي|Gemini|API key/);
    expect(service).not.toContain('AnnualPlanView');
    expect(service).not.toContain('prisma.');
    expect(print).not.toContain('طريقة بناء الأهداف');
  });
});
