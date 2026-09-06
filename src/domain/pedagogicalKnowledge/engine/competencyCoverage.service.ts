import { canSatisfyAuthoritativeCoverage } from '../provenance';
import type {
  CompetencyCoverageInput,
  CompetencyCoverageResult,
  LearningRequirement,
  RequirementCoverageEvidence,
} from '../types';

const matchesScope = (
  value: { releaseId: string; gradeId: string; domainId: string },
  input: CompetencyCoverageInput
): boolean =>
  value.releaseId === input.coreReleaseId &&
  value.gradeId === input.gradeId &&
  value.domainId === input.domainId;

export function calculateCompetencyCoverage(
  input: CompetencyCoverageInput
): CompetencyCoverageResult {
  const { catalog } = input;
  const finalCompetency = catalog.finalCompetencies.find(
    (item) =>
      item.id === input.finalCompetencyId &&
      item.releaseId === input.coreReleaseId &&
      item.gradeId === input.gradeId &&
      item.domainId === input.domainId
  );
  const indeterminateReasons: string[] = [];

  if (catalog.release.id !== input.coreReleaseId || catalog.release.status !== 'active') {
    indeterminateReasons.push('The requested knowledge-core release is not active.');
  }
  if (!finalCompetency) {
    indeterminateReasons.push('The requested final competency is not present in the release.');
  } else if (finalCompetency.requirementSetStatus !== 'complete') {
    indeterminateReasons.push('The approved LearningRequirement set is not confirmed complete.');
  }

  const requiredRequirements = catalog.learningRequirements.filter(
    (item) =>
      matchesScope(item, input) &&
      item.finalCompetencyId === input.finalCompetencyId &&
      item.required &&
      canSatisfyAuthoritativeCoverage(item)
  );
  if (requiredRequirements.length === 0) {
    indeterminateReasons.push('No approved authoritative LearningRequirements are available.');
  }

  const requirementsById = new Map(requiredRequirements.map((item) => [item.id, item]));
  const evidence = new Map<
    string,
    {
      teacherObjectiveIds: Set<string>;
      evidenceTypes: Set<RequirementCoverageEvidence['evidenceTypes'][number]>;
    }
  >();
  const unmappedObjectives: string[] = [];

  const addEvidence = (
    requirementId: string,
    teacherObjectiveId: string,
    evidenceType: RequirementCoverageEvidence['evidenceTypes'][number]
  ) => {
    if (!requirementsById.has(requirementId)) return;
    const current = evidence.get(requirementId) || {
      teacherObjectiveIds: new Set<string>(),
      evidenceTypes: new Set<RequirementCoverageEvidence['evidenceTypes'][number]>(),
    };
    current.teacherObjectiveIds.add(teacherObjectiveId);
    current.evidenceTypes.add(evidenceType);
    evidence.set(requirementId, current);
  };

  for (const objective of input.teacherObjectives) {
    let mapped = false;
    if (objective.objectiveConceptId) {
      const concept = catalog.objectiveConcepts.find(
        (item) =>
          item.id === objective.objectiveConceptId &&
          item.finalCompetencyId === input.finalCompetencyId &&
          matchesScope(item, input) &&
          canSatisfyAuthoritativeCoverage(item)
      );
      if (concept) {
        for (const requirementId of concept.learningRequirementIds) {
          if (requirementsById.has(requirementId)) {
            addEvidence(requirementId, objective.teacherObjectiveId, 'objective_concept');
            mapped = true;
          }
        }
      }
    }
    for (const requirementId of objective.explicitReviewedRequirementIds || []) {
      if (requirementsById.has(requirementId)) {
        addEvidence(requirementId, objective.teacherObjectiveId, 'explicit_reviewed_requirement');
        mapped = true;
      }
    }
    if (!mapped) unmappedObjectives.push(objective.teacherObjectiveId);
  }

  const coveredRequirements = requiredRequirements.filter((item) => evidence.has(item.id));
  const missingRequirements = requiredRequirements.filter((item) => !evidence.has(item.id));
  const reinforcementRequirements = requiredRequirements.filter(
    (item) => (evidence.get(item.id)?.teacherObjectiveIds.size || 0) > 1
  );
  const evidenceByRequirement = Object.fromEntries(
    [...evidence.entries()].map(([requirementId, value]) => [
      requirementId,
      {
        requirementId,
        teacherObjectiveIds: [...value.teacherObjectiveIds],
        evidenceTypes: [...value.evidenceTypes],
      },
    ])
  );

  let coverageStatus: CompetencyCoverageResult['coverageStatus'];
  if (indeterminateReasons.length > 0) coverageStatus = 'indeterminate';
  else if (coveredRequirements.length === requiredRequirements.length) coverageStatus = 'complete';
  else if (coveredRequirements.length > 0) coverageStatus = 'partial';
  else coverageStatus = 'unmapped';

  return {
    requiredRequirements,
    coveredRequirements,
    missingRequirements,
    reinforcementRequirements,
    unmappedObjectives,
    coverageStatus,
    coveragePercentage:
      requiredRequirements.length > 0
        ? Math.round((coveredRequirements.length / requiredRequirements.length) * 100)
        : undefined,
    evidenceByRequirement,
    indeterminateReasons,
  };
}

export const requirementIds = (items: readonly LearningRequirement[]): string[] =>
  items.map((item) => item.id);
