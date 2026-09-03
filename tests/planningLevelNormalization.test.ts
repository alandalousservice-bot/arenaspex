import { describe, expect, it } from 'vitest';
import {
  buildClassPlannedSessionSeeds,
  canonicalPlanningSessions,
  normalizePrimaryLevelId,
} from '../src/services/teacherPlanning.service';

const arabicDigits = ['١', '٢', '٣', '٤', '٥'];
const canonicalIds = ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'] as const;

describe('primary planning level normalization', () => {
  it('normalizes only explicit canonical and grade aliases', () => {
    canonicalIds.forEach((expected, index) => {
      const grade = index + 1;
      for (const alias of [
        expected,
        grade,
        String(grade),
        `p${grade}`,
        `grade${grade}`,
        `g${grade}`,
        `level${grade}`,
        arabicDigits[index],
      ]) {
        expect(normalizePrimaryLevelId(alias)).toBe(expected);
      }
    });

    expect(normalizePrimaryLevelId('  G2 ')).toBe('lvl_p2');
  });

  it('rejects unknown, partial, and structurally invalid values', () => {
    for (const value of [
      null,
      undefined,
      '',
      'foobar',
      'السنة الثانية ابتدائي',
      'grade0',
      'grade6',
      'lvl_p6',
      'lvl_p2_extra',
      '2.0',
      {},
    ]) {
      expect(normalizePrimaryLevelId(value)).toBeNull();
    }
  });

  it('uses the normalized level for canonical sessions and seeds', () => {
    const expectedCounts = [54, 54, 54, 33, 33];
    canonicalIds.forEach((canonicalId, index) => {
      const alias = `grade${index + 1}`;
      const sessions = canonicalPlanningSessions(alias, '2025-09-22', '2025-2026');
      const seeds = buildClassPlannedSessionSeeds(
        'teacher-1',
        `class-${index + 1}`,
        '2025-2026',
        alias,
        '2025-09-22'
      );

      expect(sessions).toHaveLength(expectedCounts[index]);
      expect(seeds).toHaveLength(expectedCounts[index]);
      expect(sessions.every((session) => session.levelId === canonicalId)).toBe(true);
      expect(seeds.every((seed) => seed.referenceSessionId.startsWith(`${canonicalId}:`))).toBe(
        true
      );
      expect(
        seeds.every((seed) => seed.durationMinutes === (index < 3 ? 60 : index === 3 ? 90 : 60))
      ).toBe(true);
    });
  });

  it('rejects unknown levels without falling back to grade 1', () => {
    expect(canonicalPlanningSessions('foobar', '2025-09-22', '2025-2026')).toEqual([]);
    expect(
      buildClassPlannedSessionSeeds(
        'teacher-1',
        'class-invalid',
        '2025-2026',
        'foobar',
        '2025-09-22'
      )
    ).toEqual([]);
  });
});
