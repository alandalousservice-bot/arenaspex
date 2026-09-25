import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  chunkGradebookPrintRows,
  GRADEBOOK_PRINT_ROWS_PER_PAGE,
  getGradebookPrintOrdinal,
} from '../src/components/gradebook/SmartGradebookView';

const component = readFileSync('src/components/gradebook/SmartGradebookView.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');
const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const printRoot = component.slice(
  component.indexOf('<section className="gradebook-print-root"'),
  component.indexOf('</section>', component.indexOf('<section className="gradebook-print-root"'))
);
const printCss = css.slice(css.indexOf('@page gradebook'), css.indexOf('@page learning-section'));
const cssWithoutGradebookPrint = css.replace(printCss, '');

function ruleFor(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return printCss.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] || '';
}

describe('teacher Gradebook print document', () => {
  it('adds a dedicated print document while retaining the screen Gradebook', () => {
    expect(component).toContain('gradebook-print-root');
    expect(component).toContain('gradebook-print-table');
    expect(component).toContain('Comprehensive Intelligent Grade Table');
    expect(component).toContain('filteredClassStudents');
  });

  it('hides the print document on screen and declares A4 landscape print media', () => {
    expect(css).toMatch(/\.gradebook-print-root\s*\{\s*display:\s*none;/);
    expect(css).toContain('@page gradebook');
    expect(printCss).toContain('size: A4 landscape');
  });

  it('isolates the document and preserves the required application ancestors', () => {
    for (const selector of [
      '.app-shell-header',
      '.app-shell-sidebar',
      '.app-offline-banner',
      '.app-mobile-drawer',
      '.app-mobile-bottom-nav',
    ]) {
      expect(printCss).toContain(`body:has(.gradebook-print-root) ${selector}`);
    }
    for (const selector of ['#root', '.app-shell', '.app-shell > .flex-1', '.app-shell main', '.workspace-page--gradebook']) {
      expect(printCss).toContain(`body:has(.gradebook-print-root) ${selector}`);
    }
    expect(printCss).toContain('.workspace-page--gradebook > :not(.gradebook-print-root)');
  });

  it('scopes mobile navigation suppression to Gradebook print only', () => {
    expect(sidebar).toContain('className="app-mobile-bottom-nav md:hidden fixed bottom-0');
    expect(printCss).toMatch(
      /body:has\(\.gradebook-print-root\) \.app-shell-header,[\s\S]*?body:has\(\.gradebook-print-root\) \.app-mobile-bottom-nav\s*\{\s*display:\s*none !important;/
    );
    expect(cssWithoutGradebookPrint).not.toMatch(
      /\.app-mobile-bottom-nav\s*\{[^}]*display:\s*none\s*!important/s
    );
  });

  it('keeps the native table fragmentation contract for repeated headers', () => {
    const table = ruleFor('.gradebook-print-table');
    expect(table).toMatch(/display:\s*table\s*;/);
    expect(table).toMatch(/width:\s*100%\s*;/);
    expect(table).toMatch(/table-layout:\s*fixed\s*;/);
    expect(table).toMatch(/overflow:\s*visible\s*;/);
    expect(table).toMatch(/break-inside:\s*auto\s*;/);
    expect(table).toMatch(/page-break-inside:\s*auto\s*;/);
    expect(table).not.toMatch(/(?:page-)?break-inside:\s*avoid/);

    expect(ruleFor('.gradebook-print-table thead')).toMatch(/display:\s*table-header-group\s*;/);
    expect(ruleFor('.gradebook-print-table tbody')).toMatch(/display:\s*table-row-group\s*;/);
    const row = ruleFor('.gradebook-print-table tr');
    expect(row).toMatch(/break-inside:\s*avoid\s*;/);
    expect(row).toMatch(/page-break-inside:\s*avoid\s*;/);
  });

  it('allows print ancestors to fragment without screen clipping constraints', () => {
    const root = ruleFor('body:has(.gradebook-print-root) .gradebook-print-root');
    expect(root).toMatch(/height:\s*auto\s*;/);
    expect(root).toMatch(/max-height:\s*none\s*;/);
    expect(root).toMatch(/overflow:\s*visible\s*;/);
    expect(root).toMatch(/position:\s*static\s*;/);
    expect(root).toMatch(/transform:\s*none\s*;/);
    expect(printCss).not.toMatch(/overflow-x-auto/);
    expect(printCss).not.toMatch(/overflow:\s*(?:hidden|auto|scroll)\s*;/);
    const maxHeights = [...printCss.matchAll(/max-height:\s*([^;]+);/g)].map((match) => match[1].trim());
    expect(maxHeights.every((value) => value === 'none' || value === 'none !important')).toBe(true);
  });

  it('keeps the isolated printable subtree free of interactive form controls', () => {
    expect(printRoot).not.toMatch(/<(?:select|input|button|textarea)\b/i);
    expect(printRoot).toContain('gradebookPrintPages.map');
    expect(printRoot).toContain('pageStudents.map');
  });

  it('derives deterministic page chunks from the shared filtered roster', () => {
    expect(GRADEBOOK_PRINT_ROWS_PER_PAGE).toBe(14);
    expect(component).toMatch(/chunkGradebookPrintRows\(filteredClassStudents\)/);
    const fortyRows = Array.from({ length: 40 }, (_, index) => index + 1);
    const chunks = chunkGradebookPrintRows(fortyRows);
    expect(chunks.map((page) => page.length)).toEqual([14, 14, 12]);
    expect(chunks.flat()).toEqual(fortyRows);
    expect(chunkGradebookPrintRows(fortyRows.slice(0, 10)).map((page) => page.length)).toEqual([10]);
    expect(chunkGradebookPrintRows(fortyRows.slice(0, 28)).map((page) => page.length)).toEqual([14, 14]);
    expect(chunkGradebookPrintRows([])).toEqual([]);
  });

  it('renders a complete independent table per deterministic print page', () => {
    expect(printRoot).toMatch(/gradebookPrintPages\.map\(\(pageStudents, pageIndex\) => \(/);
    expect(printRoot).toMatch(/className="gradebook-print-page"[\s\S]*?<table className="gradebook-print-table">/);
    expect(printRoot).toMatch(/<thead>[\s\S]*?<\/thead>[\s\S]*?<tbody>[\s\S]*?<\/tbody>/);
    expect(component).toContain('return pages.length > 0 ? pages : [[]]');
  });

  it('keeps ordinal numbering global across page boundaries', () => {
    expect(getGradebookPrintOrdinal(0, 0)).toBe(1);
    expect(getGradebookPrintOrdinal(1, 0)).toBe(15);
    expect(getGradebookPrintOrdinal(2, 0)).toBe(29);
    expect(getGradebookPrintOrdinal(2, 11)).toBe(40);
    expect(printRoot).toContain('getGradebookPrintOrdinal(pageIndex, rowIndex)');
  });

    it('keeps each logical print page atomic and places continuation breaks before it', () => {
      const pageRule = ruleFor('.gradebook-print-page');
      const continuationRule = ruleFor('.gradebook-print-page + .gradebook-print-page');
      expect(pageRule).toMatch(/display:\s*block\s*;/);
      expect(pageRule).toMatch(/width:\s*100%\s*;/);
      expect(pageRule).toMatch(/break-inside:\s*avoid-page\s*!important\s*;/);
      expect(pageRule).toMatch(/page-break-inside:\s*avoid\s*!important\s*;/);
      expect(pageRule).toMatch(/overflow:\s*visible\s*!important\s*;/);
      expect(pageRule).toMatch(/position:\s*static\s*!important\s*;/);
      expect(pageRule).toMatch(/transform:\s*none\s*!important\s*;/);
      expect(pageRule).toMatch(/break-after:\s*auto\s*!important\s*;/);
      expect(pageRule).toMatch(/page-break-after:\s*auto\s*!important\s*;/);
      expect(pageRule).not.toMatch(/(?:min-|max-)?height\s*:/);
      expect(continuationRule).toMatch(/break-before:\s*page\s*!important\s*;/);
      expect(continuationRule).toMatch(/page-break-before:\s*always\s*!important\s*;/);
    });
});
