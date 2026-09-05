import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('P2-1 screen typography normalization', () => {
  it('removes audited micro-type and heavy-weight utilities from active workspaces', () => {
    const normalizedFiles = [
      'src/components/layout/Header.tsx',
      'src/components/students/StudentsBookView.tsx',
      'src/components/gradebook/SmartGradebookView.tsx',
      'src/components/notebook/DailyNotebookView.tsx',
      'src/components/knowledge/KnowledgeEngineView.tsx',
      'src/components/settings/SettingsView.tsx',
      'src/components/attendance/AttendanceBookView.tsx',
      'src/components/planning/TeacherPlanningWorkspace.tsx',
      'src/components/dashboard/teacher/DailyScheduleList.tsx',
      'src/components/dashboard/teacher/QuickAccessPanel.tsx',
      'src/components/dashboard/teacher/TeacherHeroBanner.tsx',
      'src/components/dashboard/teacher/TeacherKpiGrid.tsx',
    ];

    for (const file of normalizedFiles) {
      const source = read(file);
      expect(source, file).not.toMatch(/text-\[(10|11)px\]/);
      expect(source, file).not.toContain('font-extrabold');
    }

    expect(read('src/components/layout/Header.tsx')).toContain('font-black text-lg sm:text-xl');
    expect(read('src/components/students/StudentsBookView.tsx')).not.toContain('font-black');
    expect(read('src/components/gradebook/SmartGradebookView.tsx')).not.toContain('font-black');
  });

  it('keeps the semantic hierarchy and protected screen/print font contracts', () => {
    const css = read('src/index.css');
    const html = read('index.html');
    const printStart = css.indexOf('@media print');
    const screenCss = css.slice(css.indexOf('@media screen'), printStart);
    const printCss = css.slice(printStart);

    expect(html).toContain('family=Alexandria:wght@400;500;600;700');
    expect(screenCss).toContain('font-family: var(--font-arabic)');
    expect(screenCss).toContain('font-size: var(--type-page-title)');
    expect(screenCss).toContain('font-size: var(--type-section-title)');
    expect(screenCss).toContain('font-size: var(--type-card-title)');
    expect(screenCss).toContain('font-size: var(--type-body)');
    expect(screenCss).toContain('font-size: var(--type-control)');
    expect(screenCss).toContain('font-size: var(--type-table)');
    expect(css).toContain('--type-meta:');
    expect(css).toContain('--type-badge:');
    expect(screenCss).not.toMatch(/font-weight\s*:\s*(800|900)/);
    expect(printCss).toContain('font-family: Tahoma, Arial, sans-serif');
    expect(printCss).toContain('font-family: Cairo, Tahoma, Arial, sans-serif');
    expect(printCss).not.toContain('font-family: var(--font-arabic)');
  });
});
