import { describe, expect, it } from 'vitest';
import { ANNUAL_PLAN_LEVELS, ANNUAL_PLAN_REFERENCE } from '../src/data/annualPlanReference';
import {
  buildAnnualPlanPresentation,
  buildDomainPresentation,
} from '../src/services/annualPlanPresentation';
import { pathToTab } from '../src/lib/routes';

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
});
