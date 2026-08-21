import { describe, expect, it } from 'vitest';
import {
  FIELD_OPTIONS,
  objectivesFor,
} from '../src/components/educationalSituations/EducationalSituationsBankView';

describe('بيانات نموذج الموقف التربوي', () => {
  it('يربط اختيار الحركات القاعدية بالمعرف الصحيح', () => {
    expect(FIELD_OPTIONS.find((field) => field.name === 'الحركات القاعدية')?.id).toBe(
      'f_fundamentals'
    );
  });

  it('يعيد الهدف الفعلي ومعرف الجلسة المستقر للمستوى والميدان', () => {
    const objective = objectivesFor(4, 'f_fundamentals')[0];
    expect(objective.id).toBe('f_fundamentals__1');
    expect(objective.text).toBeTruthy();
  });
});
