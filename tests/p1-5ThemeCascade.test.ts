import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('P1-5 semantic theme cascade hardening', () => {
  it('defines semantic surface, text, action, border, and focus contracts', () => {
    const css = read('src/index.css');

    expect(css).toContain('--surface-default: var(--color-surface);');
    expect(css).toContain('--surface-muted: var(--color-surface-elevated);');
    expect(css).toContain('--surface-brand: var(--color-primary);');
    expect(css).toContain('--text-default: var(--color-text);');
    expect(css).toContain('--text-muted: var(--color-text-muted);');
    expect(css).toContain('--text-on-brand: #ffffff;');
    expect(css).toContain('--border-default: var(--color-border);');
    expect(css).toContain('--action-primary: var(--color-primary);');
    expect(css).toContain('--action-primary-hover: var(--color-primary-hover);');
    expect(css).toContain('--focus-ring: rgb(16 185 129 / 0.35);');
    expect(css).toContain('.action-primary:focus-visible');
  });

  it('removes the broad blue, indigo, and purple utility remapping selectors', () => {
    const css = read('src/index.css');
    expect(css).not.toMatch(
      /\[class\*='(?:text|bg|border|from|to|hover|focus|ring).*?(?:blue|indigo|purple)/
    );
    expect(css).not.toContain('.app-shell .text-blue-');
    expect(css).not.toContain(".workspace-page [class*='text-blue-']");
    expect(css).not.toContain(".workspace-page [class*='bg-blue-600']");
    expect(css).toContain('.workspace-page .workspace-tab-active');
    expect(css).toContain('.workspace-page .workspace-progress-fill');
  });

  it('preserves semantic status colors instead of aliasing them to the brand', () => {
    const css = read('src/index.css');
    expect(css).toContain('.app-shell .bg-rose-600');
    expect(css).toContain('.app-shell .bg-amber-600');
    expect(css).toContain('background-color: var(--color-danger) !important');
    expect(css).toContain('background-color: var(--color-warning) !important');
    expect(css).toContain('.workspace-page .workspace-button-danger');
  });

  it('keeps brand actions explicit in active workspace components', () => {
    for (const file of [
      'src/components/notebook/DailyNotebookView.tsx',
      'src/components/planning/TeacherPlanningWorkspace.tsx',
      'src/components/curriculum/LearningSegmentsView.tsx',
      'src/components/lesson/LessonPlanView.tsx',
      'src/components/settings/SettingsView.tsx',
      'src/components/dashboard/InspectorWorkspacePage.tsx',
      'src/components/gradebook/GradebookWeightsDialog.tsx',
      'src/components/reports/ReportsView.tsx',
      'src/components/schedule/WeeklyScheduleView.tsx',
    ]) {
      expect(read(file)).toContain('action-primary');
    }
    expect(read('src/components/reports/ReportsView.tsx')).toContain('workspace-tab-active');
    expect(read('src/components/curriculum/AnnualScheduleView.tsx')).toContain(
      'workspace-level-selector is-selected'
    );
    expect(read('src/components/curriculum/AnnualScheduleView.tsx')).toContain(
      'workspace-tab-active'
    );
    expect(read('src/components/gradebook/SmartGradebookView.tsx')).toContain(
      'workspace-tab-active'
    );
  });

  it('keeps P1-3 print isolation and P1-4 dialog contracts intact', () => {
    const css = read('src/index.css');
    expect(css).toContain('.learning-section-print-root');
    expect(css).toContain('@media print');
    expect(css).toContain('print-color-adjust: exact');
    expect(read('src/components/gradebook/SmartGradebookView.tsx')).toContain(
      'useAccessibleDialog'
    );
    expect(read('src/components/curriculum/LearningSectionPrintPreviewDialog.tsx')).toContain(
      'aria-modal="true"'
    );
  });
});
