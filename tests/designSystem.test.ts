import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('ArenaSpex Emerald design system', () => {
  it('defines centralized screen theme tokens without changing print geometry', () => {
    const css = read('src/index.css');

    for (const token of [
      '--color-primary',
      '--color-primary-hover',
      '--color-primary-soft',
      '--color-secondary',
      '--color-accent',
      '--color-background',
      '--color-surface',
      '--color-surface-elevated',
      '--color-border',
      '--color-text',
      '--color-text-muted',
      '--color-success',
      '--color-warning',
      '--color-danger',
      '--color-info',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--shadow-sm',
      '--shadow-md',
      '--transition-fast',
      '--transition-normal',
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('@media screen');
    expect(css).toContain('@media print');
    expect(css).toContain('print-color-adjust: exact');
    expect(css).toContain('.annual-plan-print-root');
    expect(css).toContain('.daily-notebook-print-root');
  });

  it('applies the shell identity to the shared role navigation', () => {
    expect(read('src/App.tsx')).toContain('className="app-shell');
    expect(read('src/components/layout/Header.tsx')).toContain('bg-emerald-700');
    expect(read('src/components/layout/Sidebar.tsx')).toContain('app-shell-sidebar');
    expect(read('src/components/layout/Sidebar.tsx')).toContain('bg-emerald-700 text-white');
  });

  it('marks internal workspaces with reusable presentation primitives', () => {
    const roots = [
      ['src/components/dashboard/TeacherDashboard.tsx', 'workspace-page--dashboard'],
      ['src/components/planning/TeacherPlanningWorkspace.tsx', 'workspace-page--planning'],
      ['src/components/notebook/DailyNotebookView.tsx', 'workspace-page--daily-notebook'],
      ['src/components/knowledge/KnowledgeEngineView.tsx', 'workspace-page--knowledge'],
      ['src/components/students/StudentsBookView.tsx', 'workspace-page--students'],
      ['src/components/attendance/AttendanceBookView.tsx', 'workspace-page--attendance'],
      ['src/components/gradebook/SmartGradebookView.tsx', 'workspace-page--gradebook'],
      ['src/components/chat/DistrictChatView.tsx', 'workspace-page--communication'],
      ['src/components/reports/ReportsView.tsx', 'workspace-page--reports'],
      ['src/components/settings/SettingsView.tsx', 'workspace-page--settings'],
      ['src/components/dashboard/InspectorDashboard.tsx', 'workspace-page--inspector'],
    ] as const;

    for (const [file, rootClass] of roots) expect(read(file)).toContain(rootClass);
    expect(read('src/index.css')).toContain('.workspace-header');
    expect(read('src/index.css')).toContain('.workspace-tabs');
    expect(read('src/index.css')).toContain('.workspace-progress');
    expect(read('src/index.css')).toContain(".workspace-page [class*='bg-gradient-to-']");
  });

  it('keeps the emerald workspace polish inside screen media rules', () => {
    const css = read('src/index.css');
    const screenStart = css.indexOf('@media screen');
    const printStart = css.indexOf('@media print');
    const screenCss = css.slice(screenStart, printStart);

    expect(screenStart).toBeGreaterThanOrEqual(0);
    expect(printStart).toBeGreaterThan(screenStart);
    expect(screenCss).toContain('.workspace-page');
    expect(screenCss).toContain('background-image: none !important');
    expect(css.slice(printStart)).toContain('print-color-adjust: exact');
  });

  it('isolates academic-year numerals from RTL reordering', () => {
    const component = read('src/components/common/AcademicYearLabel.tsx');
    expect(component).toContain('dir="ltr"');
    expect(component).toContain("unicodeBidi: 'isolate'");
    expect(read('src/components/curriculum/AnnualPlanView.tsx')).toContain('AcademicYearLabel');
    expect(read('src/components/curriculum/AnnualDistributionCalendar.tsx')).toContain(
      'AcademicYearLabel'
    );
  });

  it('keeps final workspace controls and states presentation-only', () => {
    const annualPlan = read('src/components/curriculum/AnnualPlanView.tsx');
    const annualDistribution = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    const notebook = read('src/components/notebook/DailyNotebookView.tsx');
    const knowledge = read('src/components/knowledge/KnowledgeEngineView.tsx');

    expect(annualPlan).toContain('workspace-button-primary');
    expect(annualPlan).toContain('workspace-level-selector');
    expect(annualDistribution).toContain('annual-distribution-summary-card');
    expect(annualDistribution).toContain('workspace-button-outline');
    expect(notebook).toContain('workspace-empty-state');
    expect(notebook).toContain('workspace-progress-fill');
    expect(knowledge).toContain('workspace-button-primary');
    expect(knowledge).toContain('knowledge-engine-title-en');
  });
});
