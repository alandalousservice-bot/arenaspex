import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_RELEASE_ID,
  validateP1FCCombinedRelease,
} from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import {
  KNOWLEDGE_CORE_ACTIVATION_STATE,
  KNOWLEDGE_CORE_GATE_J_STATUS,
  KNOWLEDGE_CORE_PRODUCT_APPROVAL,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const candidateRuntime = () =>
  createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: P1FC_RELEASE_ID });

describe('P1K controlled production activation', () => {
  it('records release-specific product approval and closes Gate J', () => {
    expect(KNOWLEDGE_CORE_PRODUCT_APPROVAL).toMatchObject({
      candidateReleaseId: P1FC_RELEASE_ID,
      approvalStatus: 'approved',
      approvedByPolicy: 'explicit_product_owner_approval_p1k',
    });
    expect(KNOWLEDGE_CORE_PRODUCT_APPROVAL.approvalScope).toEqual([
      'teacher_learning_plan_reference_reads',
    ]);
    expect(KNOWLEDGE_CORE_GATE_J_STATUS).toBe('APPROVED');
    expect(KNOWLEDGE_CORE_ACTIVATION_STATE).toBe('APPROVED_FOR_CONTROLLED_ACTIVATION');
  });

  it('does not wildcard approval to a future release', () => {
    const result = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: 'knowledge-core:v1.6-future' },
      {
        getRelease: () => ({
          catalog: P1FC_COMBINED_SEMANTIC_CATALOG,
          validation: validateP1FCCombinedRelease(P1FC_COMBINED_SEMANTIC_CATALOG),
          productApprovedByDefault: false,
        }),
      }
    );
    expect(result.getStatus()).toMatchObject({
      authority: 'legacy',
      diagnostic: { fallbackReason: 'PRODUCT_APPROVAL_REQUIRED' },
    });
  });

  it.each([
    [undefined, 'legacy'],
    ['legacy', 'legacy'],
    ['shadow', 'legacy'],
  ])('preserves %s mode authority as %s', (mode, authority) => {
    expect(createKnowledgeCoreRuntime({ mode }).getStatus().authority).toBe(authority);
  });

  it('selects approved v1.5 only through explicit candidate configuration', () => {
    expect(candidateRuntime().getStatus()).toMatchObject({
      requestedMode: 'candidate',
      effectiveMode: 'candidate',
      authority: 'candidate',
      releaseId: P1FC_RELEASE_ID,
      approvalStatus: 'approved',
      productApproved: true,
    });
  });

  it('fails closed for an unknown release', () => {
    expect(
      createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: 'unknown' }).getStatus().diagnostic
        .fallbackReason
    ).toBe('UNKNOWN_RELEASE');
  });

  it('fails closed for a missing approval', () => {
    const pending = { ...KNOWLEDGE_CORE_PRODUCT_APPROVAL, approvalStatus: 'pending' as const };
    expect(
      createKnowledgeCoreRuntime(
        { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
        { approvalRecord: pending }
      ).getStatus().diagnostic.fallbackReason
    ).toBe('PRODUCT_APPROVAL_REQUIRED');
  });

  it('fails closed for invalid candidate validation', () => {
    const invalid = structuredClone(P1FC_COMBINED_SEMANTIC_CATALOG) as PedagogicalKnowledgeCatalog;
    invalid.domains = invalid.domains.slice(1);
    const result = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
      {
        getRelease: () => ({
          catalog: invalid,
          validation: validateP1FCCombinedRelease(invalid),
          productApprovedByDefault: false,
        }),
      }
    );
    expect(result.getStatus().diagnostic.fallbackReason).toBe('CANDIDATE_VALIDATION_FAILED');
  });

  it('rolls candidate authority back to legacy using configuration only', () => {
    expect(candidateRuntime().getStatus().authority).toBe('candidate');
    expect(createKnowledgeCoreRuntime({ mode: 'legacy' }).getStatus()).toMatchObject({
      authority: 'legacy',
      candidateParticipates: false,
    });
  });

  it('queries all 15 candidate cells and complete semantic coverage', () => {
    const runtime = candidateRuntime();
    const cells = P1FC_COMBINED_SEMANTIC_CATALOG.domains.map((domain) =>
      runtime.getGradeDomainCell(domain.gradeId, domain.domainId)
    );
    expect(cells.filter(Boolean)).toHaveLength(15);
    for (const cell of cells) {
      expect(
        runtime.evaluateCoverage(
          cell!.gradeId,
          cell!.domainId,
          cell!.objectiveConcepts.map((concept) => concept.id)
        ).semanticStatus
      ).toBe('COMPLETE');
    }
  });

  it.each([
    ['lvl_p3:f_locomotion__7', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__6', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__3', 'SPLIT_REQUIRES_REVIEW'],
  ])('preserves historical safeguard %s as %s', (id, status) => {
    expect(candidateRuntime().resolveObjectiveReference(id).status).toBe(status);
  });

  it('preserves shadow authority and its reviewed comparison behavior', () => {
    const shadow = createKnowledgeCoreRuntime({ mode: 'shadow' });
    expect(shadow.getStatus().authority).toBe('legacy');
    expect(
      shadow.compareLegacyReference({
        gradeId: 'lvl_p1',
        domainId: 'f_structuring',
        finalCompetency: 'المشاركة في أنشطة جماعية بسيطة مع احترام التنظيم والقواعد.',
      })?.status
    ).toBe('EXPECTED_CORRECTION');
  });

  it('keeps default legacy Teacher plan output and Teacher ownership unchanged', () => {
    const plan = seedTeacherLearningPlan('lvl_p1', {
      f_locomotion__2: { objective: 'صياغة الأستاذ الخاصة' },
    });
    const before = structuredClone(plan);
    candidateRuntime().getGradeDomainCell('lvl_p1', 'f_locomotion');
    expect(plan).toEqual(before);
  });

  it('routes the Teacher reference read through the guarded boundary only', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/services/teacherLearningPlan.service.ts'),
      'utf8'
    );
    expect(source).toContain('referenceRuntime.getStatus().authority');
    expect(source).toContain('referenceRuntime.getGradeDomainCell');
    expect(source).toContain('referenceRuntime: KnowledgeCoreRuntime = knowledgeCoreRuntime');
    expect(source).not.toContain('p1fcCombinedSemanticRelease');
    expect(source).not.toContain('officialCurriculum2023');
  });

  it('performs no persistence or executed-history mutation and keeps P1E inactive', () => {
    const runtimeSource = readFileSync(
      join(process.cwd(), 'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.ts'),
      'utf8'
    );
    expect(runtimeSource).not.toMatch(/prisma|fetch\(|createMany|updateMany|deleteMany/);
    expect(runtimeSource).not.toMatch(/ClassPlannedSession|NotebookEntry|LessonPlan|Assessment/);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });

  it('keeps structured status free of personal and Teacher-authored text', () => {
    const status = candidateRuntime().getStatus();
    expect(status).toMatchObject({
      requestedMode: 'candidate',
      effectiveMode: 'candidate',
      authority: 'candidate',
      releaseId: P1FC_RELEASE_ID,
      approvalStatus: 'approved',
      diagnostic: { validationStatus: 'PASS', authority: 'candidate' },
    });
    expect(JSON.stringify(status)).not.toMatch(/teacherName|studentData|teacherText|personalData/);
  });
});
