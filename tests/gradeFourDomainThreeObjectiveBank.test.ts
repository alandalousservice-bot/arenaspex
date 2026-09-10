import { describe, expect, it } from 'vitest';
import { getLearningSectionComponents } from '../src/data/domainOneLearningSectionReference';
import { getObjectiveBank, getObjectiveBankResources } from '../src/data/objectiveBankRegistry';
import { GRADE_FOUR_DOMAIN_THREE_LEARNING_SECTION_REFERENCE } from '../src/data/domainThreeLearningSectionReference';

describe('G4/D3 canonical objective bank', () => {
  const bank = getObjectiveBank('lvl_p4', 'f_structuring');
  const resources = getObjectiveBankResources('lvl_p4', 'f_structuring');

  it('exposes the official reference and five spatial objectives', () => {
    expect(GRADE_FOUR_DOMAIN_THREE_LEARNING_SECTION_REFERENCE.finalCompetency).toBe(
      'يبني الحركات القاعدية التي تضمن مواجهة الموقف بما يتماشى وفضاء الممارسة.'
    );
    expect(getLearningSectionComponents('lvl_p4', 'f_structuring')).toHaveLength(3);
    expect(bank).toHaveLength(5);
    expect(new Set(bank.map((item) => item.id)).size).toBe(5);
    expect(new Set(resources.map((item) => item.id)).size).toBe(5);
  });

  it('keeps objectives observable and spatial rather than technical or tactical', () => {
    expect(bank.every((item) => !item.objectiveText.startsWith('أن'))).toBe(true);
    expect(
      bank.every((item) => !/مهاجم|مدافع|قائد|تكتيك|تشكيل|مطاردة|تتابع/.test(item.objectiveText))
    ).toBe(true);
    expect(bank.every((item) => item.sourceReferences.includes('EPS-2023:grade-4:domain-3'))).toBe(
      true
    );
    expect(
      bank
        .flatMap((item) => item.curriculumResourceIds)
        .some((id) => id.includes('throwing-space-regulation'))
    ).toBe(true);
    expect(
      bank
        .flatMap((item) => item.curriculumResourceIds)
        .some((id) => id.includes('jumping-space-regulation'))
    ).toBe(true);
    expect(
      bank
        .flatMap((item) => item.curriculumResourceIds)
        .some((id) => id.includes('peer-opponent-distribution'))
    ).toBe(true);
    expect(
      bank.some((item) =>
        /مسافات|أبعاد|مجالات|مسار الوثبة|هيئة الجسم/.test(item.mobilizedKnowledge)
      )
    ).toBe(true);
    expect(bank.every((item) => item.competencyComponentIds.length === 1)).toBe(true);
  });
});
