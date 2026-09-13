import { EducationalSituation, KnowledgeItem } from '../types/spex';

export type PedagogicalSituationReadSource = 'EDUCATIONAL_SITUATION' | 'LEGACY_GAME';
export type PedagogicalSituationVisibility = 'PUBLIC' | 'OWNER' | 'REVIEW' | 'HIDDEN';

/**
 * The teacher-facing read contract for applied pedagogical content.
 *
 * It deliberately contains only values that are present in the source record.
 * Legacy games therefore do not receive fabricated lesson types, approval
 * states, relations, media, or execution criteria.
 */
export interface PedagogicalSituationReadModel {
  id: string;
  sourceId: string;
  source: PedagogicalSituationReadSource;
  name: string;
  grade?: number;
  fieldId?: string;
  fieldName?: string;
  objectiveIds: string[];
  objectiveTexts: string[];
  sourceGoal?: string;
  organization?: string;
  equipment: string[];
  variations?: string;
  lessonTypes?: string[];
  durationMinutes?: number | null;
  difficulty?: string | null;
  motorActions?: string[];
  pedagogicalTags?: string[];
  requirements?: string[];
  executionConditions?: string | null;
  sourceDescription?: string | null;
  instructions?: string | null;
  successCriteria?: string | null;
  observationIndicators?: string | string[] | null;
  approvalStatus?: string;
  productionEligibility?: string;
  ownerId?: string;
  visibility: PedagogicalSituationVisibility;
  provenance: {
    source: PedagogicalSituationReadSource;
    sourceId: string;
    externalId?: string;
    canonicalSituationId?: string;
  };
}

function legacyCompatibilityId(item: KnowledgeItem): string | undefined {
  const record = item as KnowledgeItem & Record<string, unknown>;
  for (const key of [
    'canonicalSituationId',
    'educationalSituationId',
    'situationId',
    'referenceSituationId',
    'sourceSituationId',
  ]) {
    if (typeof record[key] === 'string' && record[key].trim()) return record[key].trim();
  }
  return undefined;
}

export function adaptEducationalSituation(
  item: EducationalSituation
): PedagogicalSituationReadModel {
  return {
    id: item.id,
    sourceId: item.id,
    source: 'EDUCATIONAL_SITUATION',
    name: item.name,
    grade: item.grade,
    fieldId: item.fieldId,
    fieldName: item.fieldName,
    objectiveIds: item.objectiveIds,
    objectiveTexts: item.objectiveTexts,
    sourceGoal: item.sourceGoal,
    organization: item.organization,
    equipment: item.equipment,
    variations: item.variations,
    lessonTypes: item.lessonTypes,
    durationMinutes: item.durationMinutes,
    difficulty: item.difficulty,
    motorActions: item.motorActions,
    pedagogicalTags: item.pedagogicalTags,
    requirements: item.requirements,
    executionConditions: item.executionConditions,
    sourceDescription: item.sourceDescription,
    instructions: item.instructions,
    successCriteria: item.successCriteria,
    observationIndicators: item.observationIndicators,
    approvalStatus: item.approvalStatus,
    productionEligibility: item.productionEligibility,
    ownerId: item.ownerId,
    visibility:
      item.status === 'APPROVED'
        ? 'PUBLIC'
        : item.ownerId
          ? 'OWNER'
          : item.status === 'PENDING_APPROVAL'
            ? 'REVIEW'
            : 'HIDDEN',
    provenance: {
      source: 'EDUCATIONAL_SITUATION',
      sourceId: item.id,
      externalId: item.externalId,
    },
  };
}

export function adaptLegacyGame(item: KnowledgeItem): PedagogicalSituationReadModel {
  const canonicalSituationId = legacyCompatibilityId(item);
  const isPublic = item.approved && item.status === 'APPROVED';
  const isReview = item.status === 'PENDING_APPROVAL' || item.approvalStatus === 'PENDING_REVIEW';
  return {
    id: `legacy-game:${item.id}`,
    sourceId: item.id,
    source: 'LEGACY_GAME',
    name: item.title,
    grade: item.levelId?.startsWith('lvl_p') ? Number(item.levelId.slice(5)) : undefined,
    fieldId: item.fieldId,
    fieldName: item.fieldName,
    objectiveIds: item.objectiveId ? [item.objectiveId] : [],
    objectiveTexts: item.objectiveText ? [item.objectiveText] : [],
    sourceGoal: item.pedagogicalPurpose || item.description,
    organization: item.organization,
    equipment: item.equipment || [],
    variations: item.progression,
    executionConditions: item.rules,
    instructions: item.rules,
    approvalStatus: item.approvalStatus || item.status,
    ownerId: item.ownerId,
    visibility: isPublic ? 'PUBLIC' : item.ownerId ? 'OWNER' : isReview ? 'REVIEW' : 'HIDDEN',
    provenance: {
      source: 'LEGACY_GAME',
      sourceId: item.id,
      canonicalSituationId,
    },
  };
}

/**
 * Merge canonical and legacy read models without title-based guessing.
 * A legacy record is suppressed only when it explicitly points to a
 * canonical situation or shares that canonical record's stable identifier.
 */
export function mergePedagogicalSituationReadModels(
  canonical: PedagogicalSituationReadModel[],
  legacy: PedagogicalSituationReadModel[]
): PedagogicalSituationReadModel[] {
  const canonicalIds = new Set(
    canonical.flatMap((item) => [item.id, item.provenance.externalId].filter(Boolean) as string[])
  );
  const visibleLegacy = legacy.filter((item) => {
    const linkedId = item.provenance.canonicalSituationId;
    return !(linkedId && canonicalIds.has(linkedId));
  });
  return [...canonical, ...visibleLegacy];
}

export function isLegacyGameReadModel(
  item: PedagogicalSituationReadModel
): item is PedagogicalSituationReadModel & { source: 'LEGACY_GAME' } {
  return item.source === 'LEGACY_GAME';
}
