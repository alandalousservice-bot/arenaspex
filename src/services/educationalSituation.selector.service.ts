import seed from '../../arenaspex_situations_mapped_to_objectives (1).json';
import {
  EducationalSituation,
  EducationalSituationObjectiveRelation,
  EducationalSituationRelationType,
  EducationalSituationSnapshot,
} from '../types/spex';
import { lessonPhaseBudgetsForDuration } from './lessonTiming.service';

type SeedSituation = {
  id: string;
  grade: number;
  name: string;
  field_id: string;
  field_name: string;
  source_goal: string;
  linked_objective_ids: string[];
  linked_objectives: string[];
  organization: string;
  equipment: string;
  variations?: string;
  origin: string;
};

export type SituationObjectiveRelation = EducationalSituationObjectiveRelation;
export type EducationalSituationLessonType =
  'LEARNING' | 'INTEGRATIVE' | 'DIAGNOSTIC' | 'SUMMATIVE';
export type SelectionWarning =
  'DURATION_UNKNOWN' | 'DURATION_BUDGET_UNFILLED' | 'REQUIREMENT_COVERAGE_INCOMPLETE';
export type SelectionFailureCode =
  | 'NO_ELIGIBLE_SITUATION'
  | 'NO_DIRECT_MATCH'
  | 'INSUFFICIENT_DURATION_COVERAGE'
  | 'ASSESSMENT_COVERAGE_MISSING'
  | 'INTEGRATIVE_COVERAGE_INCOMPLETE';

export interface EducationalSituationSelectionInput {
  gradeId: string | number;
  domainId: string;
  lessonType: EducationalSituationLessonType;
  objectiveIds?: string[];
  objectiveId?: string;
  objectiveText?: string;
  integrativeObjectiveIds?: string[];
  durationMinutes?: number | null;
  availableEquipment?: string[];
  previousSituationIds?: string[];
  excludedSituationIds?: string[];
  preferredSituationIds?: string[];
  requirements?: string[];
  maxSituations?: number;
}

export interface RequirementCoverage {
  requested: string[];
  matched: string[];
  missing: string[];
  ratio: number;
}

export interface SituationSelectionCandidate {
  situation: EducationalSituation;
  relationTypes: SituationObjectiveRelation[];
  matchedObjectiveIds: string[];
  requirementCoverage: RequirementCoverage;
  durationMinutes: number | null;
  ranking: {
    relationTier: number;
    requirementRatio: number;
    phaseRank: number;
    difficultyRank: number;
    equipmentRank: number;
    recentUseRank: number;
    preferredRank: number;
  };
}

export interface ExcludedSituationCandidate {
  situationId: string;
  reason:
    | 'NOT_APPROVED'
    | 'NOT_AUTO_ELIGIBLE'
    | 'GRADE_MISMATCH'
    | 'DOMAIN_MISMATCH'
    | 'LESSON_TYPE_MISMATCH'
    | 'OBJECTIVE_MISMATCH'
    | 'RELATION_MISMATCH'
    | 'EXCLUDED';
}

export interface EducationalSituationSelectionResult {
  selectedSituations: EducationalSituation[];
  candidates: SituationSelectionCandidate[];
  excluded: ExcludedSituationCandidate[];
  warnings: SelectionWarning[];
  failureCode?: SelectionFailureCode;
  requirementCoverage: RequirementCoverage;
  durationBudgetMinutes: number | null;
  usedDurationMinutes: number;
}

export const referenceSituations: EducationalSituation[] = (seed as SeedSituation[]).map(
  (item) => ({
    id: item.id,
    externalId: item.id,
    name: item.name,
    grade: item.grade,
    fieldId: item.field_id,
    fieldName: item.field_name,
    objectiveIds: item.linked_objective_ids,
    objectiveTexts: item.linked_objectives,
    sourceGoal: item.source_goal,
    organization: item.organization,
    equipment: item.equipment
      .split(/[،,]/)
      .map((value) => value.trim())
      .filter(Boolean),
    variations: item.variations,
    origin: 'REFERENCE_SEED',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
  })
);

export function isAutoGenerationEligible(situation: EducationalSituation): boolean {
  const productionEligibility =
    situation.productionEligibility ??
    (situation.origin === 'TEACHER' ? 'AUTO_GENERATION_ELIGIBLE' : undefined);
  return (
    (situation.approvalStatus ?? situation.status) === 'APPROVED' &&
    productionEligibility === 'AUTO_GENERATION_ELIGIBLE'
  );
}

/** Assessment links are valid evidence, but never ordinary learning selection input. */
export function hasOrdinaryLearningRelation(situation: EducationalSituation): boolean {
  const relationTypes = situation.relationTypes;
  if (!relationTypes?.length) return true;
  return relationTypes.some(
    (relationType: EducationalSituationRelationType) => relationType !== 'ASSESSMENT'
  );
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('ar')
    .normalize('NFKC')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function asGrade(value: string | number): number {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

function relationEntries(situation: EducationalSituation): SituationObjectiveRelation[] {
  if (situation.objectiveRelations?.length) return situation.objectiveRelations;
  const ids = situation.objectiveIds;
  const types = situation.relationTypes;
  if (!types?.length) return ids.map((objectiveId) => ({ objectiveId, relationType: 'DIRECT' }));
  if (types.length === ids.length)
    return ids.map((objectiveId, index) => ({ objectiveId, relationType: types[index] }));
  if (types.length === 1)
    return ids.map((objectiveId) => ({ objectiveId, relationType: types[0] }));
  return [];
}

function lessonTypes(situation: EducationalSituation): string[] {
  return (situation.lessonTypes ?? []).map(normalize);
}

function lessonTypeMatches(
  situation: EducationalSituation,
  lessonType: EducationalSituationLessonType
): boolean {
  const types = lessonTypes(situation);
  if (!types.length) return true;
  const aliases: Record<EducationalSituationLessonType, string[]> = {
    LEARNING: ['learning', 'تعلميه', 'تعلمية'],
    INTEGRATIVE: ['integrative', 'ادماجيه', 'ادماجية'],
    DIAGNOSTIC: ['diagnostic', 'تشخيصيه', 'تشخيصية', 'تقويم تشخيصي'],
    SUMMATIVE: ['summative', 'تقويميه', 'تقويمية', 'تقويم تحصيلي'],
  };
  return aliases[lessonType].some((alias) => types.includes(normalize(alias)));
}

export function lessonMainWorkBudgetMinutes(
  gradeId: string | number,
  durationMinutes: number | null | undefined
): number | null {
  if (durationMinutes == null) return null;
  const grade = asGrade(gradeId);
  if (grade === 4) return lessonPhaseBudgetsForDuration(durationMinutes).main;
  if (durationMinutes >= 60) return durationMinutes - 20;
  return Math.max(0, durationMinutes);
}

const signalGroups: Record<string, RegExp> = {
  speed: /سرع|سريع|جري|عدو|speed|run/i,
  direction: /اتجاه|مسار|يمين|يسار|direction|path/i,
  signal: /اشار|إشار|نداء|signal|cue/i,
  balance: /توازن|اتزان|balance/i,
  coordination: /تنسيق|توافق|coordination/i,
  jump: /قفز|وثب|jump/i,
  throwReceive: /رمي|استقبال|تمرير|throw|receive/i,
  space: /فضاء|مكان|مساح|space/i,
};

function signalSet(values: string[]): Set<string> {
  const text = values.join(' ');
  return new Set(
    Object.entries(signalGroups)
      .filter(([, pattern]) => pattern.test(text))
      .map(([key]) => key)
  );
}

function requirementCoverage(
  requested: string[] = [],
  situation: EducationalSituation
): RequirementCoverage {
  const source = [
    situation.name,
    situation.sourceGoal,
    situation.organization,
    situation.variations ?? '',
    ...(situation.motorActions ?? []),
    ...(situation.pedagogicalTags ?? []),
    ...(situation.requirements ?? []),
    situation.executionConditions ?? '',
    situation.successCriteria ?? '',
    Array.isArray(situation.observationIndicators)
      ? situation.observationIndicators.join(' ')
      : (situation.observationIndicators ?? ''),
  ];
  const sourceSignals = signalSet(source);
  const matched = requested.filter((item) => {
    const normalizedItem = normalize(item);
    const key = Object.keys(signalGroups).find((candidate) => normalizedItem.includes(candidate));
    return key
      ? sourceSignals.has(key)
      : source.some((value) => normalize(value).includes(normalizedItem));
  });
  const uniqueRequested = [...new Set(requested)];
  const uniqueMatched = [...new Set(matched)];
  return {
    requested: uniqueRequested,
    matched: uniqueMatched,
    missing: uniqueRequested.filter((item) => !uniqueMatched.includes(item)),
    ratio: uniqueRequested.length ? uniqueMatched.length / uniqueRequested.length : 1,
  };
}

function matchesDomain(situation: EducationalSituation, domainId: string): boolean {
  return situation.domainId === domainId || situation.fieldId === domainId;
}

function relationTier(
  relations: SituationObjectiveRelation[],
  lessonType: EducationalSituationLessonType,
  targetIds: Set<string>
): { tier: number; matchedObjectiveIds: string[] } {
  const matched = relations.filter(
    (relation) => !targetIds.size || targetIds.has(relation.objectiveId)
  );
  const types = new Set(matched.map((relation) => relation.relationType));
  if (lessonType === 'LEARNING')
    return {
      tier: types.has('DIRECT') ? 3 : types.has('SUPPORTIVE') ? 1 : 0,
      matchedObjectiveIds: matched.map((relation) => relation.objectiveId),
    };
  if (lessonType === 'INTEGRATIVE')
    return {
      tier: types.has('INTEGRATIVE') ? 3 : types.has('DIRECT') ? 2 : 0,
      matchedObjectiveIds: matched.map((relation) => relation.objectiveId),
    };
  return {
    tier: types.has('ASSESSMENT') ? 3 : 0,
    matchedObjectiveIds: matched.map((relation) => relation.objectiveId),
  };
}

function phaseRank(situation: EducationalSituation): number {
  return (situation.phaseSuitability ?? []).some((value) =>
    /prepar|basic|تهيئ|اكتشاف|اساس/i.test(value)
  )
    ? 2
    : 1;
}

function difficultyRank(situation: EducationalSituation): number {
  if (!situation.difficulty) return 0;
  return /basic|اساس|بسيط/i.test(situation.difficulty) ? 1 : 2;
}

function equipmentRank(situation: EducationalSituation, available?: string[]): number {
  if (!available?.length) return 0;
  const set = new Set(available.map(normalize));
  return (situation.equipment ?? []).filter((item) => set.has(normalize(item))).length;
}

function compareCandidates(a: SituationSelectionCandidate, b: SituationSelectionCandidate): number {
  const left = a.ranking;
  const right = b.ranking;
  return (
    right.relationTier - left.relationTier ||
    right.requirementRatio - left.requirementRatio ||
    right.phaseRank - left.phaseRank ||
    right.difficultyRank - left.difficultyRank ||
    right.equipmentRank - left.equipmentRank ||
    right.recentUseRank - left.recentUseRank ||
    right.preferredRank - left.preferredRank ||
    a.situation.id.localeCompare(b.situation.id)
  );
}

export function selectEducationalSituations(
  items: EducationalSituation[],
  input: EducationalSituationSelectionInput
): EducationalSituationSelectionResult {
  const targetIds = new Set([
    ...(input.objectiveIds ?? []),
    ...(input.objectiveId ? [input.objectiveId] : []),
    ...(input.integrativeObjectiveIds ?? []),
  ]);
  const targetText = input.objectiveText ? normalize(input.objectiveText) : '';
  const previous = new Set(input.previousSituationIds ?? []);
  const excludedIds = new Set(input.excludedSituationIds ?? []);
  const preferredIds = new Set(input.preferredSituationIds ?? []);
  const excluded: ExcludedSituationCandidate[] = [];
  const eligible: SituationSelectionCandidate[] = [];
  for (const situation of items) {
    if ((situation.approvalStatus ?? situation.status) !== 'APPROVED') {
      excluded.push({ situationId: situation.id, reason: 'NOT_APPROVED' });
      continue;
    }
    if (!isAutoGenerationEligible(situation)) {
      excluded.push({ situationId: situation.id, reason: 'NOT_AUTO_ELIGIBLE' });
      continue;
    }
    if (excludedIds.has(situation.id)) {
      excluded.push({ situationId: situation.id, reason: 'EXCLUDED' });
      continue;
    }
    if (asGrade(situation.gradeId ?? situation.grade) !== asGrade(input.gradeId)) {
      excluded.push({ situationId: situation.id, reason: 'GRADE_MISMATCH' });
      continue;
    }
    if (!matchesDomain(situation, input.domainId)) {
      excluded.push({ situationId: situation.id, reason: 'DOMAIN_MISMATCH' });
      continue;
    }
    if (!lessonTypeMatches(situation, input.lessonType)) {
      excluded.push({ situationId: situation.id, reason: 'LESSON_TYPE_MISMATCH' });
      continue;
    }
    const relations = relationEntries(situation);
    const relation = relationTier(relations, input.lessonType, targetIds);
    const textMatch = Boolean(
      targetText && situation.objectiveTexts.some((text) => normalize(text) === targetText)
    );
    if (!relation.tier && !textMatch && targetIds.size) {
      excluded.push({ situationId: situation.id, reason: 'OBJECTIVE_MISMATCH' });
      continue;
    }
    if (!relation.tier && !textMatch) {
      excluded.push({ situationId: situation.id, reason: 'RELATION_MISMATCH' });
      continue;
    }
    const coverage = requirementCoverage(input.requirements, situation);
    eligible.push({
      situation,
      relationTypes: relations,
      matchedObjectiveIds: relation.matchedObjectiveIds,
      requirementCoverage: coverage,
      durationMinutes: situation.durationMinutes ?? null,
      ranking: {
        relationTier: relation.tier,
        requirementRatio: coverage.ratio,
        phaseRank: phaseRank(situation),
        difficultyRank: difficultyRank(situation),
        equipmentRank: equipmentRank(situation, input.availableEquipment),
        recentUseRank: previous.has(situation.id) ? 0 : 1,
        preferredRank: preferredIds.has(situation.id) ? 1 : 0,
      },
    });
  }
  eligible.sort(compareCandidates);
  const warnings: SelectionWarning[] = [];
  const budget = lessonMainWorkBudgetMinutes(input.gradeId, input.durationMinutes);
  const max = input.maxSituations ?? (budget != null && budget >= 60 ? 3 : 2);
  const hasDirectLearningMatch = eligible.some((candidate) => candidate.ranking.relationTier === 3);
  const selectable = input.lessonType === 'LEARNING' && !hasDirectLearningMatch ? [] : eligible;
  let used = 0;
  const selected: SituationSelectionCandidate[] = [];
  for (const candidate of selectable) {
    if (selected.length >= max) break;
    if (candidate.durationMinutes == null) warnings.push('DURATION_UNKNOWN');
    else if (budget != null && used + candidate.durationMinutes > budget) continue;
    selected.push(candidate);
    used += candidate.durationMinutes ?? 0;
  }
  const coverage = requirementCoverage(
    input.requirements,
    selected[0]?.situation ?? {
      id: '',
      name: '',
      sourceGoal: '',
      organization: '',
      equipment: [],
      objectiveIds: [],
      objectiveTexts: [],
      grade: 0,
      fieldId: '',
      fieldName: '',
      origin: 'REFERENCE_SEED',
      status: 'APPROVED',
    }
  );
  if (coverage.missing.length) warnings.push('REQUIREMENT_COVERAGE_INCOMPLETE');
  if (budget != null && used < budget && selected.length) warnings.push('DURATION_BUDGET_UNFILLED');
  const selectedObjectiveIds = new Set(
    selected.flatMap((candidate) => candidate.matchedObjectiveIds)
  );
  const missingIntegrativeObjectives = [...(input.integrativeObjectiveIds ?? [])].filter(
    (id) => !selectedObjectiveIds.has(id)
  );
  let failureCode: SelectionFailureCode | undefined;
  const hasMatchingIdentityCandidate = items.some(
    (situation) =>
      isAutoGenerationEligible(situation) &&
      asGrade(situation.gradeId ?? situation.grade) === asGrade(input.gradeId) &&
      matchesDomain(situation, input.domainId)
  );
  if (!eligible.length && input.lessonType === 'LEARNING' && hasMatchingIdentityCandidate)
    failureCode = 'NO_DIRECT_MATCH';
  else if (
    !eligible.length &&
    (input.lessonType === 'DIAGNOSTIC' || input.lessonType === 'SUMMATIVE') &&
    hasMatchingIdentityCandidate
  )
    failureCode = 'ASSESSMENT_COVERAGE_MISSING';
  else if (!eligible.length && input.lessonType === 'INTEGRATIVE' && hasMatchingIdentityCandidate)
    failureCode = 'INTEGRATIVE_COVERAGE_INCOMPLETE';
  else if (!eligible.length) failureCode = 'NO_ELIGIBLE_SITUATION';
  else if (input.lessonType === 'LEARNING' && !hasDirectLearningMatch)
    failureCode = 'NO_DIRECT_MATCH';
  else if (
    !selected.length &&
    (input.lessonType === 'DIAGNOSTIC' || input.lessonType === 'SUMMATIVE')
  )
    failureCode = 'ASSESSMENT_COVERAGE_MISSING';
  else if (input.lessonType === 'INTEGRATIVE' && missingIntegrativeObjectives.length)
    failureCode = 'INTEGRATIVE_COVERAGE_INCOMPLETE';
  else if (!selected.length && budget != null) failureCode = 'INSUFFICIENT_DURATION_COVERAGE';
  return {
    selectedSituations: selected.map((candidate) => candidate.situation),
    candidates: eligible,
    excluded,
    warnings: [...new Set(warnings)],
    failureCode,
    requirementCoverage: coverage,
    durationBudgetMinutes: budget,
    usedDurationMinutes: used,
  };
}

export function findSuitableSituations(
  items: EducationalSituation[],
  params: {
    grade: number;
    fieldId: string;
    objectiveId?: string;
    objectiveText?: string;
    objectiveIds?: string[];
    objectiveTexts?: string[];
    previousSituationIds?: string[];
  }
) {
  const objectiveIds = new Set([
    ...(params.objectiveIds || []),
    ...(params.objectiveId ? [params.objectiveId] : []),
  ]);
  const objectiveTexts = new Set(
    [params.objectiveText, ...(params.objectiveTexts || [])].filter((value): value is string =>
      Boolean(value)
    )
  );
  const matches = items.filter(
    (item) =>
      isAutoGenerationEligible(item) &&
      hasOrdinaryLearningRelation(item) &&
      item.grade === params.grade &&
      item.fieldId === params.fieldId &&
      (objectiveIds.size || objectiveTexts.size
        ? item.objectiveIds.some((id) => objectiveIds.has(id)) ||
          item.objectiveTexts.some((text) => objectiveTexts.has(text))
        : true)
  );
  const previous = new Set(params.previousSituationIds || []);
  return [...matches].sort(
    (a, b) =>
      Number(previous.has(a.id)) - Number(previous.has(b.id)) || a.name.localeCompare(b.name, 'ar')
  );
}

export function snapshotSituation(item: EducationalSituation): EducationalSituationSnapshot {
  const objectiveRelations = item.objectiveRelations?.length
    ? item.objectiveRelations.map((relation) => ({ ...relation }))
    : item.relationTypes?.length
      ? item.objectiveIds.map((objectiveId, index) => ({
          objectiveId,
          relationType: item.relationTypes?.[index] || item.relationTypes?.[0] || 'DIRECT',
        }))
      : undefined;
  return {
    situationId: item.id,
    name: item.name,
    organization: item.organization,
    equipment: [...item.equipment],
    variations: item.variations,
    sourceGoal: item.sourceGoal,
    sourceDescription: item.sourceDescription || item.executionConditions || undefined,
    executionContent: item.executionConditions || undefined,
    instructions: item.instructions || undefined,
    successCriteria: item.successCriteria || undefined,
    observationIndicators: item.observationIndicators,
    objectiveIds: [...item.objectiveIds],
    objectiveRelations,
  };
}
