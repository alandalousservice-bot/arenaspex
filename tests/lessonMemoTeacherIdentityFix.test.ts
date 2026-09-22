import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  autoGenerateLessonPlan,
  generateLessonMemoDocument,
} from '../src/services/lessonPlan.generator.service';
import { renderLessonMemoHtml } from '../src/services/lessonPlanExport.service';
import { buildLessonPlanDocx } from '../src/services/lessonPlanWordExport.service';
import { resolveLessonMemoTeacherIdentity } from '../src/services/lessonMemoGeneration.service';

const source = {
  referenceSessionId: 'identity-fix-reference',
  fieldId: 'f_fundamentals',
  fieldName: 'الميدان الثاني',
  finalCompetency: 'ينفذ وضعيات حركية متنوعة.',
  segmentGoal: 'ينفذ وضعيات حركية متنوعة.',
  sessionNumber: 1,
  globalNumber: 1,
  weekNumber: 1,
  type: 'تعلمية' as const,
  typeLabel: 'تعلمية 1',
  objective: 'ينفذ وضعيات حركية متنوعة.',
  tools: [],
};

describe('scheduled Lesson Memo teacher identity', () => {
  it('uses only the authenticated teacher profile and authoritative school relation', () => {
    const identity = resolveLessonMemoTeacherIdentity('teacher-a', {
      id: 'teacher-a',
      firstName: 'أحمد',
      lastName: 'اختبار',
      schoolName: 'legacy school',
      eduSchoolName: 'مدرسة QA المعتمدة',
    });
    expect(identity).toEqual({
      id: 'teacher-a',
      firstName: 'أحمد',
      lastName: 'اختبار',
      schoolName: 'مدرسة QA المعتمدة',
    });
    expect(() =>
      resolveLessonMemoTeacherIdentity('teacher-a', {
        id: 'teacher-b',
        firstName: 'اسم دخيل',
        lastName: 'مرفوض',
        eduSchoolName: 'مؤسسة دخيلة',
      })
    ).toThrow('MEMO_TEACHER_PROFILE_IDENTITY_MISMATCH');
  });

  it('renders correct server identity in print and DOCX, without null/undefined leakage', async () => {
    const teacher = resolveLessonMemoTeacherIdentity('teacher-a', {
      id: 'teacher-a',
      firstName: 'أحمد',
      lastName: 'اختبار',
      eduSchoolName: 'مدرسة QA المعتمدة',
    });
    const plan = autoGenerateLessonPlan(source, {
      teacher,
      levelName: 'السنة الأولى ابتدائي',
      durationMinutes: 45,
    });
    const model = generateLessonMemoDocument(plan);
    const html = renderLessonMemoHtml(model);
    expect(model.signatures.teacherName).toBe('أحمد اختبار');
    expect(model.header.institution).toBe('مدرسة QA المعتمدة');
    expect(html).toContain('أحمد اختبار');
    expect(html).toContain('مدرسة QA المعتمدة');
    expect(html).not.toMatch(/undefined|null/);

    const buffer = await (await import('docx')).Packer.toBuffer(buildLessonPlanDocx(plan));
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    expect(documentXml).toContain('أحمد اختبار');
    expect(documentXml).toContain('مدرسة QA المعتمدة');
    expect(documentXml).not.toMatch(/undefined|null/);
  });

  it('omits genuinely absent optional profile values instead of stringifying them', () => {
    const identity = resolveLessonMemoTeacherIdentity('teacher-a', {
      id: 'teacher-a',
      firstName: null,
      lastName: undefined,
      schoolName: null,
      eduSchoolName: null,
    });
    const plan = autoGenerateLessonPlan(source, {
      teacher: identity,
      levelName: 'السنة الأولى ابتدائي',
      durationMinutes: 45,
    });
    expect(plan.teacherName).toBe('');
    expect(plan.institutionName).toBe('');
    expect(plan.teacherName).not.toMatch(/undefined|null/);
  });
});
