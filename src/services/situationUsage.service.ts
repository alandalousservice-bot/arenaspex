export interface PersistedLessonPlanUsageRow {
  ownerId: string | null;
  data: unknown;
}

/** Counts distinct teachers whose saved lesson-plan snapshot references a situation. */
export function collectSituationUsageCounts(
  rows: PersistedLessonPlanUsageRow[]
): Map<string, number> {
  const ownersBySituation = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row.ownerId) continue;
    const situationIds = new Set<string>();
    collectSituationIds(row.data, situationIds);
    for (const situationId of situationIds) {
      const owners = ownersBySituation.get(situationId) ?? new Set<string>();
      owners.add(row.ownerId);
      ownersBySituation.set(situationId, owners);
    }
  }

  return new Map([...ownersBySituation].map(([id, owners]) => [id, owners.size]));
}

function collectSituationIds(value: unknown, result: Set<string>): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSituationIds(item, result));
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.situationSnapshot && typeof record.situationSnapshot === 'object') {
    const snapshot = record.situationSnapshot as Record<string, unknown>;
    if (typeof snapshot.situationId === 'string' && snapshot.situationId) {
      result.add(snapshot.situationId);
    }
  }
  for (const child of Object.values(record)) collectSituationIds(child, result);
}
