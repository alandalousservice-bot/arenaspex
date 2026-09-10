import { describe, expect, it } from 'vitest';
import { getLearningSectionComponents } from '../src/data/domainOneLearningSectionReference';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import { GRADE_FIVE_DOMAIN_THREE_LEARNING_SECTION_REFERENCE } from '../src/data/domainThreeLearningSectionReference';

describe('G5/D3 canonical objective bank', () => {
  const bank = getObjectiveBank('lvl_p5', 'f_structuring');
  const resources = getObjectiveBankResources('lvl_p5', 'f_structuring');

  it('exposes the official reference and five one-meeting objectives', () => {
    expect(GRADE_FIVE_DOMAIN_THREE_LEARNING_SECTION_REFERENCE.finalCompetency).toBe(
      'يمارس بعض الرياضات الجماعية وفق مبادئ اللعبة والتقنيات الأساسية.'
    );
    expect(getLearningSectionComponents('lvl_p5', 'f_structuring')).toHaveLength(3);
    expect(bank).toHaveLength(5);
    expect(new Set(bank.map((item) => item.id)).size).toBe(5);
    expect(resources.map((item) => item.label)).toEqual([
      'مفاهيم اللعبة',
      'قواعد اللعبة',
      'التوزيع المنظم على الملعب',
      'اللعب الجماعي',
      'المبادئ الأولية للهجوم والدفاع',
    ]);
  });

  it('keeps attack and defense elementary, observable, and non-technical', () => {
    expect(bank.every((item) => !item.objectiveText.startsWith('أن'))).toBe(true);
    expect(
      bank.every(
        (item) =>
          !/قائد|تابع|تفوق عددي|ضغط|تشكيل تكتيكي|مراوغة|تمرير|قذف بدقة/.test(item.objectiveText)
      )
    ).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-5:domain-3'))).toBe(
      true
    );
    expect(
      bank.some((item) =>
        item.curriculumResourceIds.some((id) => id.includes('basic-attack-defense-principles'))
      )
    ).toBe(true);
    expect(bank.every((item) => item.competencyComponentIds.length === 1)).toBe(true);
    expect(bank.every((item) => item.sequenceWeight > 0)).toBe(true);
  });
});
