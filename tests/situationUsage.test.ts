import { describe, expect, it } from 'vitest';
import { collectSituationUsageCounts } from '../src/services/situationUsage.service';

describe('saved situation usage', () => {
  it('counts distinct teachers, not views, drafts, or repeated saves', () => {
    const counts = collectSituationUsageCounts([
      { ownerId: 'teacher-a', data: { rows: [{ situationSnapshot: { situationId: 'sit-1' } }] } },
      { ownerId: 'teacher-a', data: { rows: [{ situationSnapshot: { situationId: 'sit-1' } }] } },
      { ownerId: 'teacher-b', data: { rows: [{ situationSnapshot: { situationId: 'sit-1' } }] } },
      { ownerId: null, data: { rows: [{ situationSnapshot: { situationId: 'sit-1' } }] } },
      { ownerId: 'teacher-c', data: { rows: [{ situationSnapshot: { situationId: 'sit-2' } }] } },
    ]);
    expect(counts.get('sit-1')).toBe(2);
    expect(counts.get('sit-2')).toBe(1);
  });

  it('does not count unrelated lesson-plan data', () => {
    expect(collectSituationUsageCounts([{ ownerId: 'teacher-a', data: { rows: [] } }]).size).toBe(
      0
    );
  });
});
