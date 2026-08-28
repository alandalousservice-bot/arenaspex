import { describe, expect, it } from 'vitest';
import { ANNUAL_PLAN_LEVELS, ANNUAL_PLAN_REFERENCE } from '../src/data/annualPlanReference';
import {
  annualPlanTimeLabel,
  buildAnnualPlanPresentation,
  buildDomainPresentation,
  calculatePrintScale,
  getAnnualPlanDomainHours,
} from '../src/services/annualPlanPresentation';
import { pathToTab } from '../src/lib/routes';
import { readFileSync } from 'node:fs';

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
    const css = readFileSync('src/index.css', 'utf8');
    expect(view).toContain('annual-plan-print-root');
    expect(css).toContain('body:has(.annual-plan-print-root) *');
    expect(css).toContain('.annual-plan-print-root *');
    expect(view).toContain('AnnualPlanOfficialTable');
  });

  it('calculates a bounded print scale from both page dimensions', () => {
    expect(
      calculatePrintScale({
        contentWidth: 200,
        contentHeight: 400,
        availableWidth: 100,
        availableHeight: 200,
        minimumScale: 0.1,
      })
    ).toBe(0.5);
    expect(
      calculatePrintScale({
        contentWidth: 200,
        contentHeight: 100,
        availableWidth: 1000,
        availableHeight: 1000,
      })
    ).toBe(1);
    expect(
      calculatePrintScale({
        contentWidth: 0,
        contentHeight: 400,
        availableWidth: 100,
        availableHeight: 200,
      })
    ).toBe(1);
  });
});
