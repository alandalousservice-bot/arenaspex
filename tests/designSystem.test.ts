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
});
