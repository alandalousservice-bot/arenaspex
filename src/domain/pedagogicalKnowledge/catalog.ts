import { resolveKnowledgeId, validateKnowledgeAliases } from './aliases';
import { validateProvenance } from './provenance';
import type { CatalogNode, PedagogicalKnowledgeCatalog } from './types';

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'catalogHash')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
};

export const stableCatalogJson = (value: unknown): string => JSON.stringify(stableValue(value));

export function computeCatalogHash(value: unknown): string {
  const input = stableCatalogJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

const allNodes = (catalog: PedagogicalKnowledgeCatalog): CatalogNode[] => [
  ...catalog.grades,
  ...catalog.overallCompetencies,
  ...catalog.domains,
  ...catalog.finalCompetencies,
  ...catalog.competencyComponents,
  ...catalog.learningRequirements,
  ...catalog.resources,
  ...catalog.criteria,
  ...catalog.indicators,
  ...catalog.objectiveConcepts,
  ...catalog.objectiveVariants,
  ...catalog.objectiveKeys,
];

export function validatePedagogicalKnowledgeCatalog(
  catalog: PedagogicalKnowledgeCatalog
): string[] {
  const errors: string[] = [];
  const nodes = allNodes(catalog);
  const ids = new Set<string>();

  for (const node of nodes) {
    if (ids.has(node.id)) errors.push(`Duplicate catalog ID: ${node.id}`);
    ids.add(node.id);
    if (node.releaseId !== catalog.release.id) {
      errors.push(`${node.id}: releaseId does not match ${catalog.release.id}`);
    }
    errors.push(...validateProvenance(node, node.id));
  }

  const gradeIds = new Set(catalog.grades.map((item) => item.gradeId));
  const domainIds = new Set(catalog.domains.map((item) => `${item.gradeId}|${item.domainId}`));
  const finalIds = new Set(catalog.finalCompetencies.map((item) => item.id));
  const componentIds = new Set(catalog.competencyComponents.map((item) => item.id));
  const requirementIds = new Set(catalog.learningRequirements.map((item) => item.id));
  const criterionIds = new Set(catalog.criteria.map((item) => item.id));
  const conceptIds = new Set(catalog.objectiveConcepts.map((item) => item.id));

  for (const node of [
    ...catalog.overallCompetencies,
    ...catalog.domains,
    ...catalog.finalCompetencies,
    ...catalog.competencyComponents,
    ...catalog.learningRequirements,
    ...catalog.resources,
    ...catalog.criteria,
    ...catalog.indicators,
    ...catalog.objectiveConcepts,
  ]) {
    if (!gradeIds.has(node.gradeId)) errors.push(`${node.id}: unknown grade ${node.gradeId}`);
    if ('domainId' in node && !domainIds.has(`${node.gradeId}|${node.domainId}`)) {
      errors.push(`${node.id}: unknown domain ${node.domainId} for grade ${node.gradeId}`);
    }
  }

  for (const item of catalog.competencyComponents) {
    if (!finalIds.has(item.finalCompetencyId)) {
      errors.push(`${item.id}: unknown final competency ${item.finalCompetencyId}`);
    }
  }
  for (const item of catalog.learningRequirements) {
    if (!finalIds.has(item.finalCompetencyId)) {
      errors.push(`${item.id}: unknown final competency ${item.finalCompetencyId}`);
    }
    for (const componentId of item.competencyComponentIds) {
      if (!componentIds.has(componentId)) {
        errors.push(`${item.id}: unknown competency component ${componentId}`);
      }
    }
  }
  for (const item of catalog.objectiveConcepts) {
    if (!finalIds.has(item.finalCompetencyId)) {
      errors.push(`${item.id}: unknown final competency ${item.finalCompetencyId}`);
    }
    for (const requirementId of item.learningRequirementIds) {
      if (!requirementIds.has(requirementId)) {
        errors.push(`${item.id}: unknown learning requirement ${requirementId}`);
      }
    }
    for (const componentId of item.competencyComponentIds) {
      if (!componentIds.has(componentId)) {
        errors.push(`${item.id}: unknown competency component ${componentId}`);
      }
    }
  }
  for (const item of catalog.resources) {
    for (const requirementId of item.learningRequirementIds) {
      if (!requirementIds.has(requirementId)) {
        errors.push(`${item.id}: unknown learning requirement ${requirementId}`);
      }
    }
  }
  for (const item of catalog.objectiveVariants) {
    if (!conceptIds.has(item.objectiveConceptId)) {
      errors.push(`${item.id}: unknown objective concept ${item.objectiveConceptId}`);
    }
  }
  for (const item of catalog.objectiveKeys) {
    if (!conceptIds.has(item.objectiveConceptId)) {
      errors.push(`${item.id}: unknown objective concept ${item.objectiveConceptId}`);
    }
  }
  for (const item of catalog.indicators) {
    if (!criterionIds.has(item.criterionId)) {
      errors.push(`${item.id}: unknown criterion ${item.criterionId}`);
    }
    for (const requirementId of item.learningRequirementIds) {
      if (!requirementIds.has(requirementId)) {
        errors.push(`${item.id}: unknown learning requirement ${requirementId}`);
      }
    }
  }

  const aliasErrors = validateKnowledgeAliases(catalog.aliases);
  errors.push(...aliasErrors);
  if (aliasErrors.length === 0) {
    for (const alias of catalog.aliases) {
      const resolvedId = resolveKnowledgeId(alias.legacyId, catalog.aliases);
      if (!ids.has(resolvedId)) {
        errors.push(`Alias ${alias.legacyId}: unknown canonical ID ${resolvedId}`);
      }
    }
  }

  const expectedHash = computeCatalogHash(catalog);
  if (catalog.release.catalogHash !== expectedHash) {
    errors.push(`Catalog hash mismatch: expected ${expectedHash}`);
  }

  return errors;
}
