import { describe, expect, it } from 'vitest';
import {
  P0_FINAL_COMPETENCY_ID,
  P0_GRADE_ID,
  P0_GRADE_ONE_DOMAIN_ONE_CATALOG,
  P0_DOMAIN_ID,
  calculateCompetencyCoverage,
  canSatisfyAuthoritativeCoverage,
  computeCatalogHash,
  resolveKnowledgeId,
  validateKnowledgeAliases,
  validatePedagogicalKnowledgeCatalog,
  validateProvenance,
} from '../src/domain/pedagogicalKnowledge';
import type {
  CompetencyCoverageInput,
  KnowledgeAlias,
  PedagogicalKnowledgeCatalog,
  TeacherObjectiveCoverageInput,
} from '../src/domain/pedagogicalKnowledge';

const mutableCatalog = (): PedagogicalKnowledgeCatalog =>
  structuredClone(P0_GRADE_ONE_DOMAIN_ONE_CATALOG) as PedagogicalKnowledgeCatalog;

const rehash = (catalog: PedagogicalKnowledgeCatalog): PedagogicalKnowledgeCatalog => {
  catalog.release.catalogHash = computeCatalogHash(catalog);
  return catalog;
};

const completeCatalog = (): PedagogicalKnowledgeCatalog => {
  const catalog = mutableCatalog();
  catalog.finalCompetencies[0].requirementSetStatus = 'complete';
  return rehash(catalog);
};

const coverageInput = (
  catalog: PedagogicalKnowledgeCatalog,
  teacherObjectives: readonly TeacherObjectiveCoverageInput[]
): CompetencyCoverageInput => ({
  catalog,
  coreReleaseId: catalog.release.id,
  gradeId: P0_GRADE_ID,
  domainId: P0_DOMAIN_ID,
  finalCompetencyId: P0_FINAL_COMPETENCY_ID,
  teacherObjectives,
});

describe('Pedagogical Knowledge Core P0 catalog', () => {
  it('validates the immutable Grade 1 / Domain 1 pilot catalog and deterministic hash', () => {
    expect(validatePedagogicalKnowledgeCatalog(P0_GRADE_ONE_DOMAIN_ONE_CATALOG)).toEqual([]);
    expect(Object.isFrozen(P0_GRADE_ONE_DOMAIN_ONE_CATALOG)).toBe(true);
    expect(Object.isFrozen(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.learningRequirements)).toBe(true);
    expect(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.release.catalogHash).toBe(
      computeCatalogHash(P0_GRADE_ONE_DOMAIN_ONE_CATALOG)
    );
  });

  it('preserves current grade, domain, final-competency, component, and source IDs', () => {
    expect(P0_GRADE_ID).toBe('lvl_p1');
    expect(P0_DOMAIN_ID).toBe('f_locomotion');
    expect(P0_FINAL_COMPETENCY_ID).toBe('fc_lvl_p1_f_locomotion');
    expect(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.competencyComponents.map((item) => item.id)).toEqual([
      'learning-section:lvl_p1:f_locomotion:component:1',
      'learning-section:lvl_p1:f_locomotion:component:2',
      'learning-section:lvl_p1:f_locomotion:component:3',
    ]);
    expect(resolveKnowledgeId('f_locomotion__2', P0_GRADE_ONE_DOMAIN_ONE_CATALOG.aliases)).toBe(
      'objective-concept:lvl_p1:f_locomotion:1'
    );
  });

  it('models CompetencyComponent N:M LearningRequirement links', () => {
    const requirements = P0_GRADE_ONE_DOMAIN_ONE_CATALOG.learningRequirements;
    expect(requirements.some((item) => item.competencyComponentIds.length > 1)).toBe(true);
    const componentTwo = 'learning-section:lvl_p1:f_locomotion:component:2';
    expect(
      requirements.filter((item) => item.competencyComponentIds.includes(componentTwo)).length
    ).toBeGreaterThan(1);
  });

  it('links approved ObjectiveConcepts to LearningRequirements without using wording as identity', () => {
    const concepts = P0_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveConcepts;
    expect(concepts).toHaveLength(7);
    expect(concepts.every((item) => item.learningRequirementIds.length > 0)).toBe(true);
    expect(new Set(concepts.map((item) => item.id)).size).toBe(concepts.length);
    expect(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveVariants).toHaveLength(7);
    expect(P0_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveKeys).toHaveLength(7);
  });

  it('rejects ambiguous and cyclic historical aliases', () => {
    const ambiguous: KnowledgeAlias[] = [
      { legacyId: 'old', canonicalId: 'one', reason: 'test' },
      { legacyId: 'old', canonicalId: 'two', reason: 'test' },
    ];
    const cyclic: KnowledgeAlias[] = [
      { legacyId: 'one', canonicalId: 'two', reason: 'test' },
      { legacyId: 'two', canonicalId: 'one', reason: 'test' },
    ];
    expect(validateKnowledgeAliases(ambiguous).join(' ')).toContain('Ambiguous alias');
    expect(validateKnowledgeAliases(cyclic).join(' ')).toContain('cycle');
    expect(() => resolveKnowledgeId('one', cyclic)).toThrow('cycle');
  });

  it('enforces provenance approval metadata and authoritative coverage eligibility', () => {
    expect(
      validateProvenance({ originType: 'unresolved', reviewStatus: 'approved' }, 'unresolved')
    ).toContain('unresolved: unresolved knowledge cannot be approved');
    expect(
      validateProvenance(
        { originType: 'reviewed_derived', reviewStatus: 'approved' },
        'derived'
      ).join(' ')
    ).toContain('reviewedAt and reviewedById');
    expect(
      canSatisfyAuthoritativeCoverage({ originType: 'unresolved', reviewStatus: 'draft' })
    ).toBe(false);
    expect(
      canSatisfyAuthoritativeCoverage({
        originType: 'reviewed_derived',
        reviewStatus: 'reviewed',
      })
    ).toBe(false);
    expect(
      canSatisfyAuthoritativeCoverage({
        originType: 'reviewed_derived',
        reviewStatus: 'approved',
        reviewedAt: '2026-09-06',
        reviewedById: 'reviewer',
      })
    ).toBe(true);
  });
});

describe('pure competency coverage engine', () => {
  it('reports complete coverage from the approved requirement set', () => {
    const catalog = completeCatalog();
    const result = calculateCompetencyCoverage(
      coverageInput(catalog, [
        {
          teacherObjectiveId: 'teacher-1',
          objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:7',
        },
      ])
    );
    expect(result.coverageStatus).toBe('complete');
    expect(result.missingRequirements).toEqual([]);
    expect(result.coveragePercentage).toBe(100);
  });

  it('reports partial, reinforcement, and unmapped objectives independently', () => {
    const catalog = completeCatalog();
    const result = calculateCompetencyCoverage(
      coverageInput(catalog, [
        {
          teacherObjectiveId: 'teacher-1',
          objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:1',
        },
        {
          teacherObjectiveId: 'teacher-2',
          objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:2',
        },
        { teacherObjectiveId: 'custom-unmapped' },
      ])
    );
    expect(result.coverageStatus).toBe('partial');
    expect(result.coveredRequirements).toHaveLength(2);
    expect(result.missingRequirements).toHaveLength(1);
    expect(result.reinforcementRequirements).toHaveLength(1);
    expect(result.unmappedObjectives).toEqual(['custom-unmapped']);
  });

  it('reports unmapped when no objective provides approved semantic evidence', () => {
    const result = calculateCompetencyCoverage(
      coverageInput(completeCatalog(), [
        { teacherObjectiveId: 'custom-1' },
        { teacherObjectiveId: 'custom-2', objectiveConceptId: 'unknown-concept' },
      ])
    );
    expect(result.coverageStatus).toBe('unmapped');
    expect(result.unmappedObjectives).toEqual(['custom-1', 'custom-2']);
  });

  it('keeps the P0 pilot indeterminate because its approved requirement set is incomplete', () => {
    const result = calculateCompetencyCoverage(
      coverageInput(P0_GRADE_ONE_DOMAIN_ONE_CATALOG, [
        {
          teacherObjectiveId: 'teacher-1',
          objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:7',
        },
      ])
    );
    expect(result.coveredRequirements).toHaveLength(3);
    expect(result.coveragePercentage).toBe(100);
    expect(result.coverageStatus).toBe('indeterminate');
    expect(result.indeterminateReasons.join(' ')).toContain('not confirmed complete');
  });

  it('excludes draft, unresolved, and deprecated records from authoritative coverage', () => {
    const catalog = completeCatalog();
    catalog.learningRequirements[0].reviewStatus = 'draft';
    catalog.learningRequirements[1].originType = 'unresolved';
    catalog.learningRequirements[1].reviewStatus = 'draft';
    catalog.objectiveConcepts[6].reviewStatus = 'deprecated';
    catalog.objectiveConcepts[6].sourceRef = 'historical:test';
    const result = calculateCompetencyCoverage(
      coverageInput(rehash(catalog), [
        {
          teacherObjectiveId: 'teacher-1',
          objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:7',
          explicitReviewedRequirementIds: catalog.learningRequirements.map((item) => item.id),
        },
      ])
    );
    expect(result.requiredRequirements.map((item) => item.id)).toEqual([
      'learning-requirement:lvl_p1:f_locomotion:3',
    ]);
    expect(result.coverageStatus).toBe('complete');
    expect(result.evidenceByRequirement[catalog.learningRequirements[2].id].evidenceTypes).toEqual([
      'explicit_reviewed_requirement',
    ]);
  });

  it('produces the same semantic completeness for 6 and 10 objectives', () => {
    const catalog = completeCatalog();
    const objectives = (count: number): TeacherObjectiveCoverageInput[] =>
      Array.from({ length: count }, (_, index) => ({
        teacherObjectiveId: `teacher-${count}-${index + 1}`,
        objectiveConceptId:
          index === 0
            ? 'objective-concept:lvl_p1:f_locomotion:7'
            : 'objective-concept:lvl_p1:f_locomotion:1',
      }));
    const six = calculateCompetencyCoverage(coverageInput(catalog, objectives(6)));
    const ten = calculateCompetencyCoverage(coverageInput(catalog, objectives(10)));
    expect(six.coverageStatus).toBe('complete');
    expect(ten.coverageStatus).toBe('complete');
    expect(six.requiredRequirements.map((item) => item.id)).toEqual(
      ten.requiredRequirements.map((item) => item.id)
    );
    expect(six.coveragePercentage).toBe(ten.coveragePercentage);
  });
});
