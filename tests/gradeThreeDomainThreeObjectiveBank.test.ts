import { describe, expect, it } from 'vitest';
import { getLearningSectionComponents } from '../src/data/domainOneLearningSectionReference';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import {
  GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK,
  GRADE_THREE_DOMAIN_THREE_RESOURCES,
} from '../src/data/gradeThreeDomainThreeObjectiveBank';

describe('G3/D3 objective bank', () => {
  it('registers six source-scoped objectives and canonical components', () => {
    expect(GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK).toHaveLength(6);
    expect(getObjectiveBank('lvl_p3', 'f_structuring')).toBe(
      GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK
    );
    expect(getLearningSectionComponents('lvl_p3', 'f_structuring')).toHaveLength(3);
    expect(getObjectiveBankResources('lvl_p3', 'f_structuring')).toBe(
      GRADE_THREE_DOMAIN_THREE_RESOURCES
    );
    expect(new Set(GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK.map((item) => item.id)).size).toBe(6);
  });
  it('keeps motor techniques, games, formations, and roles out of direct objectives', () => {
    const text = GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK.map((item) => item.objectiveText).join(
      ' '
    );
    expect(text).not.toMatch(
      /سرعة الجري|تحسين تغيير الاتجاه|الإفلات كمهارة|مسافة الرمي|علو الرمي|مطاردة|تتابع|أدوار|صفوف|دائرة/
    );
    expect(text).toContain('فضاء محدد');
    expect(text).toContain('قواعد المنافسة');
  });
});
