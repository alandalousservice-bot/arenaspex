import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P1A_GRADE_ONE_DOMAIN_ONE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1aGradeOneDomainOne';
import { P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1cDomainOneGradesTwoToFive';
import { OFFICIAL_CURRICULUM_2023 } from '../src/domain/pedagogicalKnowledge/source/officialCurriculum2023';
import {
  OFFICIAL_DOMAIN_ONE_COMPONENT_IDS,
  OFFICIAL_DOMAIN_ONE_FINAL_COMPETENCY_IDS,
  validateOfficialCurriculum2023,
} from '../src/domain/pedagogicalKnowledge/source/officialCurriculum.validation';

const allSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? allSourceFiles(path)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [path]
        : [];
  });

describe('official EPS 2023 curriculum source artifact', () => {
  const cells = OFFICIAL_CURRICULUM_2023.grades.flatMap((grade) => grade.domains);
  const finalCompetencies = cells.map((cell) => cell.finalCompetency);
  const components = cells.flatMap((cell) => cell.competencyComponents);
  const resources = cells.flatMap((cell) => cell.resourceGroups);

  it('validates the complete immutable 5 × 3 source matrix', () => {
    expect(validateOfficialCurriculum2023(OFFICIAL_CURRICULUM_2023)).toEqual([]);
    expect(OFFICIAL_CURRICULUM_2023.grades).toHaveLength(5);
    expect(new Set(cells.map((cell) => cell.domainId))).toHaveLength(3);
    expect(cells).toHaveLength(15);
    expect(OFFICIAL_CURRICULUM_2023.grades.map((grade) => grade.overallCompetency)).toHaveLength(5);
    expect(finalCompetencies).toHaveLength(15);
    expect(components).toHaveLength(45);
    expect(resources).toHaveLength(52);
    expect(cells.every((cell) => cell.competencyComponents.length === 3)).toBe(true);
  });

  it('has complete official-only provenance and unique stable identities', () => {
    const records = [
      ...OFFICIAL_CURRICULUM_2023.grades.map((grade) => grade.overallCompetency),
      ...finalCompetencies,
      ...components,
      ...resources,
    ];
    expect(new Set(records.map((item) => item.id)).size).toBe(records.length);
    expect(records.every((item) => item.sourceDocument === 'EPS-2023')).toBe(true);
    expect(records.every((item) => Boolean(item.sourcePage) && Boolean(item.sourceHeading))).toBe(
      true
    );
    expect(records.some((item) => String(item.provenance) === 'reviewed_derived')).toBe(false);
  });

  it('preserves all established Domain 1 final-competency and component IDs', () => {
    const reviewed = [P1A_GRADE_ONE_DOMAIN_ONE_CATALOG, P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG];
    expect(OFFICIAL_DOMAIN_ONE_FINAL_COMPETENCY_IDS).toEqual(
      reviewed.flatMap((catalog) => catalog.finalCompetencies.map((item) => item.id))
    );
    expect(OFFICIAL_DOMAIN_ONE_COMPONENT_IDS).toEqual(
      reviewed.flatMap((catalog) => catalog.competencyComponents.map((item) => item.id))
    );
    expect('learningRequirements' in OFFICIAL_CURRICULUM_2023).toBe(false);
    expect('objectiveConcepts' in OFFICIAL_CURRICULUM_2023).toBe(false);
  });

  it('keeps Grade 5 running, jumping, and throwing in distinct D1 and D2 source contexts', () => {
    const gradeFive = OFFICIAL_CURRICULUM_2023.grades.find((grade) => grade.gradeId === 'lvl_p5')!;
    const d1 = gradeFive.domains.find((cell) => cell.domainId === 'f_locomotion')!;
    const d2 = gradeFive.domains.find((cell) => cell.domainId === 'f_fundamentals')!;
    expect(d1.resourceGroups.map((item) => item.label).join(' ')).toMatch(/الجري.*الوثب.*الرمي/);
    expect(d2.resourceGroups.map((item) => item.label).join(' ')).toMatch(/الجري|الوثب|الرمي/);
    expect(d1.finalCompetency.id).not.toBe(d2.finalCompetency.id);
    expect(d1.resourceGroups[0].id).not.toBe(d2.resourceGroups[0].id);
  });

  it('records the evaluation limitation without invented per-cell criteria or session algorithms', () => {
    expect(OFFICIAL_CURRICULUM_2023.evaluationFramework).toMatchObject({
      available: true,
      perCellCriteriaAvailable: false,
      perCellIndicatorsAvailable: false,
    });
    expect(OFFICIAL_CURRICULUM_2023.sessionSemantics.arenaSpexSequenceIsOfficial).toBe(false);
    expect(JSON.stringify(OFFICIAL_CURRICULUM_2023)).not.toMatch(
      /reviewed_derived|teacherObjective|integrationPoints/
    );
  });

  it('is deeply frozen and cannot be mutated at runtime', () => {
    expect(Object.isFrozen(OFFICIAL_CURRICULUM_2023)).toBe(true);
    expect(Object.isFrozen(OFFICIAL_CURRICULUM_2023.grades[0].domains[0].resourceGroups)).toBe(
      true
    );
    expect(() => {
      (OFFICIAL_CURRICULUM_2023.grades as unknown as unknown[]).push({});
    }).toThrow();
  });

  it('is consumed only by the reviewed semantic release, never by production code', () => {
    const root = join(process.cwd(), 'src');
    const imports = allSourceFiles(root)
      .filter((file) => !file.includes(`${join('pedagogicalKnowledge', 'source')}`))
      .filter((file) => readFileSync(file, 'utf8').includes('officialCurriculum2023'))
      .map((file) => relative(root, file));
    expect(imports).toEqual([
      join('domain', 'pedagogicalKnowledge', 'releases', 'p1faDomainTwoAndThree.ts'),
      join('domain', 'pedagogicalKnowledge', 'releases', 'p1fbDomainOneCorrection.ts'),
      join('domain', 'pedagogicalKnowledge', 'releases', 'p1fcCombinedSemanticRelease.ts'),
      join('domain', 'pedagogicalKnowledge', 'releases', 'p2a2cSourceFidelityRelease.ts'),
    ]);
  });
});
