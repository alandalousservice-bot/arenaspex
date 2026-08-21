import seed from '../../arenaspex_situations_mapped_to_objectives (1).json';
import { EducationalSituation, EducationalSituationSnapshot } from '../types/spex';

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
  })
);

export function findSuitableSituations(
  items: EducationalSituation[],
  params: {
    grade: number;
    fieldId: string;
    objectiveId?: string;
    objectiveText: string;
    previousSituationIds?: string[];
  }
) {
  const matches = items.filter(
    (item) =>
      item.status === 'APPROVED' &&
      item.grade === params.grade &&
      item.fieldId === params.fieldId &&
      (params.objectiveId
        ? item.objectiveIds.includes(params.objectiveId)
        : item.objectiveTexts.includes(params.objectiveText))
  );
  const previous = new Set(params.previousSituationIds || []);
  return [...matches].sort(
    (a, b) =>
      Number(previous.has(a.id)) - Number(previous.has(b.id)) || a.name.localeCompare(b.name, 'ar')
  );
}

export function snapshotSituation(item: EducationalSituation): EducationalSituationSnapshot {
  return {
    situationId: item.id,
    name: item.name,
    organization: item.organization,
    equipment: [...item.equipment],
    variations: item.variations,
  };
}
