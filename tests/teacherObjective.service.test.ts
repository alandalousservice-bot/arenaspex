import { describe, expect, it } from 'vitest';
import {
  normalizeObjectiveText,
  validateTeacherObjectiveContext,
} from '../src/services/teacherObjective.service';

describe('teacher objective foundation', () => {
  const valid = {
    text: 'ينفذ المتعلم وضعية توازن مستقرة.',
    gradeId: 'lvl_p1',
    domainId: 'f_fundamentals',
    finalCompetencyId: 'fc_lvl_p1_f_fundamentals',
    provenanceType: 'GENERATED' as const,
  };
  it('validates and preserves canonical context', () => {
    expect(() => validateTeacherObjectiveContext(valid)).not.toThrow();
    expect(() => validateTeacherObjectiveContext({ ...valid, domainId: 'f_locomotion' })).toThrow();
  });
  it('normalizes only obvious textual duplicates', () => {
    expect(normalizeObjectiveText(' هدف،  قابل للملاحظة. ')).toBe('هدف قابل للملاحظة');
  });
});
