import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import { GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK } from '../src/data/gradeThreeDomainOneObjectiveBank';
import {
  GRADE_THREE_DOMAIN_TWO_OBJECTIVE_BANK as bank,
  GRADE_THREE_DOMAIN_TWO_RESOURCES as resources,
} from '../src/data/gradeThreeDomainTwoObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import {
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const DOMAIN = 'f_fundamentals';
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Grade 3 / Domain 2 objective bank', () => {
  it('exposes the canonical reference-shaped bank without D1 leakage', () => {
    expect(bank).toHaveLength(10);
    expect(new Set(bank.map((item) => item.id)).size).toBe(10);
    expect(
      bank.every((item) => item.id.startsWith('G3-D2-OBJ-') && !item.objectiveText.startsWith('أن'))
    ).toBe(true);
    expect(resources.filter((item) => item.priority === 'core')).toHaveLength(7);
    expect(resources.filter((item) => item.priority === 'supporting')).toHaveLength(3);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-3:domain-2'))).toBe(
      true
    );
    expect(
      bank.some((item) =>
        item.curriculumResourceIds.some((id) => id.includes('lvl_p3:f_locomotion'))
      )
    ).toBe(false);
    expect(
      bank.some((item) =>
        GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK.some((d1) => d1.objectiveText === item.objectiveText)
      )
    ).toBe(false);
  });

  it('keeps coverage informational and selection deterministic', () => {
    const selected = selectRecommendedObjectives({ bank, resources, requestedCount: 4 });
    const again = selectRecommendedObjectives({ bank, resources, requestedCount: 4 });
    expect(selected.map((item) => item.id)).toEqual(again.map((item) => item.id));
    expect(orderRecommendedObjectives(selected).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(again).map((item) => item.id)
    );
    expect(
      calculateObjectiveBankCoverage('lvl_p3', DOMAIN, selected, resources).missing.length
    ).toBeGreaterThan(0);
  });

  it('registers G3/D2 and preserves G4/G5/domain isolation', () => {
    expect(getObjectiveBank('lvl_p3', DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources('lvl_p3', DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p5', 'f_structuring')).toEqual([]);
    expect(getObjectiveBank('lvl_p3', 'f_structuring').length).toBeGreaterThan(0);
  });

  it('materializes ordinary objectives as A/B meetings and specials once', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan('lvl_p3'),
      DOMAIN,
      6,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    const sessions = canonicalPlanningSessions('lvl_p3', '2026-09-21', '2026-2027', 0, plan).filter(
      (item) => item.domainId === DOMAIN
    );
    expect(generated.objectives).toHaveLength(6);
    expect(sessions.filter((item) => item.sessionType === 'تعلمية')).toHaveLength(12);
    expect(sessions.filter((item) => item.sessionType !== 'تعلمية')).toHaveLength(4);
    for (const objective of generated.objectives)
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(2);
  });
});
