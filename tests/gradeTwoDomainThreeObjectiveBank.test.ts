import { describe, expect, it } from 'vitest';
import { getLearningSectionComponents } from '../src/data/domainOneLearningSectionReference';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import {
  GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_TWO_DOMAIN_THREE_RESOURCES,
} from '../src/data/gradeTwoDomainThreeObjectiveBank';

describe('G2/D3 objective bank', () => {
  it('exposes the canonical reference and five stable objectives', () => {
    expect(GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK).toHaveLength(5);
    expect(getObjectiveBank('lvl_p2', 'f_structuring')).toBe(GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK);
    expect(getLearningSectionComponents('lvl_p2', 'f_structuring').map((item) => item.id)).toEqual([
      'learning-section:lvl_p2:f_structuring:component:1',
      'learning-section:lvl_p2:f_structuring:component:2',
      'learning-section:lvl_p2:f_structuring:component:3',
    ]);
    expect(getObjectiveBankResources('lvl_p2', 'f_structuring')).toBe(
      GRADE_TWO_DOMAIN_THREE_RESOURCES
    );
  });

  it('keeps examples and technical throwing outside independent objectives', () => {
    const text = GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK.map((item) => item.objectiveText).join(' ');
    expect(text).not.toMatch(/كرة|كرات|قمع|أقماع|جُلّة|رمي بعيد|رمي قريب|مطاردة|تتابع|أدوار/);
    expect(GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK[3].objectiveText).toContain('الوسيلة');
  });
});
