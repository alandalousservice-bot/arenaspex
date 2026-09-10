import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  GRADE_FOUR_DOMAIN_ONE_OBJECTIVE_BANK as bank,
  GRADE_FOUR_DOMAIN_ONE_RESOURCES as resources,
  GRADE_FOUR_DOMAIN_ONE_TRANSVERSAL_RESOURCES as transversals,
  GRADE_FOUR_LEVEL_ID,
} from '../src/data/gradeFourDomainOneObjectiveBank';
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

describe('Grade 4 / Domain 1 objective bank', () => {
  it('has stable immutable motor objectives and official components', () => {
    expect(bank.length).toBeGreaterThan(0);
    expect(new Set(bank.map((item) => item.id)).size).toBe(bank.length);
    expect(
      bank.every((item, index) => item.id === `G4-D1-OBJ-${String(index + 1).padStart(2, '0')}`)
    ).toBe(true);
    expect(Object.isFrozen(bank)).toBe(true);
    expect(bank.every((item) => !item.objectiveText.trim().startsWith('أن'))).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-4:domain-1'))).toBe(
      true
    );
    expect(getDomainOneLearningSectionReference(GRADE_FOUR_LEVEL_ID, DOMAIN)?.finalCompetency).toBe(
      'ينجز مختلف الحركات فرديا وجماعيا ويحافظ على ترابطها.'
    );
    expect(
      getDomainOneLearningSectionReference(GRADE_FOUR_LEVEL_ID, DOMAIN)?.components
    ).toHaveLength(3);
    expect(transversals.length).toBeGreaterThan(0);
  });

  it('covers all core resources by stable IDs', () => {
    const coverage = calculateObjectiveBankCoverage(GRADE_FOUR_LEVEL_ID, DOMAIN, bank, resources);
    expect(coverage.missing).toEqual([]);
    expect(coverage.covered.map((item) => item.id)).toEqual(
      expect.arrayContaining(
        resources.filter((item) => item.priority === 'core').map((item) => item.id)
      )
    );
  });

  it('selects deterministically and orders independently', () => {
    const first = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    const second = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(orderRecommendedObjectives(first).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(second).map((item) => item.id)
    );
    expect(new Set(first.flatMap((item) => item.curriculumResourceIds)).size).toBeGreaterThan(5);
  });

  it('supports automatic generation and Grades 1-4 A/B rules', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_FOUR_LEVEL_ID),
      DOMAIN,
      8,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    expect(generated.objectives).toHaveLength(8);
    expect(
      generated.objectives.every((item) => item.sourceReferenceId?.startsWith('G4-D1-OBJ-'))
    ).toBe(true);
    expect(generated.integrationPoints).toHaveLength(2);
    const sessions = canonicalPlanningSessions(
      GRADE_FOUR_LEVEL_ID,
      '2026-09-21',
      '2026-2027',
      0,
      plan
    ).filter((item) => item.domainId === DOMAIN);
    for (const objective of generated.objectives)
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(2);
    for (const special of sessions.filter((item) => item.sessionType !== 'تعلمية'))
      expect(
        sessions.filter((item) => item.objectiveGroupId === special.objectiveGroupId)
      ).toHaveLength(1);
  });

  it('supports manual selection and source-identity duplicate protection', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_FOUR_LEVEL_ID),
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

  it('registers G4/D1 while keeping G5 and other domains unsupported', () => {
    expect(getObjectiveBank(GRADE_FOUR_LEVEL_ID, DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources(GRADE_FOUR_LEVEL_ID, DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p5', 'f_structuring')).toEqual([]);
    expect(getObjectiveBank(GRADE_FOUR_LEVEL_ID, 'f_structuring').length).toBeGreaterThan(0);
  });
});
