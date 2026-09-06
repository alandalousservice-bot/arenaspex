import type { TeacherLearningPlanDomain } from '../../types/spex';
import { calculateCompetencyCoverage } from './engine/competencyCoverage.service';
import { canSatisfyAuthoritativeCoverage } from './provenance';
import type {
  CompetencyCoverageStatus,
  FinalCompetency,
  LearningRequirement,
  PedagogicalKnowledgeCatalog,
  TeacherObjectiveCoverageInput,
} from './types';

export type TeacherObjectiveResolutionStatus =
  'exact' | 'source_reference' | 'alias' | 'reviewed_mapping' | 'unmapped' | 'ambiguous';

export type TeacherPlanSemanticIssueCode =
  | 'unknown_release'
  | 'wrong_grade'
  | 'wrong_domain'
  | 'mismatched_final_competency'
  | 'unknown_source_reference'
  | 'invalid_semantic_reference'
  | 'ambiguous_alias'
  | 'duplicate_teacher_objective_id'
  | 'broken_integration_anchor'
  | 'integration_without_preceding_objectives'
  | 'objective_outside_integration_cycles';

export interface TeacherPlanSemanticIssue {
  code: TeacherPlanSemanticIssueCode;
  message: string;
  teacherObjectiveId?: string;
  integrationId?: string;
  relatedIds?: readonly string[];
}

export type TeacherPlanSemanticObjective = TeacherLearningPlanDomain['objectives'][number] & {
  /** Future/test-only semantic reference. P1B never persists this value. */
  objectiveConceptId?: string | null;
};

export interface TeacherPlanSemanticDomainInput {
  fieldId: string;
  finalCompetencyId?: string;
  objectives: readonly TeacherPlanSemanticObjective[];
  integrationPoints: readonly TeacherLearningPlanDomain['integrationPoints'][number][];
}

export interface TeacherPlanSemanticAdapterInput {
  catalog: PedagogicalKnowledgeCatalog;
  coreReleaseId: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  domain: TeacherPlanSemanticDomainInput;
}

export interface TeacherObjectiveSemanticResolution {
  teacherObjectiveId: string;
  sourceReferenceId?: string | null;
  objectiveConceptId?: string;
  resolutionStatus: TeacherObjectiveResolutionStatus;
  reason: string;
  learningRequirementIds: readonly string[];
  competencyComponentIds: readonly string[];
}

export interface TeacherPlanIntegrationCycleProjection {
  integrationId: string;
  afterObjectiveId: string;
  teacherObjectiveIds: readonly string[];
  objectiveConceptIds: readonly string[];
  learningRequirementIds: readonly string[];
}

export interface AssessmentSemanticScope {
  kind: 'diagnostic' | 'summative';
  finalCompetency?: FinalCompetency;
  learningRequirements: readonly LearningRequirement[];
}

export interface TeacherPlanSemanticProjection {
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  coreReleaseId: string;
  objectiveResolutions: readonly TeacherObjectiveSemanticResolution[];
  requiredRequirements: readonly LearningRequirement[];
  coveredRequirements: readonly LearningRequirement[];
  missingRequirements: readonly LearningRequirement[];
  reinforcementRequirements: readonly LearningRequirement[];
  unmappedObjectives: readonly TeacherObjectiveSemanticResolution[];
  ambiguousObjectives: readonly TeacherObjectiveSemanticResolution[];
  coverageStatus: CompetencyCoverageStatus;
  coveragePercentage?: number;
  integrationCycles: readonly TeacherPlanIntegrationCycleProjection[];
  diagnosticScope: AssessmentSemanticScope;
  summativeScope: AssessmentSemanticScope;
  errors: readonly TeacherPlanSemanticIssue[];
  warnings: readonly TeacherPlanSemanticIssue[];
}

const P1B_SOURCE_REFERENCE_MAPPINGS = Object.freeze(
  [2, 3, 4, 6, 7, 8, 9].map((sessionNumber, index) => [
    `f_locomotion__${sessionNumber}`,
    `objective-concept:lvl_p1:f_locomotion:${index + 1}`,
  ]) as readonly (readonly [string, string])[]
);

/** Deliberately empty until a reviewed historical mapping is evidenced. */
const P1B_REVIEWED_SOURCE_MAPPINGS: readonly (readonly [string, string])[] = Object.freeze([]);

const unique = (values: readonly string[]): string[] => [...new Set(values)];

const approvedConceptForScope = (
  catalog: PedagogicalKnowledgeCatalog,
  conceptId: string,
  input: Pick<
    TeacherPlanSemanticAdapterInput,
    'coreReleaseId' | 'gradeId' | 'domainId' | 'finalCompetencyId'
  >
) =>
  catalog.objectiveConcepts.find(
    (concept) =>
      concept.id === conceptId &&
      concept.releaseId === input.coreReleaseId &&
      concept.gradeId === input.gradeId &&
      concept.domainId === input.domainId &&
      concept.finalCompetencyId === input.finalCompetencyId &&
      canSatisfyAuthoritativeCoverage(concept)
  );

const buildAliasTargets = (
  catalog: PedagogicalKnowledgeCatalog
): Map<string, readonly string[]> => {
  const targets = new Map<string, string[]>();
  for (const alias of catalog.aliases) {
    const current = targets.get(alias.legacyId) || [];
    targets.set(alias.legacyId, unique([...current, alias.canonicalId]));
  }
  return targets;
};

function resolveObjective(
  objective: TeacherPlanSemanticObjective,
  input: TeacherPlanSemanticAdapterInput,
  sourceMappings: ReadonlyMap<string, string>,
  reviewedMappings: ReadonlyMap<string, string>,
  aliasTargets: ReadonlyMap<string, readonly string[]>,
  warnings: TeacherPlanSemanticIssue[]
): TeacherObjectiveSemanticResolution {
  const resolved = (
    conceptId: string,
    resolutionStatus: TeacherObjectiveResolutionStatus,
    reason: string
  ): TeacherObjectiveSemanticResolution | undefined => {
    const concept = approvedConceptForScope(input.catalog, conceptId, input);
    if (!concept) return undefined;
    return {
      teacherObjectiveId: objective.id,
      sourceReferenceId: objective.sourceReferenceId,
      objectiveConceptId: concept.id,
      resolutionStatus,
      reason,
      learningRequirementIds: [...concept.learningRequirementIds],
      competencyComponentIds: [...concept.competencyComponentIds],
    };
  };

  if (objective.objectiveConceptId) {
    const exact = resolved(
      objective.objectiveConceptId,
      'exact',
      'Resolved from an explicit compatible ObjectiveConcept reference.'
    );
    if (exact) return exact;
    warnings.push({
      code: 'invalid_semantic_reference',
      message:
        'The explicit ObjectiveConcept is unknown, unapproved, or outside the requested scope.',
      teacherObjectiveId: objective.id,
      relatedIds: [objective.objectiveConceptId],
    });
    return {
      teacherObjectiveId: objective.id,
      sourceReferenceId: objective.sourceReferenceId,
      objectiveConceptId: objective.objectiveConceptId,
      resolutionStatus: 'ambiguous',
      reason:
        'The explicit ObjectiveConcept is unknown, unapproved, or outside the requested scope.',
      learningRequirementIds: [],
      competencyComponentIds: [],
    };
  }

  const sourceReferenceId = objective.sourceReferenceId?.trim();
  if (sourceReferenceId) {
    const sourceTarget = sourceMappings.get(sourceReferenceId);
    if (sourceTarget) {
      const sourceResolution = resolved(
        sourceTarget,
        'source_reference',
        'Resolved from an approved stable Teacher Learning Plan sourceReferenceId.'
      );
      if (sourceResolution) return sourceResolution;
    }

    const aliases = aliasTargets.get(sourceReferenceId) || [];
    if (aliases.length > 1) {
      warnings.push({
        code: 'ambiguous_alias',
        message: 'The source reference has more than one canonical alias target.',
        teacherObjectiveId: objective.id,
        relatedIds: aliases,
      });
      return {
        teacherObjectiveId: objective.id,
        sourceReferenceId,
        resolutionStatus: 'ambiguous',
        reason: 'The approved alias table contains multiple targets.',
        learningRequirementIds: [],
        competencyComponentIds: [],
      };
    }
    if (aliases.length === 1) {
      const aliasResolution = resolved(
        aliases[0],
        'alias',
        'Resolved from an approved knowledge-core alias.'
      );
      if (aliasResolution) return aliasResolution;
    }

    const reviewedTarget = reviewedMappings.get(sourceReferenceId);
    if (reviewedTarget) {
      const reviewedResolution = resolved(
        reviewedTarget,
        'reviewed_mapping',
        'Resolved from the explicit reviewed historical mapping table.'
      );
      if (reviewedResolution) return reviewedResolution;
    }

    warnings.push({
      code: 'unknown_source_reference',
      message: 'The sourceReferenceId has no safe semantic mapping.',
      teacherObjectiveId: objective.id,
      relatedIds: [sourceReferenceId],
    });
  }

  return {
    teacherObjectiveId: objective.id,
    sourceReferenceId: objective.sourceReferenceId,
    resolutionStatus: 'unmapped',
    reason: sourceReferenceId
      ? 'No approved source, alias, or reviewed mapping exists.'
      : 'Custom wording without a semantic reference is not authoritative identity.',
    learningRequirementIds: [],
    competencyComponentIds: [],
  };
}

export function getAssessmentSemanticScope(
  catalog: PedagogicalKnowledgeCatalog,
  scope: Pick<
    TeacherPlanSemanticAdapterInput,
    'coreReleaseId' | 'gradeId' | 'domainId' | 'finalCompetencyId'
  >,
  kind: AssessmentSemanticScope['kind']
): AssessmentSemanticScope {
  const finalCompetency = catalog.finalCompetencies.find(
    (item) =>
      item.id === scope.finalCompetencyId &&
      item.releaseId === scope.coreReleaseId &&
      item.gradeId === scope.gradeId &&
      item.domainId === scope.domainId
  );
  const learningRequirements = catalog.learningRequirements.filter(
    (item) =>
      item.releaseId === scope.coreReleaseId &&
      item.gradeId === scope.gradeId &&
      item.domainId === scope.domainId &&
      item.finalCompetencyId === scope.finalCompetencyId &&
      item.required &&
      canSatisfyAuthoritativeCoverage(item)
  );
  return { kind, finalCompetency, learningRequirements };
}

export function projectTeacherPlanSemantics(
  input: TeacherPlanSemanticAdapterInput
): TeacherPlanSemanticProjection {
  const errors: TeacherPlanSemanticIssue[] = [];
  const warnings: TeacherPlanSemanticIssue[] = [];
  if (input.catalog.release.id !== input.coreReleaseId) {
    errors.push({
      code: 'unknown_release',
      message: 'The requested knowledge-core release is unavailable.',
    });
  }
  if (
    !input.catalog.grades.some(
      (item) => item.gradeId === input.gradeId && item.releaseId === input.coreReleaseId
    )
  ) {
    errors.push({
      code: 'wrong_grade',
      message: 'The grade does not belong to the requested release.',
    });
  }
  if (
    input.domain.fieldId !== input.domainId ||
    !input.catalog.domains.some(
      (item) =>
        item.domainId === input.domainId &&
        item.releaseId === input.coreReleaseId &&
        item.gradeId === input.gradeId
    )
  ) {
    errors.push({
      code: 'wrong_domain',
      message: 'The plan domain does not match the requested knowledge-core scope.',
    });
  }
  if (
    input.domain.finalCompetencyId !== input.finalCompetencyId ||
    !input.catalog.finalCompetencies.some(
      (item) =>
        item.id === input.finalCompetencyId &&
        item.releaseId === input.coreReleaseId &&
        item.gradeId === input.gradeId &&
        item.domainId === input.domainId
    )
  ) {
    errors.push({
      code: 'mismatched_final_competency',
      message: 'The plan FinalCompetency does not match the requested scope.',
    });
  }

  const duplicateObjectiveIds = new Set<string>();
  const seenObjectiveIds = new Set<string>();
  for (const objective of input.domain.objectives) {
    if (seenObjectiveIds.has(objective.id)) duplicateObjectiveIds.add(objective.id);
    seenObjectiveIds.add(objective.id);
  }
  for (const duplicateId of duplicateObjectiveIds) {
    errors.push({
      code: 'duplicate_teacher_objective_id',
      message: 'TeacherObjective IDs must be unique for deterministic projection.',
      teacherObjectiveId: duplicateId,
    });
  }

  const sourceMappings = new Map(P1B_SOURCE_REFERENCE_MAPPINGS);
  const reviewedMappings = new Map(P1B_REVIEWED_SOURCE_MAPPINGS);
  const aliasTargets = buildAliasTargets(input.catalog);
  const objectiveResolutions = input.domain.objectives.map((objective) =>
    resolveObjective(objective, input, sourceMappings, reviewedMappings, aliasTargets, warnings)
  );
  const coverageInputs: TeacherObjectiveCoverageInput[] = objectiveResolutions.map(
    (resolution) => ({
      teacherObjectiveId: resolution.teacherObjectiveId,
      objectiveConceptId:
        resolution.resolutionStatus === 'unmapped' || resolution.resolutionStatus === 'ambiguous'
          ? null
          : resolution.objectiveConceptId,
    })
  );
  const coverage = calculateCompetencyCoverage({
    catalog: input.catalog,
    coreReleaseId: input.coreReleaseId,
    gradeId: input.gradeId,
    domainId: input.domainId,
    finalCompetencyId: input.finalCompetencyId,
    teacherObjectives: coverageInputs,
  });

  const resolutionById = new Map(
    objectiveResolutions.map((item) => [item.teacherObjectiveId, item])
  );
  const objectiveIndexById = new Map(
    input.domain.objectives.map((item, index) => [item.id, index])
  );
  const integrationCycles: TeacherPlanIntegrationCycleProjection[] = [];
  let cycleStart = 0;
  const coveredByCycles = new Set<string>();
  const orderedPoints = input.domain.integrationPoints
    .map((point, index) => ({ point, index }))
    .sort(
      (left, right) => left.point.orderIndex - right.point.orderIndex || left.index - right.index
    );

  for (const { point } of orderedPoints) {
    if (!point.afterObjectiveId) {
      errors.push({
        code: 'integration_without_preceding_objectives',
        message: 'The integration point has no preceding objective anchor.',
        integrationId: point.id,
      });
      continue;
    }
    const anchorIndex = objectiveIndexById.get(point.afterObjectiveId);
    if (anchorIndex === undefined || anchorIndex < cycleStart) {
      errors.push({
        code: 'broken_integration_anchor',
        message: 'The integration anchor is missing or ordered before the current cycle.',
        integrationId: point.id,
        relatedIds: [point.afterObjectiveId],
      });
      continue;
    }
    const cycleObjectives = input.domain.objectives.slice(cycleStart, anchorIndex + 1);
    const cycleResolutions = cycleObjectives
      .map((objective) => resolutionById.get(objective.id))
      .filter((item): item is TeacherObjectiveSemanticResolution => Boolean(item));
    cycleObjectives.forEach((objective) => coveredByCycles.add(objective.id));
    integrationCycles.push({
      integrationId: point.id,
      afterObjectiveId: point.afterObjectiveId,
      teacherObjectiveIds: cycleObjectives.map((item) => item.id),
      objectiveConceptIds: unique(
        cycleResolutions.flatMap((item) =>
          item.objectiveConceptId ? [item.objectiveConceptId] : []
        )
      ),
      learningRequirementIds: unique(
        cycleResolutions.flatMap((item) => item.learningRequirementIds)
      ),
    });
    cycleStart = anchorIndex + 1;
  }

  const outsideIntegrationCycles = unique(
    input.domain.objectives
      .filter((objective) => !coveredByCycles.has(objective.id))
      .map((objective) => objective.id)
  );
  if (outsideIntegrationCycles.length > 0) {
    warnings.push({
      code: 'objective_outside_integration_cycles',
      message: 'One or more objectives are outside all current integration cycles.',
      relatedIds: outsideIntegrationCycles,
    });
  }

  const scope = {
    coreReleaseId: input.coreReleaseId,
    gradeId: input.gradeId,
    domainId: input.domainId,
    finalCompetencyId: input.finalCompetencyId,
  };
  return {
    ...scope,
    objectiveResolutions,
    requiredRequirements: coverage.requiredRequirements,
    coveredRequirements: coverage.coveredRequirements,
    missingRequirements: coverage.missingRequirements,
    reinforcementRequirements: coverage.reinforcementRequirements,
    unmappedObjectives: objectiveResolutions.filter((item) => item.resolutionStatus === 'unmapped'),
    ambiguousObjectives: objectiveResolutions.filter(
      (item) => item.resolutionStatus === 'ambiguous'
    ),
    coverageStatus: errors.length > 0 ? 'indeterminate' : coverage.coverageStatus,
    coveragePercentage: coverage.coveragePercentage,
    integrationCycles,
    diagnosticScope: getAssessmentSemanticScope(input.catalog, scope, 'diagnostic'),
    summativeScope: getAssessmentSemanticScope(input.catalog, scope, 'summative'),
    errors,
    warnings,
  };
}
