import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';

const read = (path: string) => readFileSync(path, 'utf8');

describe('unified Teacher assessment notebook', () => {
  it('routes the unified notebook and preserves legacy assessment links', () => {
    expect(pathToTab('/assessment-notebook')).toBe('gradebook');
    expect(pathToTab('/assessment')).toBe('gradebook');
    expect(pathToTab('/gradebook')).toBe('gradebook');
    expect(ROLE_TABS.teacher).toContain('gradebook');
    expect(ROLE_TABS.teacher).not.toContain('competency_assessment');
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
    const planning = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    expect(planning).toContain('AnnualDistributionCalendar');
    expect(planning).toContain('onNavigateToCalendar');
    expect(read('src/components/notebook/DailyNotebookView.tsx')).toContain('فتح التقويم');
    expect(read('src/components/lesson/LessonPlanView.tsx')).toContain('فتح دفتر التقويم');
    expect(read('src/components/lesson/LessonCommandCenterView.tsx')).toContain('onOpenAssessment');
  });

  it('removes the retired combined notebook entry from the Gradebook workspace', () => {
    const sidebar = read('src/components/layout/Sidebar.tsx');
    const gradebook = read('src/components/gradebook/SmartGradebookView.tsx');
    const app = read('src/App.tsx');
    expect(sidebar).not.toContain("id: 'assessment_notebook'");
    expect(sidebar).not.toContain("id: 'competency_assessment'");
    expect(gradebook).not.toContain("workspaceSection === 'assessment'");
    expect(gradebook).not.toContain('AssessmentNotebookView');
    expect(gradebook).not.toContain('spex_grade_records_');
    expect(gradebook).not.toContain('دفتر التقويم والكفاءات والحضور');
    expect(gradebook).not.toContain('دفتر الغياب والمواظبة');
    expect(gradebook).toContain('دفتر التنقيط الذكي');
    expect(gradebook).not.toContain('دفتر المعفيين طبياً');
    expect(gradebook).not.toContain('previewStudentRoster');
    expect(app).not.toContain('CompetencyAssessmentView');
  });

  it('redirects the legacy route to the canonical Gradebook without the retired workspace query', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("location.pathname === '/assessment-notebook'");
    expect(app).toContain("location.pathname === '/gradebook'");
    expect(app).toContain(
      "navigate('/attendance' + (query ? '?' + query : ''), { replace: true })"
    );
    expect(app).toContain("params.delete('section')");
    expect(app).toContain("params.delete('workspace')");
    expect(app).toContain("navigate('/gradebook' + (query ? '?' + query : ''), { replace: true })");
    expect(app).toContain("params.set('section', 'competency')");
    expect(app).not.toContain("params.set('workspace', 'assessment')");
  });

  it('uses one protected student history read for reports', () => {
    const router = read('src/server/apiRouter.ts');
    const api = read('src/services/api.ts');
    expect(router).toContain('/teacher/assessment-students/:studentId/history');
    expect(router).toContain("requireRole('teacher')");
    expect(api).toContain('fetchTeacherStudentAssessmentHistory');
  });
});
