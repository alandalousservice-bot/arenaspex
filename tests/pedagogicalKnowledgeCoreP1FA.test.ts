import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateCompetencyCoverage } from '../src/domain/pedagogicalKnowledge/engine/competencyCoverage.service';
import { P1A_GRADE_ONE_DOMAIN_ONE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1aGradeOneDomainOne';
import { P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1cDomainOneGradesTwoToFive';
import {
  P1FA_DOMAIN_IDS,
  P1FA_DOMAIN_TWO_AND_THREE_CATALOG,
  P1FA_GRADE_IDS,
  P1FA_RELEASE_ID,
  p1faCellConcepts,
  p1faCellRequirements,
  type P1FADomainId,
  type P1FAGradeId,
} from '../src/domain/pedagogicalKnowledge/releases/p1faDomainTwoAndThree';
import { OFFICIAL_CURRICULUM_2023 } from '../src/domain/pedagogicalKnowledge/source/officialCurriculum2023';
import { projectTeacherPlanSemantics } from '../src/domain/pedagogicalKnowledge/teacherPlanSemanticAdapter';
import { validatePedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/catalog';
import type { TeacherObjectiveCoverageInput } from '../src/domain/pedagogicalKnowledge/types';

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
const finalId = (gradeId: P1FAGradeId, domainId: P1FADomainId) => `fc_${gradeId}_${domainId}`;
const coverage = (
  gradeId: P1FAGradeId,
  domainId: P1FADomainId,
  objectives: readonly TeacherObjectiveCoverageInput[] = p1faCellConcepts(gradeId, domainId).map(
    (concept) => ({
      teacherObjectiveId: `teacher:${concept.id}`,
      objectiveConceptId: concept.id,
    })
  )
) =>
  calculateCompetencyCoverage({
    catalog: P1FA_DOMAIN_TWO_AND_THREE_CATALOG,
    coreReleaseId: P1FA_RELEASE_ID,
    gradeId,
    domainId,
    finalCompetencyId: finalId(gradeId, domainId),
    teacherObjectives: objectives,
  });

describe('P1F-A reviewed Domain 2 and Domain 3 semantic core', () => {
  it('publishes one valid isolated release with all 10 official cells and stable references', () => {
    expect(validatePedagogicalKnowledgeCatalog(P1FA_DOMAIN_TWO_AND_THREE_CATALOG)).toEqual([]);
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.domains).toHaveLength(10);
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.finalCompetencies).toHaveLength(10);
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.competencyComponents).toHaveLength(30);
    for (const gradeId of P1FA_GRADE_IDS)
      for (const domainId of P1FA_DOMAIN_IDS) {
        const official = OFFICIAL_CURRICULUM_2023.grades
          .find((grade) => grade.gradeId === gradeId)!
          .domains.find((cell) => cell.domainId === domainId)!;
        expect(
          P1FA_DOMAIN_TWO_AND_THREE_CATALOG.finalCompetencies.find(
            (item) => item.gradeId === gradeId && item.domainId === domainId
          )?.id
        ).toBe(official.finalCompetency.id);
        expect(
          P1FA_DOMAIN_TWO_AND_THREE_CATALOG.competencyComponents
            .filter((item) => item.gradeId === gradeId && item.domainId === domainId)
            .map((item) => item.id)
        ).toEqual(official.competencyComponents.map((item) => item.id));
      }
  });

  it('defines complete approved traced requirements and concepts without speculative variants or keys', () => {
    const catalog = P1FA_DOMAIN_TWO_AND_THREE_CATALOG;
    expect(catalog.learningRequirements).toHaveLength(37);
    expect(catalog.objectiveConcepts).toHaveLength(37);
    expect(catalog.objectiveVariants).toEqual([]);
    expect(catalog.objectiveKeys).toEqual([]);
    expect(
      catalog.finalCompetencies.every((item) => item.requirementSetStatus === 'complete')
    ).toBe(true);
    for (const item of [...catalog.learningRequirements, ...catalog.objectiveConcepts]) {
      expect(item.originType).toBe('reviewed_derived');
      expect(item.reviewStatus).toBe('approved');
      expect(item.sourceRef).toMatch(/^official-resource-group:/);
      expect(item.metadata).toMatchObject({ sourceArtifactId: 'dz-primary-pe-2023' });
      expect((item.metadata?.officialResourceGroupIds as string[]).length).toBeGreaterThan(0);
      expect(item.competencyComponentIds.length).toBeGreaterThan(0);
    }
  });

  it('exposes the reviewed Grade 1 / Domain 2 criteria and indicators only for that cell', () => {
    const catalog = P1FA_DOMAIN_TWO_AND_THREE_CATALOG;
    const criteria = catalog.criteria.filter(
      (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_fundamentals'
    );
    const indicators = catalog.indicators.filter(
      (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_fundamentals'
    );
    expect(criteria).toHaveLength(4);
    expect(indicators).toHaveLength(4);
    expect(criteria.every((item) => item.finalCompetencyId === 'fc_lvl_p1_f_fundamentals')).toBe(
      true
    );
    expect(
      indicators.every((item) => criteria.some((criterion) => criterion.id === item.criterionId))
    ).toBe(true);
    expect(
      catalog.criteria.filter(
        (item) => !['f_fundamentals', 'f_structuring'].includes(item.domainId)
      )
    ).toHaveLength(0);
    expect(
      catalog.indicators.filter(
        (item) => !['f_fundamentals', 'f_structuring'].includes(item.domainId)
      )
    ).toHaveLength(0);
  });

  it('exposes the reviewed Grade 1 / Domain 3 criteria and indicators only for that cell', () => {
    const criteria = P1FA_DOMAIN_TWO_AND_THREE_CATALOG.criteria.filter(
      (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_structuring'
    );
    const indicators = P1FA_DOMAIN_TWO_AND_THREE_CATALOG.indicators.filter(
      (item) => item.gradeId === 'lvl_p1' && item.domainId === 'f_structuring'
    );
    expect(criteria).toHaveLength(4);
    expect(indicators).toHaveLength(4);
    expect(criteria.every((item) => item.finalCompetencyId === 'fc_lvl_p1_f_structuring')).toBe(
      true
    );
    expect(
      indicators.every((item) => criteria.some((criterion) => criterion.id === item.criterionId))
    ).toBe(true);
    expect(criteria.map((item) => item.label)).toEqual([
      'ضبط مسار الحركات تماشيا مع الفضاء المتاح',
      'ترتيب الحركات حسب أولويتها بالنسبة للعملية',
      'التنفيذ المناسب للفضاء المتاح',
      'القيام بحركات لتمكين الزملاء من استثمار الفضاء',
    ]);
    expect(indicators.map((item) => item.label)).toEqual([
      'التنقل في فضاء الممارسة بشكل منظم',
      'مشاركة فضاء الممارسة',
      'التفاعل مع التشكيلات والصفوف',
      'مشاركة الأقران',
    ]);
  });

  describe.each(P1FA_DOMAIN_IDS)('%s coverage', (domainId) => {
    it.each(P1FA_GRADE_IDS)('%s supports complete, partial, and unmapped plans', (gradeId) => {
      const concepts = p1faCellConcepts(gradeId, domainId);
      expect(coverage(gradeId, domainId).coverageStatus).toBe('complete');
      expect(
        coverage(gradeId, domainId, [
          {
            teacherObjectiveId: 'partial',
            objectiveConceptId: concepts[0].id,
          },
        ]).coverageStatus
      ).toBe(concepts.length === 1 ? 'complete' : 'partial');
      const unmapped = coverage(gradeId, domainId, [{ teacherObjectiveId: 'custom' }]);
      expect(unmapped.coverageStatus).toBe('unmapped');
      expect(unmapped.unmappedObjectives).toEqual(['custom']);
    });
  });

  it.each(P1FA_DOMAIN_IDS)(
    '%s coverage is independent from merged versus split plan shape',
    (domainId) => {
      const gradeId = domainId === 'f_fundamentals' ? 'lvl_p5' : 'lvl_p2';
      const requirements = p1faCellRequirements(gradeId, domainId);
      const merged = coverage(gradeId, domainId, [
        {
          teacherObjectiveId: 'merged',
          explicitReviewedRequirementIds: requirements.map((item) => item.id),
        },
      ]);
      const split = coverage(
        gradeId,
        domainId,
        requirements.map((item) => ({
          teacherObjectiveId: `split:${item.id}`,
          explicitReviewedRequirementIds: [item.id],
        }))
      );
      expect(merged.coverageStatus).toBe('complete');
      expect(split.coverageStatus).toBe('complete');
      expect(merged.coveredRequirements.map((item) => item.id)).toEqual(
        split.coveredRequirements.map((item) => item.id)
      );
    }
  );

  it('keeps same motor words in distinct D1 and D2 Grade 5 identities', () => {
    const d1 = OFFICIAL_CURRICULUM_2023.grades
      .find((grade) => grade.gradeId === 'lvl_p5')!
      .domains.find((cell) => cell.domainId === 'f_locomotion')!;
    const d2 = p1faCellConcepts('lvl_p5', 'f_fundamentals');
    expect(d1.resourceGroups.map((item) => item.label).join(' ')).toMatch(/الجري.*الوثب.*الرمي/);
    expect(d2.map((item) => item.label).join(' ')).toMatch(/الجري|الوثب|الرمي/);
    expect(d2.every((item) => item.id.includes(':f_fundamentals:'))).toBe(true);
  });

  it('preserves official D3 space, tool, landmark, safety, and collective-game progression', () => {
    const d3 = P1FA_DOMAIN_TWO_AND_THREE_CATALOG.objectiveConcepts
      .filter((item) => item.domainId === 'f_structuring')
      .map((item) => item.label)
      .join(' ');
    expect(d3).toMatch(/فضاء|التشكيلات/);
    expect(d3).toMatch(/الوسائل|الأدوات/);
    expect(d3).toMatch(/المعالم/);
    expect(d3).toMatch(/القواعد|السلامة/);
    expect(d3).toMatch(/الألعاب الجماعية/);
    expect(d3).not.toMatch(/نشاط جماعي بسيط/);
  });

  it('resolves reviewed mappings through the existing read-only adapter', () => {
    const gradeId = 'lvl_p2';
    const domainId = 'f_structuring';
    const concepts = p1faCellConcepts(gradeId, domainId);
    const result = projectTeacherPlanSemantics({
      catalog: P1FA_DOMAIN_TWO_AND_THREE_CATALOG,
      coreReleaseId: P1FA_RELEASE_ID,
      gradeId,
      domainId,
      finalCompetencyId: finalId(gradeId, domainId),
      domain: {
        fieldId: domainId,
        finalCompetencyId: finalId(gradeId, domainId),
        objectives: concepts.map((_, index) => ({
          id: `teacher:${index}`,
          text: `صياغة ${index}`,
          orderIndex: index + 1,
          sourceReferenceId: `p1fa:${gradeId}:${domainId}:${index + 1}`,
        })),
        integrationPoints: [],
      },
    });
    expect(result.coverageStatus).toBe('complete');
    expect(
      result.objectiveResolutions.every((item) => item.resolutionStatus === 'source_reference')
    ).toBe(true);
  });

  it('keeps the existing Domain 1 releases and their approved structure', () => {
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.release.catalogHash).toBe('fnv1a32:cb85e286');
    expect(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.release.catalogHash).toBe('fnv1a32:4fff771d');
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.learningRequirements).toHaveLength(4);
    expect(P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveConcepts).toHaveLength(7);
    expect(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.learningRequirements).toHaveLength(16);
    expect(P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts).toHaveLength(28);
    expect(
      P1FA_DOMAIN_TWO_AND_THREE_CATALOG.domains.some((item) => item.domainId === 'f_locomotion')
    ).toBe(false);
  });

  it('keeps production activation separate from this canonical criteria data', () => {
    const root = join(process.cwd(), 'src');
    const imports = sourceFiles(root)
      .filter((file) => !file.endsWith('p1faDomainTwoAndThree.ts'))
      .filter((file) => readFileSync(file, 'utf8').includes('p1faDomainTwoAndThree'))
      .map((file) => relative(root, file));
    expect(imports).toEqual([
      join('domain', 'pedagogicalKnowledge', 'releases', 'p1fcCombinedSemanticRelease.ts'),
    ]);
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.criteria).toHaveLength(32);
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.indicators).toHaveLength(32);
  });
});
