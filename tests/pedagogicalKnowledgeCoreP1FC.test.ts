import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateCompetencyCoverage } from '../src/domain/pedagogicalKnowledge/engine/competencyCoverage.service';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import { P1FA_DOMAIN_TWO_AND_THREE_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1faDomainTwoAndThree';
import { P1FB_DOMAIN_ONE_CORRECTION_CATALOG } from '../src/domain/pedagogicalKnowledge/releases/p1fbDomainOneCorrection';
import {
  P1FC_ACTIVATION_READINESS,
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_EXECUTED_HISTORY_POLICY,
  P1FC_HISTORICAL_IDENTITY_MAP,
  P1FC_INCLUDED_RELEASES,
  P1FC_RELEASE_ID,
  P1FC_RELEASE_MANIFEST,
  P1FC_RELEASE_SELECTION_POLICY,
  validateP1FCCombinedRelease,
} from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { OFFICIAL_CURRICULUM_2023 } from '../src/domain/pedagogicalKnowledge/source/officialCurriculum2023';
import { projectTeacherPlanSemantics } from '../src/domain/pedagogicalKnowledge/teacherPlanSemanticAdapter';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
const catalog = P1FC_COMBINED_SEMANTIC_CATALOG;

describe('P1F-C combined semantic activation candidate', () => {
  it('assembles the exact immutable 15-cell matrix and reviewed lineage', () => {
    expect(P1FC_RELEASE_MANIFEST).toMatchObject({
      sourceArtifactId: 'dz-primary-pe-2023',
      sourceVersion: '2023',
      status: 'ACTIVATION_CANDIDATE',
    });
    expect(P1FC_INCLUDED_RELEASES).toEqual([
      'knowledge-core:v1.4-domain1-correction',
      'knowledge-core:v1.3-domain2-domain3',
    ]);
    expect(catalog.release.status).toBe('activation_candidate');
    expect(catalog.grades).toHaveLength(5);
    expect(catalog.domains).toHaveLength(15);
    expect(catalog.finalCompetencies).toHaveLength(15);
    expect(catalog.competencyComponents).toHaveLength(45);
    expect(catalog.learningRequirements).toHaveLength(57);
    expect(catalog.objectiveConcepts).toHaveLength(72);
    expect(catalog.objectiveVariants).toHaveLength(35);
    expect(catalog.objectiveKeys).toHaveLength(0);
    expect(Object.isFrozen(catalog)).toBe(true);
  });

  it('passes deterministic 15-cell integrity, traceability, and semantic coverage validation', () => {
    const first = validateP1FCCombinedRelease(catalog);
    const second = validateP1FCCombinedRelease(catalog);
    expect(first).toEqual(second);
    expect(first.errors).toEqual([]);
    expect(first.cellResults).toHaveLength(15);
    expect(first.cellResults.every((item) => item.status === 'PASS')).toBe(true);
    expect(first.semanticCoverageComplete).toBe(true);
    expect(first.activationEligible).toBe(true);
  });

  it('uses corrected D1 and unchanged closed D2/D3 semantics', () => {
    expect(
      catalog.objectiveConcepts.some(
        (item) => item.id === 'objective-concept:lvl_p3:f_locomotion:stationary-two-hand-throw'
      )
    ).toBe(true);
    expect(
      catalog.objectiveConcepts.some(
        (item) => item.id === 'objective-concept:lvl_p3:f_locomotion:5'
      )
    ).toBe(false);
    expect(
      catalog.objectiveConcepts
        .filter((item) => item.domainId !== 'f_locomotion')
        .map((item) => item.id)
    ).toEqual(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.objectiveConcepts.map((item) => item.id));
    expect(OFFICIAL_CURRICULUM_2023.contentHash).toBe('fnv1a32:cfe67657');
    expect(P1FA_DOMAIN_TWO_AND_THREE_CATALOG.release.catalogHash).toBe('fnv1a32:a4f5de33');
    expect(P1FB_DOMAIN_ONE_CORRECTION_CATALOG.release.catalogHash).toBe('fnv1a32:d352df5b');
  });

  it('separates semantic completeness from runtime activation authority in every cell', () => {
    for (const domain of catalog.domains) {
      const concepts = catalog.objectiveConcepts.filter(
        (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
      );
      const result = calculateCompetencyCoverage({
        catalog,
        coreReleaseId: P1FC_RELEASE_ID,
        gradeId: domain.gradeId,
        domainId: domain.domainId,
        finalCompetencyId: `fc_${domain.gradeId}_${domain.domainId}`,
        teacherObjectives: concepts.map((item) => ({
          teacherObjectiveId: `t:${item.id}`,
          objectiveConceptId: item.id,
        })),
      });
      expect(result.coveredRequirements).toHaveLength(
        catalog.learningRequirements.filter(
          (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
        ).length
      );
      expect(result.coverageStatus).toBe('indeterminate');
      expect(result.indeterminateReasons).toContain(
        'The requested knowledge-core release is not active.'
      );
    }
    expect(validateP1FCCombinedRelease(catalog).semanticCoverageComplete).toBe(true);
  });

  it('keeps same motor families contextually distinct without false identity', () => {
    const d1 = catalog.objectiveConcepts.filter(
      (item) => item.gradeId === 'lvl_p5' && item.domainId === 'f_locomotion'
    );
    const d2 = catalog.objectiveConcepts.filter(
      (item) => item.gradeId === 'lvl_p5' && item.domainId === 'f_fundamentals'
    );
    expect(d1.map((item) => item.label).join(' ')).toMatch(/وضعية|ينتقل/);
    expect(d2.map((item) => item.label).join(' ')).toMatch(/تقنية|ديناميكية|الوثب|الرمي/);
    expect(new Set([...d1, ...d2].map((item) => item.id)).size).toBe(d1.length + d2.length);
  });

  it('classifies G3 speed, G5 obstacle, split, replacements, and supersession safely', () => {
    const byId = new Map(P1FC_HISTORICAL_IDENTITY_MAP.map((item) => [item.historicalId, item]));
    expect(byId.get('lvl_p3:f_locomotion__7')?.status).toBe('MOVED_DOMAIN');
    expect(byId.get('lvl_p5:f_locomotion__6')?.status).toBe('MOVED_DOMAIN');
    expect(byId.get('lvl_p5:f_locomotion__3')?.status).toBe('SPLIT_REQUIRES_REVIEW');
    expect(byId.get('lvl_p5:f_locomotion__3')?.canonicalIds).toHaveLength(2);
    expect(byId.get('objective-concept:lvl_p3:f_locomotion:5')?.status).toBe('SUPERSEDED');
    expect([...byId.values()].filter((item) => item.status === 'CANONICAL')).toHaveLength(4);
  });

  it('resolves approved replacements read-only while preserving Teacher-owned shape', () => {
    const domain = {
      fieldId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p4_f_locomotion',
      objectives: [
        { id: 'custom', text: 'صياغة خاصة', orderIndex: 2 },
        {
          id: 'legacy',
          text: 'النص التاريخي',
          orderIndex: 1,
          sourceReferenceId: 'f_locomotion__6',
        },
      ],
      integrationPoints: [
        { id: 'manual', afterObjectiveId: 'custom', orderIndex: 1, label: 'موضع إدماج خاص' },
      ],
      notes: 'ملاحظة',
    };
    const before = structuredClone(domain);
    const result = projectTeacherPlanSemantics({
      catalog,
      coreReleaseId: P1FC_RELEASE_ID,
      gradeId: 'lvl_p4',
      domainId: 'f_locomotion',
      finalCompetencyId: 'fc_lvl_p4_f_locomotion',
      domain,
    });
    expect(
      result.objectiveResolutions.find((item) => item.teacherObjectiveId === 'legacy')
        ?.resolutionStatus
    ).toBe('source_reference');
    expect(result.unmappedObjectives.map((item) => item.teacherObjectiveId)).toContain('custom');
    expect(domain).toEqual(before);
  });

  it('fails closed for invalid, incomplete, and critically contaminated candidates', () => {
    const invalid = structuredClone(catalog) as PedagogicalKnowledgeCatalog;
    invalid.release.id = 'unknown';
    expect(validateP1FCCombinedRelease(invalid).activationEligible).toBe(false);
    const incomplete = structuredClone(catalog) as PedagogicalKnowledgeCatalog;
    incomplete.learningRequirements = incomplete.learningRequirements.slice(1);
    expect(validateP1FCCombinedRelease(incomplete).activationEligible).toBe(false);
    const collision = structuredClone(catalog) as PedagogicalKnowledgeCatalog;
    const target = collision.objectiveConcepts.find((item) => item.domainId === 'f_structuring')!;
    target.label = 'نشاط جماعي بسيط';
    expect(
      validateP1FCCombinedRelease(collision).errors.some(
        (item) => item.code === 'CRITICAL_COLLISION'
      )
    ).toBe(true);
  });

  it('defines rollback, executed-history protection, readiness gates, and P1E separation', () => {
    expect(P1FC_RELEASE_SELECTION_POLICY).toMatchObject({
      runtimeWired: false,
      defaultWhenUnset: 'preserve_existing_runtime_authority',
    });
    expect(P1FC_EXECUTED_HISTORY_POLICY).toMatchObject({
      rewriteHistoricalRecords: false,
      rewriteTeacherPlans: false,
    });
    expect(P1FC_ACTIVATION_READINESS).toMatchObject({
      overallReadiness: 'READY_FOR_RUNTIME_INTEGRATION_SPRINT',
      runtimeIntegrationReady: false,
      productApproval: false,
    });
    expect(P1FC_ACTIVATION_READINESS.blockers).toEqual([
      'GATE_I_RUNTIME_INTEGRATION_PENDING',
      'GATE_J_PRODUCT_APPROVAL_PENDING',
    ]);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });

  it('has zero production imports and performs no input mutation', () => {
    const root = join(process.cwd(), 'src');
    const imports = walk(root)
      .filter((file) => !file.endsWith('p1fcCombinedSemanticRelease.ts'))
      .filter((file) => readFileSync(file, 'utf8').includes('p1fcCombinedSemanticRelease'))
      .map((file) => relative(root, file));
    expect(imports).toEqual([
      'domain\\pedagogicalKnowledge\\releases\\p2a2cSourceFidelityRelease.ts',
      'domain\\pedagogicalKnowledge\\runtime\\knowledgeCoreReleaseRegistry.ts',
    ]);
  });
});
