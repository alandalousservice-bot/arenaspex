import { getObjectiveBankResources } from '../data/objectiveBankRegistry';
import { EducationalSituation, KnowledgeItem } from '../types/spex';

export type PedagogicalSituationReadSource = 'EDUCATIONAL_SITUATION' | 'LEGACY_GAME';
export type PedagogicalSituationVisibility = 'PUBLIC' | 'OWNER' | 'REVIEW' | 'HIDDEN';

export const SITUATION_DOMAIN_LABELS: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
};

export const SITUATION_LESSON_TYPE_LABELS: Record<string, string> = {
  LEARNING: 'حصة تعلمية',
  INTEGRATIVE: 'حصة إدماجية',
  DIAGNOSTIC: 'تقويم تشخيصي',
  SUMMATIVE: 'تقويم تحصيلي',
};

export const SITUATION_RELATION_LABELS: Record<string, string> = {
  DIRECT: 'يخدم الهدف مباشرة',
  SUPPORTIVE: 'موقف داعم',
  INTEGRATIVE: 'موقف إدماجي',
  ASSESSMENT: 'موقف تقويمي',
};

export const SITUATION_DIFFICULTY_LABELS: Record<string, string> = {
  basic: 'أساسي',
  controlled: 'مضبوط',
  challenging: 'متحدٍّ',
  advanced: 'متقدم',
  remedial: 'علاجي',
};

const SITUATION_PROVENANCE_LABELS: Record<string, string> = {
  REFERENCE_SEED: 'من بنك المنصة',
  REFERENCE: 'من بنك المنصة',
  CURRICULUM_REFERENCE: 'من المرجع التربوي',
  TEACHER: 'موقف شخصي',
  COMMUNITY: 'مقترح من المجتمع التربوي',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  cones: 'أقماع',
  cone: 'قمع',
  whistle: 'صفارة',
  balls: 'كرات',
  ball: 'كرة',
  mats: 'بسط',
  mat: 'بساط',
  bibs: 'صدريات ملونة',
};

const INTERNAL_TAXONOMY_VALUES = new Set([
  'LEARNING',
  'INTEGRATIVE',
  'DIAGNOSTIC',
  'SUMMATIVE',
  'authored-direct',
  'grade-1',
  'grade-2',
  'grade-3',
  'grade-4',
  'grade-5',
  'f_locomotion',
  'f_fundamentals',
  'f_structuring',
]);

export type SituationTaxonomySource = {
  fieldId?: string | null;
  lessonTypes?: readonly string[] | null;
  motorActions?: readonly string[] | null;
  pedagogicalTags?: readonly string[] | null;
  requirements?: readonly string[] | null;
  relationTypes?: readonly string[] | null;
  gradeId?: string | null;
};

export interface EducationalSituationMedia {
  id: string;
  mediaRef: string;
  mediaType: string;
  classification?: string;
  provenance?: unknown;
}

function canonicalMotorSkillLabels(): Map<string, string> {
  const labels = new Map<string, string>();
  for (let grade = 1; grade <= 5; grade += 1) {
    for (const domainId of ['f_locomotion', 'f_fundamentals', 'f_structuring']) {
      for (const resource of getObjectiveBankResources(`lvl_p${grade}`, domainId)) {
        if (!resource.id.startsWith('curriculum-resource:')) continue;
        const slug = resource.id.split(':').pop();
        if (slug) labels.set(slug, resource.label);
      }
    }
  }
  return labels;
}

const CANONICAL_MOTOR_SKILL_LABELS = canonicalMotorSkillLabels();

function isInternalTaxonomyValue(value: string): boolean {
  return (
    INTERNAL_TAXONOMY_VALUES.has(value) ||
    /^(grade|field|domain|lesson|relation|source|status|approval|production)[-_]/i.test(value) ||
    /^(DIRECT|SUPPORTIVE|INTEGRATIVE|ASSESSMENT|AUTO_GENERATION_ELIGIBLE|REVIEW_ONLY|SOURCE_ARCHIVE_ONLY)$/.test(
      value
    )
  );
}

function safeTeacherLabel(value: string): { value: string; label: string } | undefined {
  const normalized = value.trim();
  if (!normalized || isInternalTaxonomyValue(normalized)) return undefined;
  if (CANONICAL_MOTOR_SKILL_LABELS.has(normalized)) {
    return { value: normalized, label: CANONICAL_MOTOR_SKILL_LABELS.get(normalized)! };
  }
  // Free-text values are safe for the teacher view only when they are already
  // human-readable Arabic. Unknown technical slugs are intentionally hidden.
  if (!/[\u0600-\u06ff]/.test(normalized)) return undefined;
  return { value: normalized, label: normalized };
}

function uniquePresentedValues(
  values: Array<{ value: string; label: string } | undefined>
): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  return values.filter((entry): entry is { value: string; label: string } => {
    if (!entry || seen.has(entry.value)) return false;
    seen.add(entry.value);
    return true;
  });
}

function rawValues(values?: readonly string[] | null): string[] {
  return (values || []).map((value) => value.trim()).filter(Boolean);
}

export interface TeacherFacingTaxonomyOption {
  value: string;
  label: string;
}

export interface SituationTaxonomy {
  domainId?: string;
  domainLabel?: string;
  gradeId?: string;
  lessonTypes: string[];
  lessonTypeLabels: string[];
  motorSkills: TeacherFacingTaxonomyOption[];
  pedagogicalRequirements: TeacherFacingTaxonomyOption[];
  objectiveRelationTypes: string[];
  sourceTags: string[];
  internalTags: string[];
}

/**
 * Classifies source fields before they reach teacher-facing filters/cards.
 * Tags are never promoted to skills unless they resolve to a canonical
 * structured motor resource; unknown technical values are discarded.
 */
export function classifySituationTaxonomy(item: SituationTaxonomySource): SituationTaxonomy {
  const motorSkills = uniquePresentedValues(rawValues(item.motorActions).map(safeTeacherLabel));
  const pedagogicalRequirements = uniquePresentedValues(
    rawValues(item.requirements).map(safeTeacherLabel)
  );
  const lessonTypes = rawValues(item.lessonTypes).filter((value) =>
    Boolean(SITUATION_LESSON_TYPE_LABELS[value])
  );
  const rawSourceTags = rawValues(item.pedagogicalTags);
  const sourceTags = rawSourceTags.filter((value) =>
    Boolean(CANONICAL_MOTOR_SKILL_LABELS.get(value))
  );
  const internalTags = Array.from(
    new Set(
      rawSourceTags.filter((value) => !sourceTags.includes(value) || isInternalTaxonomyValue(value))
    )
  );
  const sourceTagSkills = uniquePresentedValues(sourceTags.map(safeTeacherLabel));
  const domainId = item.fieldId && SITUATION_DOMAIN_LABELS[item.fieldId] ? item.fieldId : undefined;
  return {
    domainId,
    domainLabel: domainId ? SITUATION_DOMAIN_LABELS[domainId] : undefined,
    gradeId: item.gradeId,
    lessonTypes,
    lessonTypeLabels: lessonTypes.map((value) => SITUATION_LESSON_TYPE_LABELS[value]),
    motorSkills: uniquePresentedValues([...motorSkills, ...sourceTagSkills]),
    pedagogicalRequirements,
    objectiveRelationTypes: rawValues(item.relationTypes).filter((value) =>
      ['DIRECT', 'SUPPORTIVE', 'INTEGRATIVE', 'ASSESSMENT'].includes(value)
    ),
    sourceTags,
    internalTags,
  };
}

export function teacherFacingSituationSkillOptions(
  items: SituationTaxonomySource[]
): TeacherFacingTaxonomyOption[] {
  const values = items.flatMap((item) => {
    const taxonomy = classifySituationTaxonomy(item);
    return [...taxonomy.motorSkills, ...taxonomy.pedagogicalRequirements];
  });
  return uniquePresentedValues(values).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}

export function situationSkillOptions(
  item: SituationTaxonomySource
): TeacherFacingTaxonomyOption[] {
  const taxonomy = classifySituationTaxonomy(item);
  return uniquePresentedValues([...taxonomy.motorSkills, ...taxonomy.pedagogicalRequirements]);
}

export function situationDomainLabel(
  fieldId?: string | null,
  fallback?: string | null
): string | undefined {
  if (fieldId && SITUATION_DOMAIN_LABELS[fieldId]) return SITUATION_DOMAIN_LABELS[fieldId];
  const value = fallback?.trim();
  return value && /[\u0600-\u06ff]/.test(value) && !isInternalTaxonomyValue(value)
    ? value
    : undefined;
}

export function situationLessonTypeLabel(value: string): string | undefined {
  return SITUATION_LESSON_TYPE_LABELS[value];
}

export function situationRelationTypeLabel(value: string): string | undefined {
  return SITUATION_RELATION_LABELS[value];
}

export function situationDifficultyLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return SITUATION_DIFFICULTY_LABELS[value] || undefined;
}

export function situationProvenanceLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return SITUATION_PROVENANCE_LABELS[value] || undefined;
}

export function situationEquipmentOptions(
  values?: readonly string[] | null
): TeacherFacingTaxonomyOption[] {
  const seen = new Set<string>();
  return (values || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .map((value) => ({
      value,
      label: EQUIPMENT_LABELS[value] || value,
    }))
    .filter((option) => /[\u0600-\u06ff]/.test(option.label) || EQUIPMENT_LABELS[option.value])
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}

export function situationEquipmentLabels(values?: readonly string[] | null): string[] {
  return situationEquipmentOptions(values).map((option) => option.label);
}

export type SituationVisual =
  | { kind: 'media'; media: EducationalSituationMedia }
  | { kind: 'project-icon'; iconKey: 'locomotion' | 'fundamentals' | 'structuring' }
  | { kind: 'skill-icon'; iconKey: 'balance' | 'ball' | 'running' }
  | { kind: 'fallback'; iconKey: 'neutral' };

function validMedia(media?: EducationalSituationMedia | null): boolean {
  if (!media?.mediaRef?.trim()) return false;
  return /^(https?:\/\/|\/|data:image\/)/i.test(media.mediaRef.trim());
}

/** Resolves the visual in a stable, data-backed order without fabricating media. */
export function situationVisual(item: {
  media?: EducationalSituationMedia[] | null;
  fieldId?: string | null;
  motorActions?: readonly string[] | null;
}): SituationVisual {
  const media = (item.media || []).find(validMedia);
  if (media) return { kind: 'media', media };
  if (item.fieldId === 'f_locomotion') return { kind: 'project-icon', iconKey: 'locomotion' };
  if (item.fieldId === 'f_fundamentals') return { kind: 'project-icon', iconKey: 'fundamentals' };
  if (item.fieldId === 'f_structuring') return { kind: 'project-icon', iconKey: 'structuring' };
  const skills = (item.motorActions || []).join(' ').toLocaleLowerCase();
  if (skills.includes('balance') || skills.includes('توازن'))
    return { kind: 'skill-icon', iconKey: 'balance' };
  if (skills.includes('ball') || skills.includes('كرة'))
    return { kind: 'skill-icon', iconKey: 'ball' };
  if (skills.includes('run') || skills.includes('جري'))
    return { kind: 'skill-icon', iconKey: 'running' };
  return { kind: 'fallback', iconKey: 'neutral' };
}

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
  origin?: string;
  ownerId?: string;
  visibility: PedagogicalSituationVisibility;
  provenance: {
    source: PedagogicalSituationReadSource;
    sourceId: string;
    externalId?: string;
    canonicalSituationId?: string;
    label?: string;
  };
  media: EducationalSituationMedia[];
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
    origin: item.origin,
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
      label: situationProvenanceLabel(item.origin),
    },
    media: item.media || [],
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
    origin: item.origin,
    ownerId: item.ownerId,
    visibility: isPublic ? 'PUBLIC' : item.ownerId ? 'OWNER' : isReview ? 'REVIEW' : 'HIDDEN',
    provenance: {
      source: 'LEGACY_GAME',
      sourceId: item.id,
      canonicalSituationId,
      label: situationProvenanceLabel(item.origin),
    },
    media: [],
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
