import { describe, expect, it } from 'vitest';
import { resolveObjective } from '../src/services/objectiveResolver.service';

const base = { id: 'legacy-1', text: 'هدف شخصي', orderIndex: 1 };
describe('objective resolver', () => {
  it('resolves legacy and owned objectives without changing wording', () => {
    expect(resolveObjective('lvl_p1', 'f_fundamentals', base).source).toBe('LEGACY_EMBEDDED');
    expect(
      resolveObjective(
        'lvl_p1',
        'f_fundamentals',
        { ...base, teacherObjectiveId: 'to-1' },
        {
          id: 'to-1',
          ownerId: 't-1',
          gradeId: 'lvl_p1',
          domainId: 'f_fundamentals',
          finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
          text: 'هدف محفوظ',
        }
      ).text
    ).toBe('هدف محفوظ');
  });
  it('rejects an unresolved private reference', () => {
    expect(() =>
      resolveObjective('lvl_p1', 'f_fundamentals', { ...base, teacherObjectiveId: 'other' })
    ).toThrow('OBJECTIVE_PRIVATE_REFERENCE_INVALID');
  });
});
