import { describe, expect, it } from 'vitest';
import {
  findSuitableSituations,
  referenceSituations,
  snapshotSituation,
} from '../src/services/educationalSituation.selector.service';

describe('Educational Situations seed and selector', () => {
  it('contains the exact 150 immutable reference records', () =>
    expect(referenceSituations).toHaveLength(150));
  it('filters by objective, grade and field without admitting unrelated situations', () => {
    const source = referenceSituations[0];
    const matched = findSuitableSituations(referenceSituations, {
      grade: source.grade,
      fieldId: source.fieldId,
      objectiveText: source.objectiveTexts[0],
    });
    expect(matched.length).toBeGreaterThan(0);
    expect(
      matched.every(
        (item) =>
          item.grade === source.grade &&
          item.fieldId === source.fieldId &&
          item.objectiveTexts.includes(source.objectiveTexts[0])
      )
    ).toBe(true);
  });
  it('creates a memo snapshot that can change without mutating its bank source', () => {
    const source = referenceSituations[0];
    const snapshot = snapshotSituation(source);
    snapshot.equipment.push('اختبار');
    snapshot.organization = 'نسخة المذكرة';
    expect(source.equipment).not.toContain('اختبار');
    expect(source.organization).not.toBe('نسخة المذكرة');
  });
  it('falls back to the pedagogical objective text when a legacy source id differs', () => {
    const source = referenceSituations[0];
    const matched = findSuitableSituations(referenceSituations, {
      grade: source.grade,
      fieldId: source.fieldId,
      objectiveId: 'legacy-source-reference-id',
      objectiveText: source.objectiveTexts[0],
    });
    expect(matched.map((item) => item.id)).toContain(source.id);
  });
});
