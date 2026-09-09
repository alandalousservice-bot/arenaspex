import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import { GRADE_FOUR_DOMAIN_ONE_OBJECTIVE_BANK } from '../src/data/gradeFourDomainOneObjectiveBank';
import {
  GRADE_FOUR_DOMAIN_TWO_OBJECTIVE_BANK as bank,
  GRADE_FOUR_DOMAIN_TWO_RESOURCES as resources,
} from '../src/data/gradeFourDomainTwoObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import {
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const DOMAIN = 'f_fundamentals';
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Grade 4 / Domain 2 objective bank', () => {
  it('covers the canonical movement families without D1 leakage', () => {
    expect(bank).toHaveLength(12);
    expect(new Set(bank.map((item) => item.id)).size).toBe(12);
    expect(
      bank.every((item) => item.id.startsWith('G4-D2-OBJ-') && !item.objectiveText.startsWith('أن'))
    ).toBe(true);
    expect(resources.filter((item) => item.priority === 'core')).toHaveLength(9);
    expect(resources.filter((item) => item.priority === 'supporting')).toHaveLength(3);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-4:domain-2'))).toBe(
      true
    );
    expect(
      bank.some((item) =>
        item.curriculumResourceIds.some((id) => id.includes('lvl_p4:f_locomotion'))
      )
    ).toBe(false);
    expect(
      bank.some((item) =>
        GRADE_FOUR_DOMAIN_ONE_OBJECTIVE_BANK.some((d1) => d1.objectiveText === item.objectiveText)
      )
    ).toBe(false);
  });

  it('keeps direct coverage and deterministic family-diverse selection', () => {
    const selected = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    const again = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    expect(selected.map((item) => item.id)).toEqual(again.map((item) => item.id));
    expect(orderRecommendedObjectives(selected).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(again).map((item) => item.id)
    );
    expect(new Set(selected.map((item) => item.tags[0])).size).toBeGreaterThan(1);
    expect(
      calculateObjectiveBankCoverage('lvl_p4', DOMAIN, selected, resources).missing.length
    ).toBeGreaterThan(0);
  });

  it('registers only G4/D2 among the remaining D2 levels', () => {
    expect(getObjectiveBank('lvl_p4', DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources('lvl_p4', DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p5', DOMAIN)).toEqual([]);
    expect(getObjectiveBank('lvl_p4', 'f_structuring')).toEqual([]);
  });

  it('materializes objectives as A/B meetings and specials once', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan('lvl_p4'),
      DOMAIN,
      10,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    const sessions = canonicalPlanningSessions('lvl_p4', '2026-09-21', '2026-2027', 0, plan).filter(
      (item) => item.domainId === DOMAIN
    );
    expect(generated.objectives).toHaveLength(10);
    expect(sessions.filter((item) => item.sessionType === 'تعلمية')).toHaveLength(20);
    expect(sessions.filter((item) => item.sessionType !== 'تعلمية')).toHaveLength(4);
    for (const objective of generated.objectives)
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(2);
  });
});
