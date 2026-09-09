import { describe, expect, it } from 'vitest';
import {
  calculateObjectiveBankCoverage,
  orderRecommendedObjectives,
  selectRecommendedObjectives,
} from '../src/data/gradeOneDomainOneObjectiveBank';
import {
  GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK as bank,
  GRADE_THREE_DOMAIN_ONE_RESOURCES as resources,
  GRADE_THREE_DOMAIN_ONE_TRANSVERSAL_RESOURCES as transversalResources,
  GRADE_THREE_LEVEL_ID,
} from '../src/data/gradeThreeDomainOneObjectiveBank';
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

describe('Grade 3 / Domain 1 objective bank', () => {
  it('contains immutable source-derived objectives and official components', () => {
    expect(bank.length).toBeGreaterThan(0);
    expect(new Set(bank.map((item) => item.id)).size).toBe(bank.length);
    expect(
      bank.every((item, index) => item.id === `G3-D1-OBJ-${String(index + 1).padStart(2, '0')}`)
    ).toBe(true);
    expect(Object.isFrozen(bank)).toBe(true);
    expect(bank.every((item) => !item.objectiveText.trim().startsWith('أن'))).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-3:domain-1'))).toBe(
      true
    );
    expect(bank.every((item) => item.curriculumResourceIds.length > 0)).toBe(true);
    expect(
      resources.every(
        (resource) => resource.priority === 'core' || resource.priority === 'supporting'
      )
    ).toBe(true);
    expect(transversalResources.length).toBeGreaterThan(0);
    expect(
      getDomainOneLearningSectionReference(GRADE_THREE_LEVEL_ID, DOMAIN)?.finalCompetency
    ).toBe('يركب جملة من العمليات وينفذها وفق ما يتطلبه الموقف.');
    expect(
      getDomainOneLearningSectionReference(GRADE_THREE_LEVEL_ID, DOMAIN)?.components
    ).toHaveLength(3);
  });

  it('covers every core curriculum resource and keeps IDs as the coverage contract', () => {
    const covered = calculateObjectiveBankCoverage(GRADE_THREE_LEVEL_ID, DOMAIN, bank, resources);
    const core = resources.filter((resource) => resource.priority === 'core');
    expect(covered.covered.map((resource) => resource.id)).toEqual(
      expect.arrayContaining(core.map((resource) => resource.id))
    );
    expect(covered.missing).toEqual([]);
    expect(
      bank.every((item) =>
        item.competencyComponentIds.every((id) => id.includes('lvl_p3:f_locomotion:component:'))
      )
    ).toBe(true);
  });

  it('selects and orders a diverse G3 proposal deterministically', () => {
    const first = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    const second = selectRecommendedObjectives({ bank, resources, requestedCount: 8 });
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(orderRecommendedObjectives(first).map((item) => item.id)).toEqual(
      orderRecommendedObjectives(second).map((item) => item.id)
    );
    expect(new Set(first.flatMap((item) => item.curriculumResourceIds)).size).toBeGreaterThan(4);
  });

  it('keeps throwing resources from inflating Domain 1 transition coverage', () => {
    const objective = (id: string) => bank.find((item) => item.id === id)!;
    expect(objective('G3-D1-OBJ-06').objectiveText).toContain('يتخذ وضعية مناسبة');
    expect(objective('G3-D1-OBJ-06').curriculumResourceIds).toEqual([
      expect.stringContaining('one-hand-throw-static'),
    ]);
    expect(objective('G3-D1-OBJ-06').curriculumResourceIds).not.toEqual(
      expect.arrayContaining([expect.stringContaining('running')])
    );
    expect(objective('G3-D1-OBJ-07').objectiveText).toContain('يتخذ وضعية مناسبة');
    expect(objective('G3-D1-OBJ-07').curriculumResourceIds).not.toEqual(
      expect.arrayContaining([expect.stringContaining('progressive')])
    );
    expect(objective('G3-D1-OBJ-14').curriculumResourceIds).not.toEqual(
      expect.arrayContaining([expect.stringContaining('one-hand-throw-static')])
    );
    const selected = selectRecommendedObjectives({ bank, resources, requestedCount: 6 });
    expect(selected.find((item) => item.id === 'G3-D1-OBJ-06')?.curriculumResourceIds).toEqual([
      expect.stringContaining('one-hand-throw-static'),
    ]);
    expect(selected.find((item) => item.id === 'G3-D1-OBJ-14')?.curriculumResourceIds).not.toEqual(
      expect.arrayContaining([expect.stringContaining('one-hand-throw-static')])
    );
  });

  it('supports automatic generation, snapshots, A/B meetings, and one-meeting special sessions', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_THREE_LEVEL_ID),
      DOMAIN,
      8,
      2,
      { mode: 'replace', objectiveFillMode: 'bank-auto', allowDestructiveReplacement: true }
    );
    const generated = domain(plan);
    expect(generated.objectives).toHaveLength(8);
    expect(
      generated.objectives.every((item) => item.sourceReferenceId?.startsWith('G3-D1-OBJ-'))
    ).toBe(true);
    expect(generated.integrationPoints).toHaveLength(2);
    const sessions = canonicalPlanningSessions(
      GRADE_THREE_LEVEL_ID,
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

  it('supports manual selection and duplicate-source protection', () => {
    const plan = generateTeacherLearningSectionStructure(
      seedTeacherLearningPlan(GRADE_THREE_LEVEL_ID),
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

  it('registers G3/D1 only and leaves unsupported banks unavailable', () => {
    expect(getObjectiveBank(GRADE_THREE_LEVEL_ID, DOMAIN)).toBe(bank);
    expect(getObjectiveBankResources(GRADE_THREE_LEVEL_ID, DOMAIN)).toBe(resources);
    expect(getObjectiveBank('lvl_p4', 'f_fundamentals')).toEqual([]);
    expect(getObjectiveBank(GRADE_THREE_LEVEL_ID, 'f_structuring')).toEqual([]);
  });
});
