import { canSatisfyAuthoritativeCoverage } from './provenance';
import type {
  DerivedIntegrationCoverage,
  ObjectiveKey,
  PedagogicalKnowledgeCatalog,
  SemanticIntegrationPoint,
  SemanticTeacherObjective,
} from './types';

const normalizedText = (value: string): string => value.trim().replace(/\s+/g, ' ');

export function validateObjectiveVariantSemantics(catalog: PedagogicalKnowledgeCatalog): string[] {
  const errors: string[] = [];
  const conceptById = new Map(catalog.objectiveConcepts.map((item) => [item.id, item]));
  const seen = new Set<string>();

  for (const variant of catalog.objectiveVariants) {
    const concept = conceptById.get(variant.objectiveConceptId);
    const wording = normalizedText(variant.wording);
    if (!wording) errors.push(`${variant.id}: objective variant wording is empty`);
    if (
      variant.reviewStatus === 'approved' &&
      (!concept || !canSatisfyAuthoritativeCoverage(concept))
    ) {
      errors.push(`${variant.id}: approved variant requires an approved ObjectiveConcept`);
    }
    const semanticKey = `${variant.objectiveConceptId}|${variant.locale}|${wording}`;
    if (seen.has(semanticKey)) {
      errors.push(`${variant.id}: duplicate wording for the same ObjectiveConcept and locale`);
    }
    seen.add(semanticKey);
  }

  return errors;
}

export function validateObjectiveKeySemantics(
  catalog: PedagogicalKnowledgeCatalog,
  keys: readonly ObjectiveKey[] = catalog.objectiveKeys
): string[] {
  const errors: string[] = [];
  const concepts = new Map(catalog.objectiveConcepts.map((item) => [item.id, item]));
  const requirementLabels = new Set(
    catalog.learningRequirements.map((item) => normalizedText(item.label))
  );

  for (const key of keys) {
    const concept = concepts.get(key.objectiveConceptId);
    const label = normalizedText(key.label);
    if (!concept) errors.push(`${key.id}: unknown ObjectiveConcept`);
    if (!label) errors.push(`${key.id}: objective key label is empty`);
    if (concept && label === normalizedText(concept.label)) {
      errors.push(`${key.id}: objective key duplicates its ObjectiveConcept`);
    }
    if (requirementLabels.has(label)) {
      errors.push(`${key.id}: objective key duplicates a LearningRequirement`);
    }
    if (label.includes('مفتاح إنجاز مقترح') || label.includes('يحتاج مراجعة')) {
      errors.push(`${key.id}: generic placeholder is not a genuine ObjectiveKey`);
    }
  }

  return errors;
}

export function deriveIntegrationCoverage(
  catalog: PedagogicalKnowledgeCatalog,
  orderedObjectives: readonly SemanticTeacherObjective[],
  integrationPoints: readonly SemanticIntegrationPoint[]
): DerivedIntegrationCoverage[] {
  const conceptById = new Map(
    catalog.objectiveConcepts.filter(canSatisfyAuthoritativeCoverage).map((item) => [item.id, item])
  );
  const allowedRequirements = new Set(
    catalog.learningRequirements.filter(canSatisfyAuthoritativeCoverage).map((item) => item.id)
  );
  const seenAnchors = new Set<string>();
  let cycleStart = 0;

  return integrationPoints.map((point) => {
    if (seenAnchors.has(point.afterTeacherObjectiveId)) {
      throw new Error(`Duplicate integration anchor: ${point.afterTeacherObjectiveId}`);
    }
    const anchorIndex = orderedObjectives.findIndex(
      (item) => item.teacherObjectiveId === point.afterTeacherObjectiveId
    );
    if (anchorIndex < cycleStart) {
      throw new Error(`Invalid integration anchor order: ${point.afterTeacherObjectiveId}`);
    }
    seenAnchors.add(point.afterTeacherObjectiveId);

    const cycleObjectives = orderedObjectives.slice(cycleStart, anchorIndex + 1);
    const objectiveConceptIds = new Set<string>();
    const learningRequirementIds = new Set<string>();
    const unmappedTeacherObjectiveIds: string[] = [];

    for (const objective of cycleObjectives) {
      const concept = objective.objectiveConceptId
        ? conceptById.get(objective.objectiveConceptId)
        : undefined;
      if (!concept) {
        unmappedTeacherObjectiveIds.push(objective.teacherObjectiveId);
        continue;
      }
      objectiveConceptIds.add(concept.id);
      for (const requirementId of concept.learningRequirementIds) {
        if (allowedRequirements.has(requirementId)) learningRequirementIds.add(requirementId);
      }
    }
    cycleStart = anchorIndex + 1;

    return {
      integrationId: point.integrationId,
      teacherObjectiveIds: cycleObjectives.map((item) => item.teacherObjectiveId),
      objectiveConceptIds: [...objectiveConceptIds],
      learningRequirementIds: [...learningRequirementIds],
      unmappedTeacherObjectiveIds,
    };
  });
}
