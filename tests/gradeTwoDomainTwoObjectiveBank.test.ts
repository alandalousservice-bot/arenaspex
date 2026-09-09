import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  GRADE_TWO_DOMAIN_TWO_OBJECTIVE_BANK as bank,
  GRADE_TWO_DOMAIN_TWO_RESOURCES as resources,
} from '../src/data/gradeTwoDomainTwoObjectiveBank';
import { getObjectiveBank } from '../src/data/objectiveBankRegistry';
import {
  generateTeacherLearningSectionStructure,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';
import { canonicalPlanningSessions } from '../src/services/teacherPlanning.service';

const DOMAIN = 'f_fundamentals';
const domain = (p: ReturnType<typeof seedTeacherLearningPlan>) =>
  p.domains.find((d) => d.fieldId === DOMAIN)!;

describe('Grade 2 / Domain 2 objective bank', () => {
  it('has stable source-derived objectives and core/supporting resources', () => {
    expect(bank).toHaveLength(10);
    expect(new Set(bank.map((x) => x.id)).size).toBe(10);
    expect(
      bank.every((x) => x.id.startsWith('G2-D2-OBJ-') && !x.objectiveText.startsWith('أن'))
    ).toBe(true);
    expect(resources.filter((x) => x.priority === 'core')).toHaveLength(4);
    expect(resources.filter((x) => x.priority === 'supporting')).toHaveLength(4);
    expect(bank.every((x) => x.sourceReferences.includes('EPS-2023:grade-2:domain-2'))).toBe(true);
  });
  it('selects and orders deterministically without artificial small-plan coverage', () => {
    const first = selectRecommendedObjectives({ bank, resources, requestedCount: 4 });
    const second = selectRecommendedObjectives({ bank, resources, requestedCount: 4 });
    expect(first.map((x) => x.id)).toEqual(second.map((x) => x.id));
    expect(orderRecommendedObjectives(first).map((x) => x.id)).toEqual(
      orderRecommendedObjectives(second).map((x) => x.id)
    );
    expect(
      calculateObjectiveBankCoverage('lvl_p2', DOMAIN, first, resources).missing.length
    ).toBeGreaterThan(0);
  });
  it('registers G2/D2 and materializes objectives as A/B meetings', () => {
    expect(getObjectiveBank('lvl_p2', DOMAIN)).toBe(bank);
    expect(getObjectiveBank('lvl_p3', DOMAIN)).toEqual([]);
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan('lvl_p2'),
      DOMAIN,
      6,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    expect(generated.objectives).toHaveLength(6);
    expect(generated.objectives.every((x) => x.sourceReferenceId?.startsWith('G2-D2-OBJ-'))).toBe(
      true
    );
    const sessions = canonicalPlanningSessions('lvl_p2', '2026-09-21', '2026-2027', 0, plan).filter(
      (x) => x.domainId === DOMAIN
    );
    for (const objective of generated.objectives)
      expect(sessions.filter((x) => x.objectiveId === objective.id)).toHaveLength(2);
    expect(sessions.filter((x) => x.sessionType !== 'تعلمية')).toHaveLength(4);
  });
});
