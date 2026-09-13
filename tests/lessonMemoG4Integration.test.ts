import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  selectEducationalSituations,
  snapshotSituation,
} from '../src/services/educationalSituation.selector.service';

const situation = (overrides: Record<string, unknown> = {}) => ({
  id: 'g4-situation-1',
  name: 'موقف اختباري',
  grade: 1,
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  objectiveIds: ['objective-1'],
  objectiveTexts: ['هدف اختباري'],
  sourceGoal: 'الاستجابة للإشارة',
  organization: 'أفواج صغيرة',
  equipment: ['أقماع'],
  origin: 'REFERENCE_SEED' as const,
  status: 'APPROVED' as const,
  approvalStatus: 'APPROVED' as const,
  productionEligibility: 'AUTO_GENERATION_ELIGIBLE' as const,
  successCriteria: 'ينفذ المتعلم المسار دون تجاوز.',
  observationIndicators: 'السرعة والدقة.',
  ...overrides,
});

describe('ربط بنك المواقف بمسار مذكرة الحصة — G4', () => {
  it('يحفظ لقطة الموقف داخل المذكرة مع عناصر التنفيذ والتقويم', () => {
    const snapshot = snapshotSituation(situation() as any);
    expect(snapshot.situationId).toBe('g4-situation-1');
    expect(snapshot.successCriteria).toBe('ينفذ المتعلم المسار دون تجاوز.');
    expect(snapshot.observationIndicators).toBe('السرعة والدقة.');
  });

  it('لا يحول الموقف الداعم إلى اختيار تعلمي مباشر عند غياب المباشر', () => {
    const result = selectEducationalSituations(
      [situation({ relationTypes: ['SUPPORTIVE'] }) as any],
      {
        gradeId: 1,
        domainId: 'f_locomotion',
        lessonType: 'LEARNING',
        objectiveIds: ['objective-1'],
      }
    );
    expect(result.selectedSituations).toHaveLength(0);
    expect(result.failureCode).toBe('NO_DIRECT_MATCH');
  });

  it('يعرض التغطية ويفتح المرشحين من نفس الميدان عند الحاجة', () => {
    const source = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
    expect(source).toContain('تغطية الموقف داخل المذكرة');
    expect(source).toContain('مرشحون من نفس المستوى والميدان');
    expect(source).toContain('مرشح للمراجعة');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('situationSnapshot: snapshotSituation(situation)');
  });
});
