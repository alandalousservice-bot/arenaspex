import { describe, expect, it } from 'vitest';
import {
  GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_ONE_DOMAIN_THREE_RESOURCES,
} from '../src/data/gradeOneDomainThreeObjectiveBank';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';

describe('G1/D3 objective bank', () => {
  it('exposes six immutable, source-scoped objectives', () => {
    expect(GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK).toHaveLength(6);
    expect(
      GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK.every((item) => item.id.startsWith('G1-D3-OBJ-'))
    ).toBe(true);
    expect(
      GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK.every((item) => item.domainId === 'f_structuring')
    ).toBe(true);
    expect(
      GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK.every((item) =>
        item.sourceReferences.includes('EPS-2023:grade-1:domain-3')
      )
    ).toBe(true);
    expect(getObjectiveBank('lvl_p1', 'f_structuring')).toBe(GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK);
  });

  it('uses only confirmed organizational resources and preserves coverage metadata', () => {
    expect(GRADE_ONE_DOMAIN_THREE_RESOURCES.map((resource) => resource.label)).toEqual([
      'فضاء الممارسة',
      'حدود فضاء الممارسة',
      'مشاركة فضاء الممارسة',
      'التشكيلات والتنقلات المنتظمة',
      'الأعداد والصفوف',
      'الأقران',
    ]);
    expect(getObjectiveBankResources('lvl_p1', 'f_structuring')).toBe(
      GRADE_ONE_DOMAIN_THREE_RESOURCES
    );
    expect(
      GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK.every((item) => item.transversalResourceIds.length > 0)
    ).toBe(true);
  });

  it('does not introduce unsupported games or role concepts', () => {
    const text = GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK.map((item) => item.objectiveText).join(' ');
    expect(text).not.toMatch(/مطاردة|تتابع|أدوار|قائد|تابع/);
  });
});
