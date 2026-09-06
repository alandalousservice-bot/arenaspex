import { describe, expect, it } from 'vitest';
import {
  P0_GRADE_ONE_DOMAIN_ONE_CATALOG,
  P1A_DIAGNOSTIC_REQUIREMENT_IDS,
  P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
  P1A_LEARNING_REQUIREMENT_IDS,
  P1A_RELEASE_ID,
  P1A_SUMMATIVE_REQUIREMENT_IDS,
  calculateCompetencyCoverage,
  canSatisfyAuthoritativeCoverage,
  computeCatalogHash,
  deriveIntegrationCoverage,
  validateObjectiveKeySemantics,
  validateObjectiveVariantSemantics,
  validatePedagogicalKnowledgeCatalog,
} from '../src/domain/pedagogicalKnowledge';
import type {
  CompetencyCoverageResult,
  PedagogicalKnowledgeCatalog,
  TeacherObjectiveCoverageInput,
} from '../src/domain/pedagogicalKnowledge';

const conceptId = (index: number): string => `objective-concept:lvl_p1:f_locomotion:${index}`;

const objective = (index: number, conceptIndex = index): TeacherObjectiveCoverageInput => ({
  teacherObjectiveId: `teacher-objective:lvl_p1:f_locomotion:${index}`,
  objectiveConceptId: conceptId(conceptIndex),
});

const calculate = (
  teacherObjectives: readonly TeacherObjectiveCoverageInput[]
): CompetencyCoverageResult =>
  calculateCompetencyCoverage({
    catalog: P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
    coreReleaseId: P1A_RELEASE_ID,
    gradeId: 'lvl_p1',
    domainId: 'f_locomotion',
    finalCompetencyId: 'fc_lvl_p1_f_locomotion',
    teacherObjectives,
  });

const objectiveFixtures = {
  6: [objective(1), objective(2), objective(3), objective(4), objective(5), objective(7)],
  7: Array.from({ length: 7 }, (_, index) => objective(index + 1)),
  8: [...Array.from({ length: 7 }, (_, index) => objective(index + 1)), objective(8, 1)],
  10: [
    ...Array.from({ length: 7 }, (_, index) => objective(index + 1)),
    objective(8, 1),
    objective(9, 3),
    objective(10, 7),
  ],
} as const;

describe('Pedagogical Knowledge Core full P1A Grade 1 / Domain 1', () => {
  it('validates a new immutable release without mutating the closed P0 release', () => {
    expect(validatePedagogicalKnowledgeCatalog(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG)).toEqual([]);
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.release.catalogHash).toBe(
      computeCatalogHash(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG)
    );
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.release.id).toBe('knowledge-core:v1.1-g1-d1');
    expect(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.release.id).toBe('knowledge-core:v1.0-pilot');
    expect(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.finalCompetencies[0].requirementSetStatus).toBe(
      'incomplete'
    );
  });

  it('freezes four stable approved requirements and a complete requirement set', () => {
    const requirements = P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.learningRequirements;
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.finalCompetencies[0].requirementSetStatus).toBe(
      'complete'
    );
    expect(requirements.map((item) => item.id)).toEqual(
      Object.values(P1A_LEARNING_REQUIREMENT_IDS)
    );
    expect(requirements.every(canSatisfyAuthoritativeCoverage)).toBe(true);
    expect(requirements.every((item) => item.description && item.sourceRef)).toBe(true);
  });

  it('keeps the three component identities and models N:M requirement coverage', () => {
    const catalog = P1A_GRADE_ONE_DOMAIN_ONE_CATALOG;
    expect(catalog.competencyComponents).toHaveLength(3);
    expect(
      new Set(catalog.learningRequirements.flatMap((item) => item.competencyComponentIds))
    ).toEqual(new Set(catalog.competencyComponents.map((item) => item.id)));
    expect(
      catalog.learningRequirements.filter((item) => item.competencyComponentIds.length > 1)
    ).toHaveLength(3);
  });

  it('maps all seven approved ObjectiveConcepts to approved requirements with component overlap', () => {
    const catalog = P1A_GRADE_ONE_DOMAIN_ONE_CATALOG;
    const requirements = new Map(catalog.learningRequirements.map((item) => [item.id, item]));
    expect(catalog.objectiveConcepts).toHaveLength(7);
    for (const concept of catalog.objectiveConcepts) {
      expect(canSatisfyAuthoritativeCoverage(concept)).toBe(true);
      expect(concept.learningRequirementIds.length).toBeGreaterThan(0);
      for (const requirementId of concept.learningRequirementIds) {
        const requirement = requirements.get(requirementId);
        expect(requirement).toBeDefined();
        expect(
          requirement?.competencyComponentIds.some((id) =>
            concept.competencyComponentIds.includes(id)
          )
        ).toBe(true);
      }
    }
  });

  it('approves one non-duplicated Arabic variant for each semantic concept', () => {
    const catalog = P1A_GRADE_ONE_DOMAIN_ONE_CATALOG;
    expect(validateObjectiveVariantSemantics(catalog)).toEqual([]);
    expect(catalog.objectiveVariants).toHaveLength(7);
    expect(catalog.objectiveVariants.every((item) => item.reviewStatus === 'approved')).toBe(true);
    expect(new Set(catalog.objectiveVariants.map((item) => item.objectiveConceptId)).size).toBe(7);
  });

  it('rejects the seven generic P0 ObjectiveKey placeholders and publishes no P1A key', () => {
    expect(validateObjectiveKeySemantics(P0_GRADE_ONE_DOMAIN_ONE_CATALOG)).toHaveLength(7);
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveKeys).toEqual([]);
    expect(validateObjectiveKeySemantics(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG)).toEqual([]);
  });

  it('reports complete semantic coverage for the canonical seven-objective plan', () => {
    const result = calculate(objectiveFixtures[7]);
    expect(result.coverageStatus).toBe('complete');
    expect(result.coveragePercentage).toBe(100);
    expect(result.missingRequirements).toEqual([]);
    expect(result.unmappedObjectives).toEqual([]);
  });

  it.each([6, 7, 8, 10] as const)(
    'returns the same complete requirement set for %i objectives',
    (count) => {
      const result = calculate(objectiveFixtures[count]);
      expect(result.coverageStatus).toBe('complete');
      expect(result.requiredRequirements.map((item) => item.id)).toEqual(
        Object.values(P1A_LEARNING_REQUIREMENT_IDS)
      );
      expect(result.coveragePercentage).toBe(100);
    }
  );

  it('reports partial coverage when the authoritative set has a real gap', () => {
    const result = calculate([objective(1), objective(2)]);
    expect(result.coverageStatus).toBe('partial');
    expect(result.missingRequirements.map((item) => item.id)).toContain(
      P1A_LEARNING_REQUIREMENT_IDS.spatialMovement
    );
  });

  it('reports reinforcement without treating it as an error', () => {
    const result = calculate([objective(1), objective(2), objective(7), objective(8, 1)]);
    expect(result.coverageStatus).toBe('complete');
    expect(result.reinforcementRequirements.length).toBeGreaterThan(0);
  });

  it('reports custom objectives without approved semantic links as unmapped', () => {
    const result = calculate([...objectiveFixtures[7], { teacherObjectiveId: 'teacher-custom' }]);
    expect(result.coverageStatus).toBe('complete');
    expect(result.unmappedObjectives).toEqual(['teacher-custom']);
  });

  it('excludes draft and unresolved requirements from the authoritative set', () => {
    const catalog = structuredClone(
      P1A_GRADE_ONE_DOMAIN_ONE_CATALOG
    ) as PedagogicalKnowledgeCatalog;
    catalog.learningRequirements[0].reviewStatus = 'draft';
    catalog.learningRequirements[1].originType = 'unresolved';
    catalog.learningRequirements[1].reviewStatus = 'draft';
    const result = calculateCompetencyCoverage({
      catalog,
      coreReleaseId: P1A_RELEASE_ID,
      gradeId: 'lvl_p1',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p1_f_locomotion',
      teacherObjectives: objectiveFixtures[7],
    });
    expect(result.requiredRequirements.map((item) => item.id)).toEqual([
      P1A_LEARNING_REQUIREMENT_IDS.spatialMovement,
      P1A_LEARNING_REQUIREMENT_IDS.rulesAndSafety,
    ]);
  });

  it('keeps the closed P0 pilot indeterminate while P1A becomes authoritative', () => {
    const result = calculateCompetencyCoverage({
      catalog: P0_GRADE_ONE_DOMAIN_ONE_CATALOG,
      coreReleaseId: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.release.id,
      gradeId: 'lvl_p1',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p1_f_locomotion',
      teacherObjectives: objectiveFixtures[7],
    });
    expect(result.coverageStatus).toBe('indeterminate');
  });

  it('derives current integration cycles only from preceding objectives and adds no requirement', () => {
    const orderedObjectives = objectiveFixtures[7].map((item) => ({
      teacherObjectiveId: item.teacherObjectiveId,
      objectiveConceptId: item.objectiveConceptId,
    }));
    const cycles = deriveIntegrationCoverage(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG, orderedObjectives, [
      {
        integrationId: 'teacher-integration:lvl_p1:f_locomotion:1',
        afterTeacherObjectiveId: orderedObjectives[2].teacherObjectiveId,
      },
      {
        integrationId: 'teacher-integration:lvl_p1:f_locomotion:2',
        afterTeacherObjectiveId: orderedObjectives[5].teacherObjectiveId,
      },
    ]);
    expect(cycles.map((item) => item.teacherObjectiveIds.length)).toEqual([3, 3]);
    expect(cycles.every((item) => item.unmappedTeacherObjectiveIds.length === 0)).toBe(true);
    const allConstructed = new Set(
      P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveConcepts.flatMap(
        (item) => item.learningRequirementIds
      )
    );
    expect(
      cycles.every((cycle) => cycle.learningRequirementIds.every((id) => allConstructed.has(id)))
    ).toBe(true);
    expect(cycles.flatMap((item) => item.teacherObjectiveIds)).not.toContain(
      orderedObjectives[6].teacherObjectiveId
    );
  });

  it('defines diagnostic and summative semantics at the complete competency scope', () => {
    const requiredIds = P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.learningRequirements.map(
      (item) => item.id
    );
    expect(P1A_DIAGNOSTIC_REQUIREMENT_IDS).toEqual(requiredIds);
    expect(P1A_SUMMATIVE_REQUIREMENT_IDS).toEqual(requiredIds);
    expect(P1A_DIAGNOSTIC_REQUIREMENT_IDS).toBe(P1A_SUMMATIVE_REQUIREMENT_IDS);
  });
});
