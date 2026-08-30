import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('authenticated workspace visual regressions', () => {
  it('uses explicit light foregrounds for the Dashboard dark Emerald hero', () => {
    const css = read('src/index.css');
    const hero = read('src/components/dashboard/teacher/TeacherHeroBanner.tsx');
    const screenStart = css.indexOf('@media screen');
    const printStart = css.indexOf('@media print');
    const screenCss = css.slice(screenStart, printStart);

    expect(hero).toContain('workspace-hero-academic-badge');
    expect(hero).toContain('workspace-hero-secondary');
    expect(hero).toContain('workspace-hero-metadata');
    expect(hero).toContain('workspace-hero-link');
    expect(screenCss).toContain('.workspace-page--dashboard .workspace-hero h2');
    expect(screenCss).toContain('color: rgb(255 255 255 / 0.86) !important');
    expect(screenCss).toContain('color: rgb(255 255 255 / 0.76) !important');
    expect(screenCss).toContain('background-color: rgb(255 255 255 / 0.16) !important');
    expect(
      screenCss.indexOf('.workspace-page--dashboard .workspace-hero .workspace-hero-secondary')
    ).toBeGreaterThan(screenCss.indexOf(".workspace-hero [class*='text-blue-']"));
  });

  it('keeps Students header actions labeled, wired, and free of empty layout controls', () => {
    const students = read('src/components/students/StudentsBookView.tsx');
    const css = read('src/index.css');
    const screenCss = css.slice(css.indexOf('@media screen'), css.indexOf('@media print'));

    expect(students).toContain('students-book-actions');
    expect(students).toContain('إضافة قسم جديد');
    expect(students).toContain('إضافة تلميذ للقسم');
    expect(students).toContain('استيراد قائمة التلاميذ');
    expect(students).toContain('طباعة الدفتر الحالى');
    expect(students).toContain('setShowAddClassModal(true)');
    expect(students).toContain('setShowAddStudentModal(true)');
    expect(students).toContain('handleRosterFile');
    expect(students).toContain('window.print()');
    expect(students).toContain('data-students-action="add-class"');
    expect(students).toContain('data-students-action="add-student"');
    expect(students).toContain('data-students-action="import-roster"');
    expect(students).toContain('data-students-action="print-roster"');
    expect(students).not.toMatch(/students-book-actions[\s\S]*?<button[^>]*>\s*<\/button>/);
    expect(students).not.toMatch(/students-book-actions[\s\S]*?<label[^>]*>\s*<\/label>/);
    expect(screenCss).not.toContain('.students-book-actions > button:empty');
    expect(screenCss).not.toContain('.students-book-actions > label:empty');
  });

  it('treats Planning loading as a bounded route fallback with reachable errors', () => {
    const app = read('src/App.tsx');
    const planning = read('src/components/planning/TeacherPlanningWorkspace.tsx');

    expect(app).toContain("import('./components/planning/TeacherPlanningWorkspace')");
    expect(app).toContain('<Suspense fallback={<ViewFallback />}>');
    expect(app).toContain('جارٍ تحميل الواجهة...');
    expect(planning).toContain('fetchTeacherPlanningSessions');
    expect(planning).toContain('fetchTeacherAnnualDistribution');
    expect(planning).toContain(
      "setError(reason instanceof Error ? reason.message : 'تعذر تحميل التوزيع.')"
    );
    expect(planning).toContain('finally');
    expect(planning).toContain('setLoading(false)');
  });

  it('keeps print typography and document rules outside the screen regression fixes', () => {
    const css = read('src/index.css');
    const printCss = css.slice(css.indexOf('@media print'));

    expect(printCss).toContain('font-family: Tahoma, Arial, sans-serif');
    expect(printCss).toContain('font-family: Cairo, Tahoma, Arial, sans-serif');
    expect(printCss).not.toContain('workspace-hero-secondary');
    expect(printCss).not.toContain('students-book-actions > button:empty');
  });
});
