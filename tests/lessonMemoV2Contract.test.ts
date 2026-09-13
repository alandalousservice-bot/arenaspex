import { describe, expect, it } from 'vitest';
import {
  createIndependentLessonPlan,
  type IndependentLessonMemoInput,
} from '../src/services/lessonPlan.generator.service';
import type { User } from '../src/types/spex';

const teacher = {
  id: 'teacher-v2',
  firstName: 'أستاذ',
  lastName: 'اختبار',
  schoolName: 'مؤسسة اختبار',
} as User;

const input: IndependentLessonMemoInput = {
  teacher,
  levelName: 'السنة الرابعة ابتدائي',
  fieldId: 'f_locomotion',
  fieldName: 'الميدان الأول: الوضعيات والتنقلات',
  sessionType: 'تعلمية',
  objective: 'تنفيذ تنقلات متدرجة مع تغيير الاتجاه.',
  learningContent: 'التنقل وتغيير الاتجاه.',
  executionContent: 'ينفذ المتعلمون المسار حسب الإشارة.',
  successCriteria: 'إتمام المسار باحترام الإشارة.',
  observationIndicators: 'التحكم في السرعة والتوازن.',
  equipment: ['أقماع', 'كرات'],
  durationMinutes: 45,
  teacherNotes: 'مراعاة الفروق الفردية.',
};

describe('MEMO-V2 independent generation contract', () => {
  it('creates a free teacher-authored memo without operational identity', () => {
    const plan = createIndependentLessonPlan(input);

    expect(plan.memoSource).toBe('standalone');
    expect(plan.classId).toBeUndefined();
    expect(plan.classPlannedSessionId).toBeUndefined();
    expect(plan.referenceSessionId).toBeUndefined();
    expect(plan.dailyNotebookEntryId).toBeUndefined();
    expect(plan.executionStatus).toBeUndefined();
    expect(plan.generalObjective).toContain('تنفيذ تنقلات');
    expect(plan.learningContent).toBe(input.learningContent);
    expect(plan.executionInstructions).toBe(input.executionContent);
    expect(plan.successCriteria).toBe(input.successCriteria);
    expect(plan.observationIndicators).toBe(input.observationIndicators);
    expect(plan.teacherNotes).toBe(input.teacherNotes);
    expect(plan.lessonRows.map((row) => row.durationMinutes)).toEqual([10, 30, 5]);
  });

  it('keeps independent records distinct and provider-neutral', () => {
    const first = createIndependentLessonPlan(input);
    const second = createIndependentLessonPlan({ ...input, teacherNotes: 'ملاحظة ثانية.' });

    expect(first.id).not.toBe(second.id);
    expect(first.aiGenerated).toBe(false);
    expect(JSON.stringify(first)).not.toMatch(/ChatGPT|Gemini|OpenAI|AI provider/i);
  });
});
