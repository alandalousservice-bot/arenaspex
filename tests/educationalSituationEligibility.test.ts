import { describe, expect, it } from 'vitest';
import {
  findSuitableSituations,
  isAutoGenerationEligible,
} from '../src/services/educationalSituation.selector.service';
import type { EducationalSituation } from '../src/types/spex';

const situation = (overrides: Partial<EducationalSituation> = {}): EducationalSituation => ({
  id: 'situation-1',
  externalId: 'situation-1',
  name: 'اختبار',
  grade: 1,
  fieldId: 'f_locomotion',
  fieldName: 'التنقل',
  objectiveIds: ['obj-1'],
  objectiveTexts: ['هدف'],
  sourceGoal: '',
  organization: '',
  equipment: [],
  origin: 'REFERENCE_SEED',
  status: 'APPROVED',
  ...overrides,
});

describe('EducationalSituation automatic generation eligibility', () => {
  it('requires approved and auto-generation eligible', () => {
    expect(
      isAutoGenerationEligible(
        situation({ approvalStatus: 'APPROVED', productionEligibility: 'AUTO_GENERATION_ELIGIBLE' })
      )
    ).toBe(true);
    expect(
      isAutoGenerationEligible(
        situation({ approvalStatus: 'APPROVED', productionEligibility: 'REVIEW_ONLY' })
      )
    ).toBe(false);
    expect(
      isAutoGenerationEligible(
        situation({ approvalStatus: 'APPROVED', productionEligibility: 'SOURCE_ARCHIVE_ONLY' })
      )
    ).toBe(false);
    expect(
      isAutoGenerationEligible(
        situation({
          approvalStatus: 'PENDING_REVIEW',
          productionEligibility: 'AUTO_GENERATION_ELIGIBLE',
        })
      )
    ).toBe(false);
  });

  it('prevents the legacy selector from bypassing the eligibility gate', () => {
    const items = [
      situation({ id: 'auto', productionEligibility: 'AUTO_GENERATION_ELIGIBLE' }),
      situation({ id: 'review', productionEligibility: 'REVIEW_ONLY' }),
      situation({ id: 'archive', productionEligibility: 'SOURCE_ARCHIVE_ONLY' }),
    ];
    expect(
      findSuitableSituations(items, {
        grade: 1,
        fieldId: 'f_locomotion',
        objectiveId: 'obj-1',
        objectiveText: 'هدف',
      }).map((item) => item.id)
    ).toEqual(['auto']);
  });

  it('keeps legacy teacher-owned situations eligible through an explicit compatibility default', () => {
    expect(isAutoGenerationEligible(situation({ origin: 'TEACHER' }))).toBe(true);
  });
});
