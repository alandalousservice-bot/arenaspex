import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';

const read = (path: string) => readFileSync(path, 'utf8');

describe('unified Teacher assessment notebook', () => {
  it('routes the unified notebook and preserves legacy assessment links', () => {
    expect(pathToTab('/assessment-notebook')).toBe('assessment_notebook');
    expect(pathToTab('/assessment')).toBe('gradebook');
    expect(pathToTab('/gradebook')).toBe('gradebook');
    expect(ROLE_TABS.teacher).toContain('gradebook');
    expect(ROLE_TABS.teacher).toContain('assessment_notebook');
  });

  it('uses persisted sessions and explicit null/unassessed UI values', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    expect(view).toContain('fetchTeacherAssessmentSessions');
    expect(view).toContain('createOrReuseTeacherAssessmentSession');
    expect(view).toContain('upsertTeacherStudentAssessment');
    expect(view).toContain('upsertTeacherCriterionResult');
    expect(view).toContain('غير مقوّم');
    expect(view).toContain('calculateAssessmentMastery(draft.criteria)');
    expect(view).not.toContain("|| 'جيد'");
    expect(view).not.toContain("|| 'ممتاز'");
  });

  it('keeps planned-session context and manual sessions distinct', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    expect(view).toContain('classPlannedSessionId');
    expect(view).toContain('تقويم يدوي');
    expect(view).toContain('sessionType');
    expect(view).toContain('canonicalCriteria');
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
    expect(sidebar).toContain("id: 'assessment_notebook'");
    expect(sidebar).toContain('دفتر تقويم الكفاءات');
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

  it('keeps the competency notebook as a first-class route while preserving legacy redirects', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('AssessmentNotebookView');
    expect(app).toContain(
      "navigate('/attendance' + (query ? '?' + query : ''), { replace: true })"
    );
    expect(app).toContain("params.delete('section')");
    expect(app).toContain("params.delete('workspace')");
    expect(app).not.toContain(
      "navigate('/gradebook' + (query ? '?' + query : ''), { replace: true });\n      return;\n    }\n    const legacyPlanningSection"
    );
  });

  it('uses one protected student history read for reports', () => {
    const router = read('src/server/apiRouter.ts');
    const api = read('src/services/api.ts');
    expect(router).toContain('/teacher/assessment-students/:studentId/history');
    expect(router).toContain("requireRole('teacher')");
    expect(api).toContain('fetchTeacherStudentAssessmentHistory');
  });

  it('provides an individual canonical competency grid over the persisted class results', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    expect(view).toContain('شبكة تقويم الكفاءة الختامية للتلميذ');
    expect(view).toContain('شبكة التلميذ');
    expect(view).toContain('role="dialog"');
    expect(view).toContain('aria-labelledby="individual-competency-grid-title"');
    expect(view).toContain('canonicalCriteria.map');
    expect(view).toContain('assessmentCatalog?.indicators');
    expect(view).toContain('upsertTeacherCriterionResult');
    expect(view).toContain('saveStudent(selectedStudent)');
    expect(view).toContain('مكتمل');
    expect(view).toContain('غير مكتمل');
    expect(view).not.toContain('C1');
    expect(view).not.toContain('C2');
    expect(view).not.toContain('C3');
    expect(view).not.toContain('C4');
  });
});
