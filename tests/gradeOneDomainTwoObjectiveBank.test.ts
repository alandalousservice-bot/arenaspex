import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  GRADE_ONE_DOMAIN_TWO_OBJECTIVE_BANK as bank,
  GRADE_ONE_DOMAIN_TWO_RESOURCES as resources,
  GRADE_ONE_DOMAIN_TWO_TRANSVERSAL_RESOURCES as transversals,
} from '../src/data/gradeOneDomainTwoObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import {
  addTeacherLearningObjectiveFromBank,
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';
import { GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK } from '../src/data/gradeOneDomainOneObjectiveBank';

const DOMAIN = 'f_fundamentals';
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Grade 1 / Domain 2 objective bank', () => {
  it('has canonical competency-compatible resources and distinct domain identity', () => {
    expect(bank).toHaveLength(8);
    expect(new Set(bank.map((item) => item.id)).size).toBe(8);
    expect(bank.every((item) => item.id.startsWith('G1-D2-OBJ-'))).toBe(true);
    expect(bank.every((item) => !item.objectiveText.startsWith('أن'))).toBe(true);
    expect(bank.every((item) => item.domainId === DOMAIN)).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-1:domain-2'))).toBe(
      true
    );
    expect(transversals).toHaveLength(4);
    expect(resources.filter((item) => item.priority === 'core')).toHaveLength(4);
    expect(resources.filter((item) => item.priority === 'supporting')).toHaveLength(2);
    expect(bank.map((item) => item.objectiveText)).not.toEqual(
      expect.arrayContaining(GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK.map((item) => item.objectiveText))
    );
  });

  it('keeps coverage direct, selection deterministic, and progression ordered', () => {
    const first = selectRecommendedObjectives({ bank, resources, requestedCount: 6 });
    const second = selectRecommendedObjectives({ bank, resources, requestedCount: 6 });
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(orderRecommendedObjectives(first).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(second).map((item) => item.id)
    );
    const coverage = calculateObjectiveBankCoverage('lvl_p1', DOMAIN, first, resources);
    expect(coverage.covered.length).toBe(resources.length);
    const smallCoverage = calculateObjectiveBankCoverage(
      'lvl_p1',
      DOMAIN,
      selectRecommendedObjectives({ bank, resources, requestedCount: 4 }),
      resources
    );
    expect(smallCoverage.missing.length).toBeGreaterThan(0);
  });

  it('registers only G1/D2 and materializes ordinary objectives as A/B snapshots', () => {
    expect(getObjectiveBank('lvl_p1', DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources('lvl_p1', DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p2', DOMAIN)).toEqual([]);
    expect(getObjectiveBank('lvl_p1', 'f_structuring')).toEqual([]);
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan('lvl_p1'),
      DOMAIN,
      6,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    expect(generated.objectives).toHaveLength(6);
    expect(
      generated.objectives.every((item) => item.sourceReferenceId?.startsWith('G1-D2-OBJ-'))
    ).toBe(true);
    const sessions = canonicalPlanningSessions('lvl_p1', '2026-09-21', '2026-2027', 0, plan).filter(
      (item) => item.domainId === DOMAIN
    );
    for (const objective of generated.objectives) {
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(2);
    }
    expect(sessions.filter((item) => item.sessionType !== 'تعلمية')).toHaveLength(4);
  });

  it('supports manual bank selection without mutating the reference bank', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan('lvl_p1'),
      DOMAIN,
      1,
      0,
      { mode: 'replace', objectiveFillMode: 'structure-only', allowDestructiveReplacement: true }
    );
    const selected = addTeacherLearningObjectiveFromBank(
      plan,
      DOMAIN,
      bank[0].id,
      domain(plan).objectives[0].id
    );
    expect(domain(selected).objectives[0].sourceReferenceId).toBe(bank[0].id);
    expect(Object.isFrozen(bank)).toBe(true);
  });
});
