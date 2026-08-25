import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS, tabToPath } from '../src/lib/routes';

const read = (path: string) => readFileSync(path, 'utf8');

describe('unified Teacher assessment notebook', () => {
  it('routes the unified notebook and preserves legacy assessment links', () => {
    expect(tabToPath('assessment_notebook')).toBe('/assessment-notebook');
    expect(pathToTab('/assessment-notebook')).toBe('assessment_notebook');
    expect(pathToTab('/assessment')).toBe('assessment_notebook');
    expect(pathToTab('/gradebook')).toBe('assessment_notebook');
    expect(ROLE_TABS.teacher).toContain('assessment_notebook');
    expect(ROLE_TABS.teacher).not.toContain('competency_assessment');
    expect(ROLE_TABS.teacher).not.toContain('gradebook');
  });

  it('uses persisted sessions and explicit null/unassessed UI values', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    expect(view).toContain('fetchTeacherAssessmentSessions');
    expect(view).toContain('createOrReuseTeacherAssessmentSession');
    expect(view).toContain('upsertTeacherStudentAssessment');
    expect(view).toContain('upsertTeacherCriterionResult');
    expect(view).toContain('غير مقوّم');
    expect(view).toContain('masteryLevel: null');
    expect(view).not.toContain("|| 'جيد'");
    expect(view).not.toContain("|| 'ممتاز'");
  });

  it('keeps planned-session context and manual sessions distinct', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    expect(view).toContain('classPlannedSessionId');
    expect(view).toContain('تقويم يدوي');
    expect(view).toContain('sessionType');
    expect(view).toContain('criterion:${session.gradeLevelId}');
    expect(view).toContain('academicYearId');
  });

  it('provides safe assessment entry links from planning and execution surfaces', () => {
    expect(read('src/components/planning/TeacherPlanningWorkspace.tsx')).toContain(
      '/assessment-notebook?classId='
    );
    expect(read('src/components/notebook/DailyNotebookView.tsx')).toContain('فتح التقويم');
    expect(read('src/components/lesson/LessonPlanView.tsx')).toContain('فتح دفتر التقويم');
    expect(read('src/components/lesson/LessonCommandCenterView.tsx')).toContain('onOpenAssessment');
  });

  it('uses one protected student history read for reports', () => {
    const router = read('src/server/apiRouter.ts');
    const api = read('src/services/api.ts');
    expect(router).toContain('/teacher/assessment-students/:studentId/history');
    expect(router).toContain("requireRole('teacher')");
    expect(api).toContain('fetchTeacherStudentAssessmentHistory');
  });
});
