import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateCompetencyCoverage } from '../src/domain/pedagogicalKnowledge/engine/competencyCoverage.service';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import { P1A_GRADE_ONE_DOMAIN_ONE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1aGradeOneDomainOne';
import { P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1cDomainOneGradesTwoToFive';
import { P1FA_DOMAIN_TWO_AND_THREE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1faDomainTwoAndThree';
import {
  P1FB_DOMAIN_ONE_CORRECTION_CATALOG,
  P1FB_LEGACY_RECONCILIATIONS,
  P1FB_REFINED_G3_CONCEPT_ID,
  P1FB_RELEASE_ID,
} from '../src/domain/pedagogicalKnowledge/releases/p1fbDomainOneCorrection';
import { OFFICIAL_CURRICULUM_2023 } from '../src/domain/pedagogicalKnowledge/source/officialCurriculum2023';
import { projectTeacherPlanSemantics } from '../src/domain/pedagogicalKnowledge/teacherPlanSemanticAdapter';
import { validatePedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/catalog';

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
const previous = [P1A_GRADE_ONE_DOMAIN_ONE_CATALOG, P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG];
const grades = ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'] as const;

describe('P1F-B reviewed Domain 1 correction release', () => {
  it('is valid and preserves five FC, fifteen component, and twenty requirement identities', () => {
    expect(validatePedagogicalKnowledgeCatalog(P1FB_DOMAIN_ONE_CORRECTION_CATALOG)).toEqual([]);
    expect(P1FB_DOMAIN_ONE_CORRECTION_CATALOG.finalCompetencies.map((item) => item.id)).toEqual(
      previous.flatMap((catalog) => catalog.finalCompetencies.map((item) => item.id))
    );
    expect(P1FB_DOMAIN_ONE_CORRECTION_CATALOG.competencyComponents.map((item) => item.id)).toEqual(
      previous.flatMap((catalog) => catalog.competencyComponents.map((item) => item.id))
    );
    expect(P1FB_DOMAIN_ONE_CORRECTION_CATALOG.learningRequirements.map((item) => item.id)).toEqual(
      previous.flatMap((catalog) => catalog.learningRequirements.map((item) => item.id))
    );
    expect(P1FB_DOMAIN_ONE_CORRECTION_CATALOG.learningRequirements).toHaveLength(20);
  });

  it('keeps 34 concepts and explicitly refines one without hiding identity change', () => {
    const ids = P1FB_DOMAIN_ONE_CORRECTION_CATALOG.objectiveConcepts.map((item) => item.id);
    expect(ids).toHaveLength(35);
    expect(ids).not.toContain('objective-concept:lvl_p3:f_locomotion:5');
    const refined = P1FB_DOMAIN_ONE_CORRECTION_CATALOG.objectiveConcepts.find(
      (item) => item.id === P1FB_REFINED_G3_CONCEPT_ID
    );
    expect(refined?.supersedesId).toBe('objective-concept:lvl_p3:f_locomotion:5');
    expect(refined?.label).toMatch(/وضعية الجسم.*الرمي.*باليدين.*مجال آمن/);
  });

  it('records the seven curriculum decisions without false aliases', () => {
    expect(P1FB_LEGACY_RECONCILIATIONS).toHaveLength(7);
    const decision = (gradeId: string, ref: string) =>
      P1FB_LEGACY_RECONCILIATIONS.find(
        (item) => item.gradeId === gradeId && item.legacyReferenceId === ref
      )!;
    expect(decision('lvl_p3', 'f_locomotion__7')).toMatchObject({
      decision: 'MOVE_TO_OTHER_DOMAIN',
      countsForDomainOneCoverage: false,
    });
    expect(decision('lvl_p4', 'f_locomotion__6').decision).toBe('APPROVE_REPLACEMENT');
    expect(decision('lvl_p4', 'f_locomotion__7').decision).toBe('APPROVE_REPLACEMENT');
    expect(decision('lvl_p5', 'f_locomotion__2').decision).toBe('APPROVE_REPLACEMENT');
    expect(decision('lvl_p5', 'f_locomotion__3')).toMatchObject({
      decision: 'SPLIT_REQUIRED',
      countsForDomainOneCoverage: false,
    });
    expect(decision('lvl_p5', 'f_locomotion__3').canonicalObjectiveConceptIds).toHaveLength(2);
    expect(decision('lvl_p5', 'f_locomotion__6')).toMatchObject({
      decision: 'MOVE_TO_OTHER_DOMAIN',
      countsForDomainOneCoverage: false,
    });
    expect(decision('lvl_p5', 'f_locomotion__7').decision).toBe('APPROVE_REPLACEMENT');
    expect(
      P1FB_DOMAIN_ONE_CORRECTION_CATALOG.aliases.every(
        (item) =>
          !item.canonicalId.includes(':f_fundamentals:') &&
          !item.canonicalId.includes(':f_structuring:')
      )
    ).toBe(true);
  });

  it('keeps G5 D1 posture/adaptation distinct from D2 technique', () => {
    const d1 = P1FB_DOMAIN_ONE_CORRECTION_CATALOG.objectiveConcepts.filter(
      (item) => item.gradeId === 'lvl_p5'
    );
    const d2 = P1FA_DOMAIN_TWO_AND_THREE_CATALOG.objectiveConcepts.filter(
      (item) => item.gradeId === 'lvl_p5' && item.domainId === 'f_fundamentals'
    );
    expect(d1.map((item) => item.label).join(' ')).toMatch(/وضعية|ينتقل/);
    expect(d2.map((item) => item.label).join(' ')).toMatch(/تقنية|ديناميكية|الوثب|الرمي/);
    expect(new Set([...d1, ...d2].map((item) => item.id)).size).toBe(d1.length + d2.length);
  });

  it.each(grades)(
    '%s retains complete requirements while reviewed release coverage is safely indeterminate',
    (gradeId) => {
      const requirements = P1FB_DOMAIN_ONE_CORRECTION_CATALOG.learningRequirements.filter(
        (item) => item.gradeId === gradeId
      );
      const concepts = P1FB_DOMAIN_ONE_CORRECTION_CATALOG.objectiveConcepts.filter(
        (item) => item.gradeId === gradeId
      );
      const result = calculateCompetencyCoverage({
        catalog: P1FB_DOMAIN_ONE_CORRECTION_CATALOG,
        coreReleaseId: P1FB_RELEASE_ID,
        gradeId,
        domainId: 'f_locomotion',
        finalCompetencyId: `fc_${gradeId}_f_locomotion`,
        teacherObjectives: concepts.map((item) => ({
          teacherObjectiveId: `teacher:${item.id}`,
          objectiveConceptId: item.id,
        })),
      });
      expect(requirements).toHaveLength(4);
      expect(result.coveredRequirements).toHaveLength(4);
      expect(result.coverageStatus).toBe('indeterminate');
      expect(result.indeterminateReasons).toContain(
        'The requested knowledge-core release is not active.'
      );
    }
  );

  it('resolves approved legacy replacements read-only and preserves Teacher wording/input', () => {
    const domain = {
      fieldId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p4_f_locomotion',
      objectives: [
        {
          id: 'teacher-1',
          text: 'صياغة الأستاذ الأصلية',
          orderIndex: 1,
          sourceReferenceId: 'f_locomotion__6',
        },
      ],
      integrationPoints: [],
    };
    const before = structuredClone(domain);
    const result = projectTeacherPlanSemantics({
      catalog: P1FB_DOMAIN_ONE_CORRECTION_CATALOG,
      coreReleaseId: P1FB_RELEASE_ID,
      gradeId: 'lvl_p4',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p4_f_locomotion',
      domain,
    });
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('source_reference');
    expect(domain).toEqual(before);
    expect(domain.objectives[0].text).toBe('صياغة الأستاذ الأصلية');
  });

  it('preserves custom objectives and keeps moved historical items unmapped', () => {
    const domain = {
      fieldId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p5_f_locomotion',
      objectives: [
        {
          id: 'legacy-obstacle',
          text: 'عوائق وتوازن',
          orderIndex: 1,
          sourceReferenceId: 'f_locomotion__6',
        },
        { id: 'custom', text: 'هدف خاص بالأستاذ', orderIndex: 2 },
      ],
      integrationPoints: [],
    };
    const result = projectTeacherPlanSemantics({
      catalog: P1FB_DOMAIN_ONE_CORRECTION_CATALOG,
      coreReleaseId: P1FB_RELEASE_ID,
      gradeId: 'lvl_p5',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p5_f_locomotion',
      domain,
    });
    expect(result.unmappedObjectives.map((item) => item.teacherObjectiveId)).toEqual([
      'legacy-obstacle',
      'custom',
    ]);
    expect(domain.objectives.map((item) => item.text)).toEqual([
      'عوائق وتوازن',
      'هدف خاص بالأستاذ',
    ]);
  });

  it('passes the complete 15-cell consistency gate without known contamination', () => {
    const cells = [
      ...P1FB_DOMAIN_ONE_CORRECTION_CATALOG.domains,
      ...P1FA_DOMAIN_TWO_AND_THREE_CATALOG.domains,
    ];
    expect(cells).toHaveLength(15);
    expect(new Set(cells.map((item) => `${item.gradeId}|${item.domainId}`)).size).toBe(15);
    const allConcepts = [
      ...P1FB_DOMAIN_ONE_CORRECTION_CATALOG.objectiveConcepts,
      ...P1FA_DOMAIN_TWO_AND_THREE_CATALOG.objectiveConcepts,
    ];
    expect(
      allConcepts.every((item) => item.id.includes(`:${item.gradeId}:${item.domainId}:`))
    ).toBe(true);
    expect(allConcepts.map((item) => item.label).join(' ')).not.toMatch(/نشاط جماعي بسيط/);
  });

  it('does not mutate the closed source, D2/D3 release, or P1E status', () => {
    expect(OFFICIAL_CURRICULUM_2023.contentHash).toBe('fnv1a32:cfe67657');
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.release.catalogHash).toBe('fnv1a32:d0015de5');
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });

  it('has zero production imports', () => {
    const root = join(process.cwd(), 'src');
    const imports = files(root)
      .filter((file) => !file.endsWith('p1fbDomainOneCorrection.ts'))
      .filter((file) => readFileSync(file, 'utf8').includes('p1fbDomainOneCorrection'))
      .map((file) => relative(root, file));
    expect(imports).toEqual([
      join('domain', 'pedagogicalKnowledge', 'releases', 'p1fcCombinedSemanticRelease.ts'),
    ]);
  });
});
