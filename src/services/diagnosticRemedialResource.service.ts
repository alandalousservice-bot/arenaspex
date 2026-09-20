import { INITIAL_KNOWLEDGE_BANK } from '../data/knowledgeBankData';
import type { KnowledgeItem } from '../types/spex';

export type RemedialCompatibilityLevel = 'EXACT' | 'CONTEXTUAL' | 'INCOMPATIBLE';
export type DiagnosticResourceContext = {
  gradeLevelId: string;
  domainId: string;
  finalCompetencyId?: string | null;
  criterionId?: string | null;
};

export type RemedialCompatibility = {
  compatible: boolean;
  level: RemedialCompatibilityLevel;
  reasons: string[];
  matchedDimensions: string[];
  unavailableDimensions: string[];
};

export type RemedialResourceView = {
  resourceId: string;
  title: string;
  description: string;
  targetSkill: string | null;
  remedialProblem: string | null;
  equipment: string[];
  compatibility: RemedialCompatibility;
};

const remedialResources = INITIAL_KNOWLEDGE_BANK.filter((item) => item.category === 'remedial');

export function getRemedialResource(resourceId: string): KnowledgeItem | null {
  return remedialResources.find((resource) => resource.id === resourceId) || null;
}

export function buildRemedialResourceSnapshot(resourceId: string) {
  const resource = getRemedialResource(resourceId);
  if (!resource || !resource.approved) return null;
  return {
    title: resource.title,
    description: resource.description,
    remedialProblem: resource.remedialProblem || null,
    targetSkill: resource.targetSkill || null,
    equipment: resource.equipment || [],
    source: resource.origin || null,
  };
}

export function listRemedialResources(): readonly KnowledgeItem[] {
  return remedialResources;
}

export function evaluateRemedialCompatibility(
  resource: KnowledgeItem | null,
  context: DiagnosticResourceContext
): RemedialCompatibility {
  if (!resource || resource.category !== 'remedial') {
    return {
      compatible: false,
      level: 'INCOMPATIBLE',
      reasons: ['resource_invalid_or_non_remedial'],
      matchedDimensions: [],
      unavailableDimensions: [],
    };
  }
  const matchedDimensions: string[] = [];
  const reasons: string[] = [];
  if (!resource.approved) {
    return {
      compatible: false,
      level: 'INCOMPATIBLE',
      reasons: ['resource_not_approved'],
      matchedDimensions: [],
      unavailableDimensions: [],
    };
  }
  if (!(resource.levelIds || []).includes(context.gradeLevelId))
    return {
      compatible: false,
      level: 'INCOMPATIBLE',
      reasons: ['grade_mismatch'],
      matchedDimensions: [],
      unavailableDimensions: [],
    };
  matchedDimensions.push('grade');
  if (resource.fieldId !== context.domainId)
    return {
      compatible: false,
      level: 'INCOMPATIBLE',
      reasons: ['domain_mismatch'],
      matchedDimensions: [],
      unavailableDimensions: [],
    };
  matchedDimensions.push('domain');
  const unavailableDimensions = ['finalCompetency', 'criterion', 'indicator'];
  reasons.push('canonical_criterion_metadata_unavailable');
  return {
    compatible: true,
    level: 'CONTEXTUAL',
    reasons,
    matchedDimensions,
    unavailableDimensions,
  };
}

export function toRemedialResourceView(
  resource: KnowledgeItem,
  context: DiagnosticResourceContext
): RemedialResourceView {
  return {
    resourceId: resource.id,
    title: resource.title,
    description: resource.description,
    targetSkill: resource.targetSkill || null,
    remedialProblem: resource.remedialProblem || null,
    equipment: resource.equipment || [],
    compatibility: evaluateRemedialCompatibility(resource, context),
  };
}

export function listCompatibleRemedialResources(context: DiagnosticResourceContext) {
  return remedialResources
    .map((resource) => toRemedialResourceView(resource, context))
    .filter((resource) => resource.compatibility.compatible)
    .sort((a, b) => {
      const levelRank = (level: RemedialCompatibilityLevel) => (level === 'EXACT' ? 0 : 1);
      return (
        levelRank(a.compatibility.level) - levelRank(b.compatibility.level) ||
        a.resourceId.localeCompare(b.resourceId)
      );
    });
}

export function assertUniqueRemedialResourceIds(): void {
  const ids = remedialResources.map((resource) => resource.id);
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_RESOURCE_IDS');
}
