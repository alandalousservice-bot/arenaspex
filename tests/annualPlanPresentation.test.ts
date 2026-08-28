import { describe, expect, it } from 'vitest';
import { ANNUAL_PLAN_LEVELS, ANNUAL_PLAN_REFERENCE } from '../src/data/annualPlanReference';
import {
  annualPlanTimeLabel,
  buildAnnualPlanPresentation,
  buildDomainPresentation,
  getAnnualPlanDomainHours,
} from '../src/services/annualPlanPresentation';
import { pathToTab } from '../src/lib/routes';
import { readFileSync } from 'node:fs';
import {
  ANNUAL_PLAN_PRINT_PAGE_HEIGHT_MM,
  ANNUAL_PLAN_PRINT_PAGE_MARGIN_MM,
  ANNUAL_PLAN_PRINT_PAGE_WIDTH_MM,
} from '../src/components/curriculum/AnnualPlanPrintDocument';

describe('official annual plan presentation model', () => {
  it('exposes five grades and three canonical domains per grade', () => {
    expect(ANNUAL_PLAN_LEVELS).toHaveLength(5);
    expect(ANNUAL_PLAN_LEVELS.every((level) => level.domains.length === 3)).toBe(true);
    expect(ANNUAL_PLAN_LEVELS.flatMap((level) => level.domains)).toHaveLength(15);
  });

  it('normalizes components, transversal resources, criteria, indicators, and time', () => {
    const domain = buildDomainPresentation(ANNUAL_PLAN_REFERENCE.lvl_p1.domains[0]);
    expect(domain.components.length).toBeGreaterThan(0);
    expect(domain.knowledgeResources.length).toBeGreaterThan(0);
    expect(domain.transversalResources.length).toBeGreaterThan(0);
    expect(domain.evaluationCriteria.length).toBeGreaterThan(0);
    expect(domain.evaluationCriteria.some((item) => item.indicators.length > 0)).toBe(true);
    expect(domain.allocatedHours).toBe(20);
  });

  it('uses the official grade-based annual hours for every domain', () => {
    expect(
      [1, 2, 3, 4, 5].map((grade) =>
        ANNUAL_PLAN_REFERENCE[`lvl_p${grade}`].domains.map(
          (domain) => buildDomainPresentation(domain, grade).allocatedHours
        )
      )
    ).toEqual([
      [20, 20, 20],
      [20, 20, 20],
      [20, 20, 20],
      [15, 15, 15],
      [10, 10, 10],
    ]);
    expect([1, 2, 3, 4, 5].map((grade) => getAnnualPlanDomainHours(grade)! * 3)).toEqual([
      60, 60, 60, 45, 30,
    ]);
    expect(annualPlanTimeLabel(5)).toBe('10 ساعة');
  });

  it('keeps grade identity and supports effective teacher wording', () => {
    const level = ANNUAL_PLAN_REFERENCE.lvl_p3;
    const presentation = buildAnnualPlanPresentation(level, (domain) =>
      buildDomainPresentation({
        ...domain,
        finalCompetency:
          domain.fieldId === 'f_locomotion' ? 'صياغة الأستاذ الخاصة' : domain.finalCompetency,
      })
    );
    expect(presentation.grade).toBe(3);
    expect(presentation.domains[0].competency).toBe('صياغة الأستاذ الخاصة');
    expect(pathToTab('/annual-plan')).toBe('planning');
  });

  it('keeps Annual Plan print output isolated to its dedicated root', () => {
    const view = readFileSync('src/components/curriculum/AnnualPlanView.tsx', 'utf8');
    const document = readFileSync('src/components/curriculum/AnnualPlanPrintDocument.tsx', 'utf8');
    const css = readFileSync('src/index.css', 'utf8');
    expect(view).toContain('<AnnualPlanPrintDocument');
    expect(document).toContain('annual-plan-print-root');
    expect(css).toContain('body:has(.annual-plan-print-root) *');
    expect(css).toContain('.annual-plan-print-root *');
    expect(view).toContain('AnnualPlanOfficialTable');
  });

  it('keeps the dedicated print geometry within A4 landscape', () => {
    expect(ANNUAL_PLAN_PRINT_PAGE_WIDTH_MM).toBe(289);
    expect(ANNUAL_PLAN_PRINT_PAGE_HEIGHT_MM).toBe(202);
    expect(ANNUAL_PLAN_PRINT_PAGE_MARGIN_MM).toBe(4);
    expect(297 - ANNUAL_PLAN_PRINT_PAGE_MARGIN_MM * 2).toBe(ANNUAL_PLAN_PRINT_PAGE_WIDTH_MM);
    expect(210 - ANNUAL_PLAN_PRINT_PAGE_MARGIN_MM * 2).toBe(ANNUAL_PLAN_PRINT_PAGE_HEIGHT_MM);
  });

  it('uses a dedicated print document with selected-grade data only', () => {
    const document = readFileSync('src/components/curriculum/AnnualPlanPrintDocument.tsx', 'utf8');
    const table = readFileSync('src/components/curriculum/AnnualPlanPrintTable.tsx', 'utf8');
    const view = readFileSync('src/components/curriculum/AnnualPlanView.tsx', 'utf8');
    const css = readFileSync('src/index.css', 'utf8');
    expect(document).toContain('AnnualPlanGradePresentation');
    expect(document).toContain('AnnualPlanPrintTable');
    expect(document).toContain('annual-plan-print-footer');
    expect(table).toContain('presentation.domains.map');
    expect(table.match(/<col style=\{\{ width:/g)).toHaveLength(7);
    expect(table).toContain('annual-plan-print-table');
    expect(view).toContain('<AnnualPlanPrintDocument');
    expect(view).not.toContain('calculatePrintScale');
    expect(css).not.toContain('--annual-plan-print-scale');
    expect(css).not.toContain('transform: scale');
  });
});
