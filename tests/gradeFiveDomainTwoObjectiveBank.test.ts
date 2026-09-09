import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import { GRADE_FIVE_DOMAIN_ONE_OBJECTIVE_BANK } from '../src/data/gradeFiveDomainOneObjectiveBank';
import {
  GRADE_FIVE_DOMAIN_TWO_OBJECTIVE_BANK as bank,
  GRADE_FIVE_DOMAIN_TWO_RESOURCES as resources,
} from '../src/data/gradeFiveDomainTwoObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import {
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const DOMAIN = 'f_fundamentals';
const domain = (plan: ReturnType<typeof seedTeacherLearningPlan>) =>
  plan.domains.find((item) => item.fieldId === DOMAIN)!;

describe('Grade 5 / Domain 2 objective bank', () => {
  it('keeps every objective feasible for one lesson and protects D1/D3 boundaries', () => {
    expect(bank).toHaveLength(15);
    expect(new Set(bank.map((item) => item.id)).size).toBe(15);
    expect(
      bank.every((item) => item.id.startsWith('G5-D2-OBJ-') && !item.objectiveText.startsWith('أن'))
    ).toBe(true);
    expect(bank.every((item) => !/\d|٪|%|ثانية|تكرار/.test(item.objectiveText))).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-5:domain-2'))).toBe(
      true
    );
    expect(
      bank.some((item) =>
        GRADE_FIVE_DOMAIN_ONE_OBJECTIVE_BANK.some((d1) => d1.objectiveText === item.objectiveText)
      )
    ).toBe(false);
    expect(
      bank.every((item) =>
        item.curriculumResourceIds.every((id) => id.includes('lvl_p5:f_fundamentals'))
      )
    ).toBe(true);
  });

  it('classifies force, accuracy, safety and combinations without inflating coverage', () => {
    expect(resources.filter((item) => item.priority === 'core')).toHaveLength(11);
    expect(resources.filter((item) => item.priority === 'supporting')).toHaveLength(4);
    expect(
      bank.some((item) => item.curriculumResourceIds.some((id) => id.includes('combined')))
    ).toBe(false);
    const selected = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    const again = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    expect(selected.map((item) => item.id)).toEqual(again.map((item) => item.id));
    expect(orderRecommendedObjectives(selected).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(again).map((item) => item.id)
    );
    expect(new Set(selected.map((item) => item.tags[0])).size).toBeGreaterThan(1);
    expect(
      calculateObjectiveBankCoverage('lvl_p5', DOMAIN, selected, resources).missing.length
    ).toBeGreaterThan(0);
  });

  it('registers G5/D2 while keeping Domain 3 unsupported', () => {
    expect(getObjectiveBank('lvl_p5', DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources('lvl_p5', DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p5', 'f_structuring')).toEqual([]);
    expect(getObjectiveBank('lvl_p5', 'domain3')).toEqual([]);
  });

  it('materializes each ordinary objective once with no A/B pairing', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan('lvl_p5'),
      DOMAIN,
      10,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    const sessions = canonicalPlanningSessions('lvl_p5', '2026-09-21', '2026-2027', 0, plan).filter(
      (item) => item.domainId === DOMAIN
    );
    expect(generated.objectives).toHaveLength(10);
    expect(sessions.filter((item) => item.sessionType === 'تعلمية')).toHaveLength(10);
    expect(sessions.filter((item) => item.sessionType !== 'تعلمية')).toHaveLength(4);
    for (const objective of generated.objectives)
      expect(sessions.filter((item) => item.objectiveId === objective.id)).toHaveLength(1);
  });
});
