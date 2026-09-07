import { describe, expect, it } from 'vitest';
import {
  P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
  P1C_GRADE_IDS,
  P1C_RELEASE_ID,
  canSatisfyAuthoritativeCoverage,
  computeCatalogHash,
  p1cFinalCompetencyId,
  p1cObjectiveConceptIds,
  p1cRequirementIds,
  projectTeacherPlanSemantics,
  validateObjectiveVariantSemantics,
  validatePedagogicalKnowledgeCatalog,
  type P1CGradeId,
  type TeacherPlanSemanticDomainInput,
} from '../src/domain/pedagogicalKnowledge';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';

const conceptId = (gradeId: P1CGradeId, index: number): string =>
  `objective-concept:${gradeId}:f_locomotion:${index}`;

const canonicalDomain = (
  gradeId: P1CGradeId,
  conceptIndexes: readonly number[] = [1, 2, 3, 4, 5, 6, 7],
  withIntegrations = false
): TeacherPlanSemanticDomainInput => {
  const objectives = conceptIndexes.map((conceptIndex, index) => ({
    id: `teacher-objective:${gradeId}:f_locomotion:fixture:${index + 1}`,
    text: `صياغة مرجعية ${index + 1}`,
    orderIndex: index + 1,
    sourceReferenceId: null,
    objectiveConceptId: conceptId(gradeId, conceptIndex),
  }));
  return {
    fieldId: 'f_locomotion',
    finalCompetencyId: p1cFinalCompetencyId(gradeId),
    objectives,
    integrationPoints: withIntegrations
      ? [
          {
            id: `integration:${gradeId}:1`,
            afterObjectiveId: objectives[2].id,
            orderIndex: 1,
            label: 'إدماجية 1',
          },
          {
            id: `integration:${gradeId}:2`,
            afterObjectiveId: objectives[5].id,
            orderIndex: 2,
            label: 'إدماجية 2',
          },
        ]
      : [],
  };
};

const project = (
  gradeId: P1CGradeId,
  domain: TeacherPlanSemanticDomainInput = canonicalDomain(gradeId)
) =>
  projectTeacherPlanSemantics({
    catalog: P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
    coreReleaseId: P1C_RELEASE_ID,
    gradeId,
    domainId: 'f_locomotion',
    finalCompetencyId: p1cFinalCompetencyId(gradeId),
    domain,
  });

describe('P1C Domain 1 semantic catalog across Grades 2–5', () => {
  it('publishes one immutable valid release without changing the Grade 1 gold pilot', () => {
    expect(validatePedagogicalKnowledgeCatalog(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG)).toEqual(
      []
    );
    expect(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.release.catalogHash).toBe(
      computeCatalogHash(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG)
    );
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.release.id).toBe('knowledge-core:v1.1-g1-d1');
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.learningRequirements).toHaveLength(4);
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveConcepts).toHaveLength(7);
  });

  it('keeps all cross-grade semantic identities grade-scoped', () => {
    const ids = [
      ...P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.learningRequirements,
      ...P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts,
    ].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const gradeId of P1C_GRADE_IDS) {
      expect(p1cRequirementIds(gradeId).every((id) => id.includes(`:${gradeId}:`))).toBe(true);
      expect(p1cObjectiveConceptIds(gradeId).every((id) => id.includes(`:${gradeId}:`))).toBe(true);
    }
  });

  it('validates all approved Arabic variants and publishes no speculative ObjectiveKey', () => {
    expect(validateObjectiveVariantSemantics(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG)).toEqual(
      []
    );
    expect(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveVariants).toHaveLength(28);
    expect(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveKeys).toEqual([]);
  });

  describe.each(P1C_GRADE_IDS)('%s / f_locomotion', (gradeId) => {
    it('reconciles canonical identity and the frozen three stable component IDs', () => {
      const finalCompetency = P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.finalCompetencies.find(
        (item) => item.gradeId === gradeId
      );
      const components = P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.competencyComponents.filter(
        (item) => item.gradeId === gradeId
      );
      expect(finalCompetency?.id).toBe(p1cFinalCompetencyId(gradeId));
      expect(finalCompetency?.requirementSetStatus).toBe('complete');
      expect(components.map((item) => item.id)).toEqual(
        [1, 2, 3].map((index) => `learning-section:${gradeId}:f_locomotion:component:${index}`)
      );
      expect(components.every((item) => item.originType === 'reviewed_derived')).toBe(true);
    });

    it('defines a complete approved requirement set with genuine N:M component coverage', () => {
      const requirements = P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.learningRequirements.filter(
        (item) => item.gradeId === gradeId
      );
      const componentIds = new Set(
        P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.competencyComponents
          .filter((item) => item.gradeId === gradeId)
          .map((item) => item.id)
      );
      expect(requirements).toHaveLength(4);
      expect(requirements.every(canSatisfyAuthoritativeCoverage)).toBe(true);
      expect(requirements.every((item) => item.description && item.sourceRef)).toBe(true);
      expect(new Set(requirements.flatMap((item) => item.competencyComponentIds))).toEqual(
        componentIds
      );
      expect(requirements.some((item) => item.competencyComponentIds.length > 1)).toBe(true);
    });

    it('maps seven approved ObjectiveConcepts N:M to requirements and components', () => {
      const concepts = P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts.filter(
        (item) => item.gradeId === gradeId
      );
      const requirementIds = new Set(p1cRequirementIds(gradeId));
      expect(concepts).toHaveLength(7);
      expect(concepts.every(canSatisfyAuthoritativeCoverage)).toBe(true);
      expect(
        concepts.every(
          (item) =>
            item.learningRequirementIds.length > 0 &&
            item.learningRequirementIds.every((id) => requirementIds.has(id)) &&
            item.competencyComponentIds.length > 0
        )
      ).toBe(true);
      expect(concepts.some((item) => item.learningRequirementIds.length > 1)).toBe(true);
    });

    it('resolves the canonical plan and returns complete 4/4 semantic coverage', () => {
      const result = project(gradeId);
      expect(result.objectiveResolutions).toHaveLength(7);
      expect(result.objectiveResolutions.every((item) => item.resolutionStatus === 'exact')).toBe(
        true
      );
      expect(result.coverageStatus).toBe('complete');
      expect(result.coveredRequirements).toHaveLength(4);
      expect(result.missingRequirements).toEqual([]);
    });

    it('keeps split and merged objective shapes equivalent by requirement coverage', () => {
      const split = project(gradeId, canonicalDomain(gradeId, [1, 2, 3, 4, 5, 6, 7, 1]));
      const merged = project(gradeId, canonicalDomain(gradeId, [2, 3, 4, 5, 6, 7]));
      expect(split.objectiveResolutions).toHaveLength(8);
      expect(merged.objectiveResolutions).toHaveLength(6);
      expect(split.coverageStatus).toBe('complete');
      expect(merged.coverageStatus).toBe('complete');
      expect(split.coveredRequirements.map((item) => item.id)).toEqual(
        merged.coveredRequirements.map((item) => item.id)
      );
    });

    it('keeps an unmapped custom objective safe and non-blocking', () => {
      const domain = canonicalDomain(gradeId);
      const result = project(gradeId, {
        ...domain,
        objectives: [
          ...domain.objectives,
          { id: `custom:${gradeId}`, text: 'هدف خاص بالأستاذ', orderIndex: 8 },
        ],
      });
      expect(result.coverageStatus).toBe('complete');
      expect(result.unmappedObjectives.map((item) => item.teacherObjectiveId)).toContain(
        `custom:${gradeId}`
      );
    });

    it('preserves the historical old-placement fixture warning for the seventh objective', () => {
      const domain = canonicalDomain(gradeId, [1, 2, 3, 4, 5, 6, 7], true);
      const result = project(gradeId, domain);
      expect(result.integrationCycles.map((item) => item.teacherObjectiveIds.length)).toEqual([
        3, 3,
      ]);
      expect(
        result.integrationCycles.every((cycle) =>
          cycle.learningRequirementIds.every((id) => p1cRequirementIds(gradeId).includes(id))
        )
      ).toBe(true);
      expect(
        result.warnings
          .find((item) => item.code === 'objective_outside_integration_cycles')
          ?.relatedIds?.includes(domain.objectives[6].id)
      ).toBe(true);
    });

    it('projects diagnostic and summative scope over the full approved requirement set', () => {
      const result = project(gradeId);
      expect(result.diagnosticScope.finalCompetency?.id).toBe(p1cFinalCompetencyId(gradeId));
      expect(result.summativeScope.finalCompetency?.id).toBe(p1cFinalCompetencyId(gradeId));
      expect(result.diagnosticScope.learningRequirements.map((item) => item.id)).toEqual(
        p1cRequirementIds(gradeId)
      );
      expect(result.summativeScope.learningRequirements.map((item) => item.id)).toEqual(
        p1cRequirementIds(gradeId)
      );
    });
  });

  it('resolves only evidenced current runtime source mappings and preserves conflicts', () => {
    for (const gradeId of P1C_GRADE_IDS) {
      const plan = seedTeacherLearningPlan(gradeId);
      const domain = plan.domains.find(
        (item) => item.fieldId === 'f_locomotion'
      ) as TeacherPlanSemanticDomainInput;
      const result = project(gradeId, { ...domain, integrationPoints: [] });
      if (gradeId === 'lvl_p2') {
        expect(
          result.objectiveResolutions.every((item) => item.resolutionStatus === 'source_reference')
        ).toBe(true);
      } else {
        expect(
          result.objectiveResolutions.every((item) => item.resolutionStatus === 'unmapped')
        ).toBe(true);
      }
    }
  });
});
