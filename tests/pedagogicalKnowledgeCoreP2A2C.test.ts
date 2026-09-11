import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_RELEASE_ID,
} from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import {
  P2A2C_COMPATIBILITY_MAP,
  P2A2C_IDENTITY_TREATMENT_COUNTS,
  P2A2C_RELEASE_ID,
  P2A2C_SOURCE_FIDELITY_CATALOG,
  validateP2A2CSourceFidelityRelease,
} from '../src/domain/pedagogicalKnowledge/releases/p2a2cSourceFidelityRelease';
import {
  OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY,
  SOURCE_FIDELITY_RESOURCE_COUNTS,
} from '../src/domain/pedagogicalKnowledge/source/officialCurriculum2023SourceFidelity';
import {
  DEFAULT_CANDIDATE_RELEASE_ID,
  getRegisteredKnowledgeCoreRelease,
  registeredKnowledgeCoreReleaseIds,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { KNOWLEDGE_CORE_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import { resolveAnnualPlanReferenceReadModel } from '../src/services/annualPlanReferenceReadModel';

const sourceCells = OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY.grades.flatMap(
  (grade) => grade.domains
);
const approvedForSimulation = {
  ...KNOWLEDGE_CORE_PRODUCT_APPROVAL,
  candidateReleaseId: P2A2C_RELEASE_ID,
};
const runtime = () =>
  createKnowledgeCoreRuntime(
    { mode: 'candidate', releaseId: P2A2C_RELEASE_ID },
    { approvalRecord: approvedForSimulation }
  );

describe('P2A.2C immutable source-fidelity release', () => {
  it('preserves the approved v1.5 release byte-for-byte by hash and default selection', () => {
    expect(P1FC_COMBINED_SEMANTIC_CATALOG.release.catalogHash).toBe('fnv1a32:6fb5b915');
    expect(DEFAULT_CANDIDATE_RELEASE_ID).toBe(P1FC_RELEASE_ID);
    expect(getRegisteredKnowledgeCoreRelease(P1FC_RELEASE_ID)?.catalog).toBe(
      P1FC_COMBINED_SEMANTIC_CATALOG
    );
    expect(registeredKnowledgeCoreReleaseIds()).toEqual([P1FC_RELEASE_ID, P2A2C_RELEASE_ID]);
  });

  it('registers v1.5.1 as an independently approved activation candidate', () => {
    const registered = getRegisteredKnowledgeCoreRelease(P2A2C_RELEASE_ID)!;
    expect(registered.catalog.release.status).toBe('activation_candidate');
    expect(registered.productApprovedByDefault).toBe(false);
    expect(KNOWLEDGE_CORE_PRODUCT_APPROVAL.candidateReleaseId).toBe(P1FC_RELEASE_ID);
    expect(
      createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: P2A2C_RELEASE_ID }).getStatus()
        .authority
    ).toBe('candidate');
  });

  it('validates 5 grades, 15 cells, 15 final competencies, 45 components and 55 resources', () => {
    const validation = validateP2A2CSourceFidelityRelease(P2A2C_SOURCE_FIDELITY_CATALOG);
    expect(P2A2C_SOURCE_FIDELITY_CATALOG.grades).toHaveLength(5);
    expect(P2A2C_SOURCE_FIDELITY_CATALOG.domains).toHaveLength(15);
    expect(P2A2C_SOURCE_FIDELITY_CATALOG.finalCompetencies).toHaveLength(15);
    expect(P2A2C_SOURCE_FIDELITY_CATALOG.competencyComponents).toHaveLength(45);
    expect(P2A2C_SOURCE_FIDELITY_CATALOG.learningRequirements).toHaveLength(55);
    expect(validation.errors).toEqual([]);
    expect(validation.cellResults.every((cell) => cell.status === 'PASS')).toBe(true);
    expect(validation.semanticCoverageComplete).toBe(true);
  });

  it.each(sourceCells)('validates source cell $gradeId / $domainId', (cell) => {
    const expected = SOURCE_FIDELITY_RESOURCE_COUNTS[cell.gradeId][cell.domainId];
    expect(cell.competencyComponents).toHaveLength(3);
    expect(cell.resourceGroups).toHaveLength(expected);
    expect(cell.resourceGroups.every((group) => group.content.length > 0)).toBe(true);
    expect(
      cell.resourceGroups.every((group) => group.provenance === 'official_structured_extraction')
    ).toBe(true);
    expect(new Set(cell.resourceGroups.map((group) => group.id)).size).toBe(expected);
  });

  it('implements all nine verified wording and component corrections exactly', () => {
    const grade2 = OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY.grades[1];
    const grade5 = OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY.grades[4];
    expect(grade2.overallCompetency.text).toContain('حركات طبيعية بسيطة');
    expect(grade2.overallCompetency.text).not.toContain('طبيعية وبسيطة');
    expect(grade2.domains[1].finalCompetency.text).toBe(
      'ينفذ حركات طبيعية بسيطة في وضعيات متنوعة.'
    );
    expect(grade5.domains[1].finalCompetency.text).toBe(
      'ينجز حركات قاعدية مرتبطة بالجري والوثب للرمي بطريقة سليمة،'
    );
    expect(sourceCells[0].competencyComponents[1].text).toContain('تكامل أطرافه');
    expect(sourceCells[1].competencyComponents[0].text).toContain('والتحولات');
    expect(grade5.domains[0].competencyComponents[0].text).toContain(
      'في وضعيات الجري والوثب للرمي'
    );
  });

  it('uses the three official G5/D2 components and never the G3/D2 component set', () => {
    const g3 = sourceCells.find(
      (cell) => cell.gradeId === 'lvl_p3' && cell.domainId === 'f_fundamentals'
    )!;
    const g5 = sourceCells.find(
      (cell) => cell.gradeId === 'lvl_p5' && cell.domainId === 'f_fundamentals'
    )!;
    expect(g5.competencyComponents.map((item) => item.text)).toEqual([
      'يتعرف على الحركات القاعدية المرتبطة بالجري للوثب، للرمي حسب نوعية الأداة المستعملة.',
      'يختار الدينامية المناسبة حسب الوضعية والموقف.',
      'يتقيد بالتقنيات الملائمة للوضعية وللموقف.',
    ]);
    expect(g5.competencyComponents.map((item) => item.text)).not.toEqual(
      g3.competencyComponents.map((item) => item.text)
    );
    expect(g5.resourceGroups).toHaveLength(7);
    expect(
      g5.resourceGroups.every((group) => group.content.join(' ').length > group.label.length)
    ).toBe(true);
  });

  it('enforces the reconciled split and merge resource counts', () => {
    const count = (gradeId: string, domainId: string) =>
      sourceCells.find((cell) => cell.gradeId === gradeId && cell.domainId === domainId)!
        .resourceGroups.length;
    expect(count('lvl_p5', 'f_structuring')).toBe(4);
    expect(count('lvl_p4', 'f_locomotion')).toBe(4);
    expect(count('lvl_p3', 'f_locomotion')).toBe(3);
    expect(count('lvl_p2', 'f_fundamentals')).toBe(3);
    expect(count('lvl_p1', 'f_fundamentals')).toBe(1);
    expect(count('lvl_p2', 'f_locomotion')).toBe(5);
  });

  it('keeps compatibility deterministic and ambiguous splits fail closed', () => {
    const unique = new Set(P2A2C_COMPATIBILITY_MAP.map((item) => item.historicalId));
    expect(unique.size).toBe(P2A2C_COMPATIBILITY_MAP.length);
    const split = P2A2C_COMPATIBILITY_MAP.find(
      (item) => item.historicalId === 'official-resource-group:lvl_p5:f_structuring:1'
    )!;
    expect(split.status).toBe('SPLIT_REQUIRES_REVIEW');
    expect(split.canonicalIds).toHaveLength(2);
    const merged = P2A2C_COMPATIBILITY_MAP.find(
      (item) => item.historicalId === 'official-resource-group:lvl_p1:f_fundamentals:2'
    )!;
    expect(merged.status).toBe('SUPERSEDED');
    expect(merged.canonicalIds).toEqual(['official-resource-group:lvl_p1:f_fundamentals:1']);
    expect(P2A2C_IDENTITY_TREATMENT_COUNTS).toEqual({
      KEEP_ID_CONTENT_CORRECTION: 48,
      SUPERSEDE_ID: 5,
      SPLIT_ID: 4,
      MERGE_IDS: 2,
      NEW_ID_REQUIRED: 4,
      REMOVE_FALSE_OFFICIAL_RECORD: 2,
      REVIEW_IDENTITY: 0,
    });
  });

  it('preserves existing moved and split safeguards in the new runtime', () => {
    const candidate = runtime();
    expect(candidate.resolveObjectiveReference('lvl_p3:f_locomotion__7').status).toBe(
      'MOVED_DOMAIN'
    );
    expect(candidate.resolveObjectiveReference('lvl_p5:f_locomotion__6').status).toBe(
      'MOVED_DOMAIN'
    );
    expect(candidate.resolveObjectiveReference('lvl_p5:f_locomotion__3').status).toBe(
      'SPLIT_REQUIRES_REVIEW'
    );
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'simulates deterministic Annual Plan reads for %s without mutating overrides',
    (gradeId) => {
      const candidate = runtime();
      const first = resolveAnnualPlanReferenceReadModel(gradeId, candidate);
      const second = resolveAnnualPlanReferenceReadModel(gradeId, candidate);
      expect(first).toEqual(second);
      expect(first.provenance.releaseId).toBe(P2A2C_RELEASE_ID);
      expect(first.domains).toHaveLength(3);
    }
  );

  it('contains no persistence path and leaves P1E inactive', () => {
    const files = [
      'src/domain/pedagogicalKnowledge/source/officialCurriculum2023SourceFidelity.ts',
      'src/domain/pedagogicalKnowledge/releases/p2a2cSourceFidelityRelease.ts',
    ].map((file) => readFileSync(join(process.cwd(), file), 'utf8'));
    expect(files.join('\n')).not.toMatch(/prisma\.|createMany|updateMany|deleteMany|\$transaction/);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });
});
