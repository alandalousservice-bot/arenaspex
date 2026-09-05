import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_SMART_GRADEBOOK_WEIGHTS,
  SMART_GRADEBOOK_RATING_MULTIPLIERS,
  calculateSmartSuggestedMark,
  smartGradeRecordKey,
} from '../src/services/smartGradebook.adapter';

const read = (file: string) => readFileSync(file, 'utf8');
const view = read('src/components/gradebook/SmartGradebookView.tsx');
const weightsDialog = read('src/components/gradebook/GradebookWeightsDialog.tsx');
const wrapper = read('src/components/gradebook/GradebookView.tsx');
const adapter = read('src/services/smartGradebook.adapter.ts');

describe('literal Smart Gradebook restoration', () => {
  it('keeps the old visual and interaction vocabulary', () => {
    const gradebookSurface = `${view}\n${weightsDialog}`;
    for (const label of [
      'دفتر التنقيط الذكي',
      'الفصل الأول',
      'الفصل الثاني',
      'الفصل الثالث',
      'السلوك والانضباط',
      'المشاركة الفعالة',
      'تملك الكفاءة الختامية',
      'المواظبة والحضور',
      'العلامة المقترحة / 10',
      'العلامة النهائية / 10',
      'تعديل أوزان التقييم',
      'سجل التعديلات والشفافية',
      'إعادة الحساب الذكي',
      'طباعة الدفتر الحالى',
    ]) {
      expect(gradebookSurface).toContain(label);
    }
    expect(view).not.toContain('AssessmentNotebookView');
    expect(view).not.toContain('دفتر الغياب والمواظبة');
    expect(view).not.toContain('دفتر المعفيين طبياً');
    expect(view).not.toContain('النوادي');
    expect(wrapper).toContain('SmartGradebookView as GradebookView');
  });

  it('preserves the old default weights and exact rating multipliers', () => {
    expect(DEFAULT_SMART_GRADEBOOK_WEIGHTS).toEqual({
      competencyWeight: 5,
      participationWeight: 2,
      behaviorWeight: 2,
      attendanceWeight: 1,
      unexcusedDeduction: 0.25,
    });
    expect(SMART_GRADEBOOK_RATING_MULTIPLIERS).toMatchObject({
      ممتاز: 1,
      جيد: 0.85,
      متوسط: 0.65,
      ضعيف: 0.4,
      'تمكن ممتاز': 1,
      'تمكن جيد': 0.85,
      'تمكن متوسط': 0.65,
      'تمكن جزئي': 0.45,
    });
    expect(weightsDialog).toContain('المجموع = 10');
  });

  it('reproduces the old suggested-mark formula and rounding', () => {
    expect(
      calculateSmartSuggestedMark(
        {
          behaviorRating: 'ممتاز',
          participationRating: 'ممتاز',
          competencyRating: 'تمكن ممتاز',
          unexcusedAbsencesCount: 0,
        },
        DEFAULT_SMART_GRADEBOOK_WEIGHTS
      )
    ).toBe(10);
    expect(
      calculateSmartSuggestedMark(
        {
          behaviorRating: 'جيد',
          participationRating: 'متوسط',
          competencyRating: 'تمكن جزئي',
          unexcusedAbsencesCount: 3,
        },
        DEFAULT_SMART_GRADEBOOK_WEIGHTS
      )
    ).toBe(5.5);
    expect(
      calculateSmartSuggestedMark(
        { behaviorRating: 'ممتاز', participationRating: 'ممتاز' },
        DEFAULT_SMART_GRADEBOOK_WEIGHTS
      )
    ).toBeNull();
  });

  it('keeps fresh students unassessed and isolates records by class, student, and term', () => {
    expect(view).toContain('suggestedMark: null');
    expect(view).toContain('finalMark: null');
    expect(smartGradeRecordKey('class-a', 'الفصل الأول', 'student-1')).not.toBe(
      smartGradeRecordKey('class-a', 'الفصل الثاني', 'student-1')
    );
    expect(smartGradeRecordKey('class-a', 'الفصل الأول', 'student-1')).not.toBe(
      smartGradeRecordKey('class-b', 'الفصل الأول', 'student-1')
    );
    expect(view).toContain('newFinalMark: updates.finalMark');
    expect(view).toContain('setAuditLogs(nextAuditLogs)');
  });

  it('uses current roster, attendance, and PostgreSQL assessment APIs through the adapter', () => {
    expect(view).toContain('student.classId === activeClass.id');
    expect(view).toContain('loadSmartGradebookData');
    expect(view).toContain('saveSmartGradebookRecord');
    expect(adapter).toContain('fetchTeacherAssessmentSessions');
    expect(adapter).toContain('fetchTeacherAssessmentSession');
    expect(adapter).toContain('upsertTeacherStudentAssessment');
    expect(adapter).toContain('fetchTeacherStudentAttendanceSummary');
    expect(adapter).not.toContain('localStorage');
  });
});
