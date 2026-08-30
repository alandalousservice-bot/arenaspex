import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('Smart Gradebook philosophy panel contrast contract', () => {
  it('wins over generic workspace color normalization with semantic dark-surface styles', () => {
    const css = read('src/index.css');
    const component = read('src/components/gradebook/SmartGradebookView.tsx');
    const screenCss = css.slice(css.indexOf('@media screen'), css.indexOf('@media print'));
    const genericColorRule = screenCss.indexOf(".workspace-page [class*='text-blue-']");
    const semanticPanelRule = screenCss.indexOf(
      '.workspace-page--gradebook .smart-gradebook-philosophy-panel'
    );

    expect(component).toContain('smart-gradebook-philosophy-panel');
    expect(component).toContain('smart-gradebook-philosophy-heading');
    expect(component).toContain('smart-gradebook-philosophy-description');
    expect(component).toContain('smart-gradebook-philosophy-source');
    expect(component).toContain('smart-gradebook-philosophy-badge');
    expect(component).toContain('smart-gradebook-philosophy-action');
    expect(semanticPanelRule).toBeGreaterThan(genericColorRule);
    expect(screenCss).toContain('background-color: #064e3b !important');
    expect(screenCss).toContain('color: #fff !important');
    expect(screenCss).toContain('color: #d1fae5 !important');
    expect(screenCss).toContain('background-color: #fbbf24 !important');
    expect(screenCss).toContain('color: #451a03 !important');
  });

  it('keeps actions and future disabled states visible on the dark panel', () => {
    const css = read('src/index.css');
    const screenCss = css.slice(css.indexOf('@media screen'), css.indexOf('@media print'));

    expect(screenCss).toContain('.smart-gradebook-philosophy-action:hover:not(:disabled)');
    expect(screenCss).toContain('.smart-gradebook-philosophy-action:disabled');
    expect(screenCss).toContain('background-color: rgb(255 255 255 / 0.08) !important');
    expect(screenCss).toContain('color: rgb(255 255 255 / 0.62) !important');
    expect(screenCss).toContain('.smart-gradebook-philosophy-action svg');
  });

  it('keeps the fix presentation-only and outside print CSS', () => {
    const css = read('src/index.css');
    const printCss = css.slice(css.indexOf('@media print'));
    const gradebook = read('src/components/gradebook/SmartGradebookView.tsx');

    expect(printCss).not.toContain('smart-gradebook-philosophy-panel');
    expect(printCss).not.toContain('smart-gradebook-philosophy-action');
    expect(gradebook).toContain('weights.competencyWeight');
    expect(gradebook).toContain('auditLogs.filter');
  });
});
