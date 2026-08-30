import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('Lesson Memo session-first workspace presentation', () => {
  it('renders a planned-session workspace with the existing operational source', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const api = read('src/services/api.ts');

    expect(view).toContain('مذكرات الحصص');
    expect(view).toContain('الوثائق التنفيذية');
    expect(view).toContain('الحصص المبرمجة والمذكرات');
    expect(view).toContain(
      'fetchTeacherPlanningSessions(operationalClassId, operationalAcademicYearId)'
    );
    expect(view).toContain(
      "findOperationalLessonPlan(lessonPlans, session, currentUser?.id || '')"
    );
    expect(view).toContain('إنشاء المذكرة');
    expect(view).toContain('فتح المذكرة');
    expect(api).toContain('/api/teacher/planning/classes/');
  });

  it('keeps teacher-visible labels human-readable and bidi-safe', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');

    expect(view).toContain('formatAcademicYearLabel');
    expect(view).toContain(
      '<bdi dir="ltr">{formatAcademicYearLabel(operationalAcademicYearId)}</bdi>'
    );
    expect(view).toContain('formatLessonDate');
    expect(view).toContain('`${day} / ${month} / ${year}`');
    expect(view).not.toContain('{item.name} — {item.levelName || item.levelId}');
    expect(view).not.toContain('lvl_p1</option>');
  });

  it('preserves exact session context and duplicate protection', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const workflow = read('src/services/lessonPlanWorkflow.service.ts');
    const dailyNotebook = read('src/components/notebook/DailyNotebookView.tsx');
    const commandCenter = read('src/components/lesson/LessonCommandCenterView.tsx');
    const app = read('src/App.tsx');

    expect(view).toContain("query.get('classPlannedSessionId')");
    expect(view).toContain('classPlannedSessionId: operationalContext?.session.id');
    expect(view).toContain('referenceSessionId: operationalContext?.session.referenceSessionId');
    expect(workflow).toContain('plan.classPlannedSessionId === session.id');
    expect(dailyNotebook).toContain('/lesson-plans?classId=');
    expect(dailyNotebook).toContain('classPlannedSessionId=${encodeURIComponent(session.id)}');
    expect(commandCenter).toContain('onNavigateToLessonPlans');
    expect(app).toContain('activeLessonSession?.classPlannedSessionId');
    expect(app).toContain('window.location.assign(`/lesson-plans?${params.toString()}`)');
  });

  it('keeps standalone mode and official print rendering separate', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const print = read('src/services/lessonPlanExport.service.ts');

    expect(view).toContain("useState<LessonMemoMode>('operational')");
    expect(view).toContain('مذكرة مستقلة');
    expect(view).toContain('هذه المذكرة غير مرتبطة بحصة مبرمجة في الكراس اليومي.');
    expect(view).toContain('exportLessonPlanToPdf(plan)');
    expect(view).toContain('exportLessonPlanToWord(plan)');
    expect(print).toContain('exportLessonPlanToPdf');
  });
});
