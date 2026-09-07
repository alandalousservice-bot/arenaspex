import { describe, expect, it } from 'vitest';
import {
  P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
  P1A_RELEASE_ID,
  projectTeacherPlanSemantics,
  type TeacherPlanSemanticDomainInput,
} from '../src/domain/pedagogicalKnowledge';
import {
  defaultIntegrationTwoAnchorObjectiveId,
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
} from '../src/services/teacherLearningPlan.service';

const gradeOneDomain = () =>
  seedTeacherLearningPlan('lvl_p1').domains.find(
    (domain) => domain.fieldId === 'f_locomotion'
  ) as TeacherPlanSemanticDomainInput;

const projectGradeOne = (domain: TeacherPlanSemanticDomainInput) =>
  projectTeacherPlanSemantics({
    catalog: P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
    coreReleaseId: P1A_RELEASE_ID,
    gradeId: 'lvl_p1',
    domainId: 'f_locomotion',
    finalCompetencyId: 'fc_lvl_p1_f_locomotion',
    domain,
  });

const objectives = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `objective-${index + 1}` }));

describe('P1E Integration 2 default placement hotfix', () => {
  it('anchors default Integration 2 after the final objective for every new Grade 1–5 plan', () => {
    for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
      const domain = seedTeacherLearningPlan(levelId).domains.find(
        (item) => item.fieldId === 'f_locomotion'
      )!;
      expect(domain.integrationPoints[1].afterObjectiveId).toBe(domain.objectives.at(-1)?.id);
    }
  });

  it('produces canonical integration cycles of 3 + 4 objectives', () => {
    expect(
      projectGradeOne(gradeOneDomain()).integrationCycles.map(
        (cycle) => cycle.teacherObjectiveIds.length
      )
    ).toEqual([3, 4]);
  });

  it('selects the final objective for a 6-objective sequence', () => {
    expect(defaultIntegrationTwoAnchorObjectiveId(objectives(6))).toBe('objective-6');
  });

  it('selects the final objective for an 8-objective sequence', () => {
    expect(defaultIntegrationTwoAnchorObjectiveId(objectives(8))).toBe('objective-8');
  });

  it('selects the final objective for a 10-objective sequence', () => {
    expect(defaultIntegrationTwoAnchorObjectiveId(objectives(10))).toBe('objective-10');
  });

  it('handles empty, one-objective, and short sequences safely', () => {
    expect(defaultIntegrationTwoAnchorObjectiveId([])).toBeNull();
    expect(defaultIntegrationTwoAnchorObjectiveId(objectives(1))).toBe('objective-1');
    expect(defaultIntegrationTwoAnchorObjectiveId(objectives(2))).toBe('objective-2');
  });

  it('does not migrate a historical persisted-shaped objective-6 anchor during resolution', () => {
    const generated = seedTeacherLearningPlan('lvl_p1');
    const domain = generated.domains.find((item) => item.fieldId === 'f_locomotion')!;
    const historical = {
      ...generated,
      domains: generated.domains.map((item) =>
        item.fieldId === 'f_locomotion'
          ? {
              ...item,
              integrationPoints: item.integrationPoints.map((point, index) =>
                index === 1 ? { ...point, afterObjectiveId: domain.objectives[5].id } : point
              ),
            }
          : item
      ),
    };
    const before = structuredClone(historical);
    const resolved = resolveTeacherLearningPlan('lvl_p1', historical);
    expect(
      resolved.domains.find((item) => item.fieldId === 'f_locomotion')?.integrationPoints[1]
        .afterObjectiveId
    ).toBe(domain.objectives[5].id);
    expect(historical).toEqual(before);
  });

  it('retains the outside-cycle warning for a historical objective-6 anchor', () => {
    const domain = gradeOneDomain();
    const historical = {
      ...domain,
      integrationPoints: domain.integrationPoints.map((point, index) =>
        index === 1 ? { ...point, afterObjectiveId: domain.objectives[5].id } : point
      ),
    };
    expect(
      projectGradeOne(historical).warnings.some(
        (warning) => warning.code === 'objective_outside_integration_cycles'
      )
    ).toBe(true);
  });

  it('reports no outside-cycle learning objective for a newly generated plan', () => {
    expect(
      projectGradeOne(gradeOneDomain()).warnings.some(
        (warning) => warning.code === 'objective_outside_integration_cycles'
      )
    ).toBe(false);
  });

  it('preserves a Teacher-custom Integration 2 anchor and never mutates its input', () => {
    const generated = seedTeacherLearningPlan('lvl_p1');
    const domain = generated.domains.find((item) => item.fieldId === 'f_locomotion')!;
    const custom = {
      ...generated,
      domains: generated.domains.map((item) =>
        item.fieldId === 'f_locomotion'
          ? {
              ...item,
              integrationPoints: item.integrationPoints.map((point, index) =>
                index === 1 ? { ...point, afterObjectiveId: domain.objectives[4].id } : point
              ),
            }
          : item
      ),
    };
    const before = structuredClone(custom);
    const resolved = resolveTeacherLearningPlan('lvl_p1', custom);
    expect(
      resolved.domains.find((item) => item.fieldId === 'f_locomotion')?.integrationPoints[1]
        .afterObjectiveId
    ).toBe(domain.objectives[4].id);
    expect(custom).toEqual(before);
  });
});
