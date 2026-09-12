import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  autoGenerateLessonPlan,
  validateLessonPlanTiming,
} from '../src/services/lessonPlan.generator.service';
import {
  generateLessonMemoDraft,
  regenerateLessonMemo,
  saveLessonMemo,
} from '../src/services/lessonMemoGeneration.service';
import type { LessonPlan, User } from '../src/types/spex';

const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const workflow = readFileSync('src/services/lessonPlanWorkflow.service.ts', 'utf8');

const teacher = {
  id: 'teacher-g4-workspace',
  username: 'teacher-g4-workspace',
  spexId: 'SPX-G4-WORKSPACE',
  firstName: 'اختبار',
  lastName: 'المذكرة',
  email: 'memo-g4@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
  status: 'active',
} as User;

const source = {
  referenceSessionId: 'ref-g4-workspace',
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  finalCompetency: 'ينجز وضعيات حركية منظمة.',
  segmentGoal: 'هدف الحصة',
  sessionNumber: 1,
  globalNumber: 4,
  weekNumber: 2,
  type: 'تعلمية' as const,
  typeLabel: 'تعلمية 1',
  objective: 'ينجز تنقلات منظمة داخل مسار.',
  objectiveId: 'objective-g4-workspace',
  objectiveGroupId: 'group-g4-workspace',
  tools: ['أقماع'],
};

describe('MEMO-G4 teacher workspace contract', () => {
  it('keeps the Daily Notebook action state tied to the operational session', () => {
    expect(notebook).toContain('memoBySession.has(session.id)');
    expect(notebook).toContain('{memoStatusLabel(memoPlan)}');
    expect(notebook).toContain('memoExists ? (');
    expect(notebook).toContain('classPlannedSessionId=${encodeURIComponent(session.id)}');
    expect(workflow).toContain('plan.classPlannedSessionId === session.id');
  });

  it('does not generate while the memo workspace is merely loading', () => {
    expect(view).toContain("if (memoMode === 'operational')");
    expect(view).toContain('onClick={createPlan}');
    expect(view).toContain('generateLessonMemoDraft(');
    expect(view).toContain('setShowGenerator(false)');
  });

  it('shows teacher-facing status, warning, manual fallback, and regeneration controls', () => {
    expect(view).toContain('مسودة مولدة');
    expect(view).toContain('معدلة');
    expect(view).toContain('warning.message');
    expect(view).toContain('اختيار المواقف يدويًا');
    expect(view).toContain('إعادة توليد المذكرة');
    expect(view).toContain('سيؤدي ذلك إلى استبدال التعديلات الحالية');
    expect(view).not.toContain('<span>{warning.code}</span>');
  });

  it('uses exact operational timing validation for 45, 60, and 90 minutes', () => {
    const rows = (minutes: number) => [
      {
        id: 'p',
        phase: 'المرحلة التحضيرية' as const,
        learningContent: '',
        executionContent: '',
        durationMinutes: Math.round(minutes * 0.17),
        guidance: '',
      },
      {
        id: 'm',
        phase: 'المرحلة الرئيسية' as const,
        learningContent: '',
        executionContent: '',
        durationMinutes: minutes - Math.round(minutes * 0.17) - Math.round(minutes * 0.17),
        guidance: '',
      },
      {
        id: 'f',
        phase: 'المرحلة الختامية' as const,
        learningContent: '',
        executionContent: '',
        durationMinutes: Math.round(minutes * 0.17),
        guidance: '',
      },
    ];
    expect(validateLessonPlanTiming(rows(45), 45).valid).toBe(true);
    expect(validateLessonPlanTiming(rows(60), 60).valid).toBe(true);
    expect(validateLessonPlanTiming(rows(90), 90).valid).toBe(true);
    expect(validateLessonPlanTiming(rows(60), 45).valid).toBe(false);
    expect(view).toContain('لا يمكن حفظ المذكرة: مجموع أزمنة الصفوف');
  });

  it('does not create unrelated fallback content when automatic selection fails', () => {
    const plan = autoGenerateLessonPlan(source, {
      teacher,
      classId: 'class-g4-workspace',
      academicYearId: '2026-2027',
      classPlannedSessionId: 'cps-g4-workspace',
      levelName: 'السنة الرابعة ابتدائي',
      durationMinutes: 90,
      date: '2026-10-04',
      situations: [],
    });
    expect(plan.generationWarnings?.map((warning) => warning.code)).toContain(
      'NO_ELIGIBLE_SITUATION'
    );
    expect(plan.lessonRows?.some((row) => row.learningContent.includes('اختيار موقف تربوي'))).toBe(
      true
    );
    expect(
      plan.lessonRows?.every((row) => !row.executionContent.includes('ينفذ كل متعلم الحركة'))
    ).toBe(true);
  });

  it('keeps snapshots local to the saved memo and preserves exact identity on save', () => {
    const plan = generateLessonMemoDraft({
      teacher,
      classId: 'class-g4-workspace',
      academicYearId: '2026-2027',
      classPlannedSessionId: 'cps-g4-workspace',
      source,
      levelName: 'السنة الرابعة ابتدائي',
      plannedDate: '2026-10-04',
      durationMinutes: 90,
      situations: [],
    });
    const saved = saveLessonMemo({ ...plan, teacherNotes: 'ملاحظة محفوظة', manualEdits: true });
    expect(saved.classPlannedSessionId).toBe('cps-g4-workspace');
    expect(saved.teacherNotes).toBe('ملاحظة محفوظة');
    expect(() =>
      saveLessonMemo({ ...saved, classPlannedSessionId: 'another-session' }, saved)
    ).toThrow('MEMO_PERSISTENCE_IDENTITY_CONFLICT');
  });

  it('requires confirmation only for edited memos and replaces explicitly', () => {
    const existing = {
      id: 'lp-g4-workspace',
      teacherId: teacher.id,
      classId: 'class-g4-workspace',
      academicYearId: '2026-2027',
      classPlannedSessionId: 'cps-g4-workspace',
      manualEdits: true,
    } as LessonPlan;
    const context = {
      teacher,
      classId: 'class-g4-workspace',
      academicYearId: '2026-2027',
      classPlannedSessionId: 'cps-g4-workspace',
      source,
      levelName: 'السنة الرابعة ابتدائي',
      plannedDate: '2026-10-04',
      durationMinutes: 90,
      situations: [],
    };
    expect(() => regenerateLessonMemo(context, existing)).toThrow(
      'REGENERATION_CONFIRMATION_REQUIRED'
    );
    expect(regenerateLessonMemo(context, existing, true).id).toBe('lp_session_cps-g4-workspace');
  });

  it('keeps the saved memo data ready for current print/export consumers', () => {
    expect(view).toContain('generateLessonMemoDocument');
    expect(view).toContain('المراحل');
    expect(view).toContain('محتوى الإنجاز');
    expect(view).toContain('teacherNotes');
    expect(view).toContain('exportLessonPlanToPdf(plan)');
    expect(view).toContain('handleWordExport(plan)');
  });
});
