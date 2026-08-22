import { describe, expect, it } from 'vitest';
import { INITIAL_KNOWLEDGE_BANK } from '../src/data/knowledgeBankData';
import { referenceSituations } from '../src/services/educationalSituation.selector.service';
import {
  buildKnowledgeCoverage,
  buildCurriculumObjectiveReferences,
  buildObjectiveReadModel,
  coverageStatus,
  canViewCoverageDiagnostics,
} from '../src/services/knowledgeCoverage.service';

describe('knowledge bank coverage diagnostics', () => {
  const matrix = buildKnowledgeCoverage({
    knowledgeItems: INITIAL_KNOWLEDGE_BANK,
    educationalSituations: referenceSituations,
  });

  it('represents exactly the 15 grade/field cells', () => {
    expect(matrix).toHaveLength(15);
    expect(new Set(matrix.map((cell) => `${cell.grade}|${cell.fieldId}`)).size).toBe(15);
  });

  it('uses conservative EMPTY/LOW/ADEQUATE thresholds', () => {
    expect(coverageStatus(0)).toBe('EMPTY');
    expect(coverageStatus(1)).toBe('LOW');
    expect(coverageStatus(2)).toBe('LOW');
    expect(coverageStatus(3)).toBe('ADEQUATE');
  });

  it('counts authoritative situations without mutating the source list', () => {
    const before = JSON.stringify(referenceSituations);
    expect(matrix.reduce((sum, cell) => sum + cell.situationsCount, 0)).toBe(
      referenceSituations.filter((s) => s.status === 'APPROVED').length
    );
    expect(JSON.stringify(referenceSituations)).toBe(before);
  });

  it('exposes curriculum objectives and avoids an exact duplicate', () => {
    const references = buildCurriculumObjectiveReferences(INITIAL_KNOWLEDGE_BANK);
    expect(references.length).toBeGreaterThan(0);
    const model = buildObjectiveReadModel(INITIAL_KNOWLEDGE_BANK);
    expect(model.some((item) => item.origin === 'CURRICULUM_REFERENCE')).toBe(true);
    const duplicate = {
      ...INITIAL_KNOWLEDGE_BANK.find((item) => item.category === 'objective')!,
      description: references[0].description,
      title: references[0].description,
      fieldId: references[0].fieldId,
      levelId: references[0].levelId,
      levelIds: undefined,
    };
    expect(
      buildObjectiveReadModel([duplicate]).filter(
        (item) =>
          item.description === references[0].description &&
          item.fieldId === references[0].fieldId &&
          item.levelId === references[0].levelId
      )
    ).toHaveLength(1);
  });

  it('does not count retired situation KnowledgeItems in the baseline', () => {
    expect(matrix.reduce((sum, cell) => sum + cell.situationsCount, 0)).toBeGreaterThan(0);
    expect(INITIAL_KNOWLEDGE_BANK.filter((item) => item.category === 'situation')).toHaveLength(1);
  });

  it('limits detailed coverage diagnostics to admin and inspector', () => {
    expect(canViewCoverageDiagnostics('admin')).toBe(true);
    expect(canViewCoverageDiagnostics('inspector')).toBe(true);
    expect(canViewCoverageDiagnostics('teacher')).toBe(false);
    expect(canViewCoverageDiagnostics('director')).toBe(false);
  });
});
