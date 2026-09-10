import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  GRADE_FIVE_DOMAIN_ONE_OBJECTIVE_BANK as bank,
  GRADE_FIVE_DOMAIN_ONE_RESOURCES as resources,
  GRADE_FIVE_DOMAIN_ONE_TRANSVERSAL_RESOURCES as transversals,
  GRADE_FIVE_LEVEL_ID,
} from '../src/data/gradeFiveDomainOneObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import { getDomainOneLearningSectionReference } from '../src/data/domainOneLearningSectionReference';
import {
  addTeacherLearningObjectiveFromBank,
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const DOMAIN = 'f_locomotion';
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Grade 5 / Domain 1 objective bank', () => {
  it('has the canonical final competency, immutable bank, and observable objectives', () => {
    expect(bank.length).toBeGreaterThan(0);
    expect(new Set(bank.map((item) => item.id)).size).toBe(bank.length);
    expect(
      bank.every((item, index) => item.id === `G5-D1-OBJ-${String(index + 1).padStart(2, '0')}`)
    ).toBe(true);
    expect(Object.isFrozen(bank)).toBe(true);
    expect(bank.every((item) => !item.objectiveText.trim().startsWith('أن'))).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-5:domain-1'))).toBe(
      true
    );
    expect(getDomainOneLearningSectionReference(GRADE_FIVE_LEVEL_ID, DOMAIN)?.finalCompetency).toBe(
      'ينجز مختلف الوضعيات والتنقلات في الرياضات الفردية والألعاب الجماعية محافظا على ترابطها، ويلائم وضعية جسمه حسب الموقف.'
    );
    expect(
      getDomainOneLearningSectionReference(GRADE_FIVE_LEVEL_ID, DOMAIN)?.components
    ).toHaveLength(3);
    expect(transversals.length).toBeGreaterThan(0);
  });

  it('covers all core resources by IDs without invented quantities', () => {
    const coverage = calculateObjectiveBankCoverage(GRADE_FIVE_LEVEL_ID, DOMAIN, bank, resources);
    expect(coverage.missing).toEqual([]);
    expect(coverage.covered.map((item) => item.id)).toEqual(
      expect.arrayContaining(
        resources.filter((item) => item.priority === 'core').map((item) => item.id)
      )
    );
    expect(bank.join(' ')).not.toMatch(/\d+\s*(مرة|متر|ثانية|٪|%)/);
  });

  it('selects broadly and orders deterministically', () => {
    const first = selectRecommendedObjectives({ bank, resources, requestedCount: 6 });
    const second = selectRecommendedObjectives({ bank, resources, requestedCount: 6 });
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(orderRecommendedObjectives(first).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(second).map((item) => item.id)
    );
    expect(new Set(first.flatMap((item) => item.curriculumResourceIds)).size).toBeGreaterThan(5);
  });

  it('keeps advanced and integrative objectives semantically narrow', () => {
    const objective = (id: string) => bank.find((item) => item.id === id)!;
    expect(objective('G5-D1-OBJ-10').curriculumResourceIds).toEqual([
      expect.stringContaining('combined-movement-sequence'),
    ]);
    expect(objective('G5-D1-OBJ-10').curriculumResourceIds).not.toEqual(
      expect.arrayContaining([expect.stringContaining('push-force-sequence')])
    );
    expect(objective('G5-D1-OBJ-13').objectiveText).toBe(
      'يلائم وضعية جسمه عند الانتقال بين حركتين حسب متطلبات الموقف.'
    );
    expect(objective('G5-D1-OBJ-13').curriculumResourceIds).toEqual(
      expect.arrayContaining([expect.stringContaining('body-position-adaptation')])
    );
    expect(objective('G5-D1-OBJ-13').curriculumResourceIds).toHaveLength(2);
    expect(objective('G5-D1-OBJ-13').curriculumResourceIds).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('running-balance'),
        expect.stringContaining('jump-balance'),
        expect.stringContaining('throw-object-awareness'),
      ])
    );
    expect(objective('G5-D1-OBJ-14').curriculumResourceIds).toEqual(
      expect.arrayContaining([
        expect.stringContaining('individual-execution'),
        expect.stringContaining('movement-coherence'),
      ])
    );
    expect(objective('G5-D1-OBJ-15').curriculumResourceIds).toEqual(
      expect.arrayContaining([
        expect.stringContaining('movement-coherence'),
        expect.stringContaining('safe-execution-space'),
      ])
    );
    expect(objective('G5-D1-OBJ-10').progressionStage).toBe('locomotion-advanced');
    expect(objective('G5-D1-OBJ-10').sequenceWeight).toBeGreaterThan(
      objective('G5-D1-OBJ-09').sequenceWeight
    );
    expect(
      selectRecommendedObjectives({ bank, resources, requestedCount: 6 }).map((item) => item.id)
    ).not.toContain('G5-D1-OBJ-10');
  });

  it('materializes each learning objective as exactly one meeting, never A/B', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_FIVE_LEVEL_ID),
      DOMAIN,
      6,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    expect(generated.objectives).toHaveLength(6);
    expect(
      generated.objectives.every((item) => item.sourceReferenceId?.startsWith('G5-D1-OBJ-'))
    ).toBe(true);
    expect(generated.integrationPoints).toHaveLength(2);
    const sessions = canonicalPlanningSessions(
      GRADE_FIVE_LEVEL_ID,
      '2026-09-21',
      '2026-2027',
      0,
      plan
    ).filter((item) => item.domainId === DOMAIN);
    for (const objective of generated.objectives) {
      const occurrences = sessions.filter((item) => item.objectiveId === objective.id);
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].referenceSessionId).not.toContain(':meeting:');
    }
    for (const special of sessions.filter((item) => item.sessionType !== 'تعلمية'))
      expect(
        sessions.filter((item) => item.objectiveGroupId === special.objectiveGroupId)
      ).toHaveLength(1);
  });

  it('supports manual selection and duplicate source protection', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_FIVE_LEVEL_ID),
      DOMAIN,
      1,
      0,
      { mode: 'replace', objectiveFillMode: 'structure-only', allowDestructiveReplacement: true }
    );
    const target = domain(plan).objectives[0];
    const selected = addTeacherLearningObjectiveFromBank(plan, DOMAIN, bank[0].id, target.id);
    expect(domain(selected).objectives[0].sourceReferenceId).toBe(bank[0].id);
    expect(() => addTeacherLearningObjectiveFromBank(selected, DOMAIN, bank[0].id)).toThrow(
      'مضاف إلى المقطع بالفعل'
    );
  });

  it('registers all five Domain 1 banks while keeping other domains unsupported', () => {
    expect(getObjectiveBank(GRADE_FIVE_LEVEL_ID, DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources(GRADE_FIVE_LEVEL_ID, DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p5', 'f_fundamentals').length).toBeGreaterThan(0);
    expect(getObjectiveBank('lvl_p5', 'f_structuring').length).toBeGreaterThan(0);
  });
});
