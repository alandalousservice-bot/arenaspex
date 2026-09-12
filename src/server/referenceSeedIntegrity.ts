export type ReferenceSeedRecord = {
  id: string;
  externalId: string;
  name: string;
  grade: number;
  fieldId: string;
  fieldName: string;
  objectiveIds: string[];
  objectiveTexts: string[];
  sourceGoal: string;
  organization: string;
  equipment: string[];
  variations: string | null;
  origin: 'REFERENCE_SEED';
  status: 'APPROVED';
};

const comparableRecord = (record: ReferenceSeedRecord) =>
  JSON.stringify([
    record.id,
    record.externalId,
    record.name,
    record.grade,
    record.fieldId,
    record.fieldName,
    record.objectiveIds,
    record.objectiveTexts,
    record.sourceGoal,
    record.organization,
    record.equipment,
    record.variations,
    record.origin,
    record.status,
  ]);

export type ReferenceSeedOwnershipAudit = {
  expectedSeedIds: string[];
  exactIds: string[];
  missingIds: string[];
  conflictingIds: string[];
};

export function auditReferenceSeedOwnership(
  expectedRecords: ReferenceSeedRecord[],
  existingRecords: ReferenceSeedRecord[]
): ReferenceSeedOwnershipAudit {
  const existingById = new Map(existingRecords.map((record) => [record.id, record]));
  const exactIds: string[] = [];
  const missingIds: string[] = [];
  const conflictingIds: string[] = [];

  for (const expected of expectedRecords) {
    const existing = existingById.get(expected.id);
    if (!existing) missingIds.push(expected.id);
    else if (comparableRecord(existing) === comparableRecord(expected)) exactIds.push(expected.id);
    else conflictingIds.push(expected.id);
  }

  return {
    expectedSeedIds: expectedRecords.map((record) => record.id),
    exactIds,
    missingIds,
    conflictingIds,
  };
}
