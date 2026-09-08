import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import { P1FC_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import {
  P2A2C_RELEASE_ID,
  P2A2C_SOURCE_FIDELITY_CATALOG,
} from '../src/domain/pedagogicalKnowledge/releases/p2a2cSourceFidelityRelease';
import { KNOWLEDGE_CORE_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import {
  P2A2D_APPROVAL_READINESS,
  P2A2D_COMPATIBILITY_REVIEW,
  P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL,
} from '../src/domain/pedagogicalKnowledge/runtime/p2a2dSourceFidelityApproval';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { DEFAULT_CANDIDATE_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry';
import { resolveAnnualPlanReferenceReadModel } from '../src/services/annualPlanReferenceReadModel';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';

const approval = P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL;
const runtime = (approvalRecord = approval) =>
  createKnowledgeCoreRuntime(
    { mode: 'candidate', releaseId: P2A2C_RELEASE_ID },
    { approvalRecord }
  );

describe('P2A.2D independent product approval and activation readiness', () => {
  it('creates an independent approval without changing the v1.5 default approval', () => {
    expect(approval.candidateReleaseId).toBe(P2A2C_RELEASE_ID);
    expect(approval.approvedByPolicy).not.toBe(KNOWLEDGE_CORE_PRODUCT_APPROVAL.approvedByPolicy);
    expect(KNOWLEDGE_CORE_PRODUCT_APPROVAL.candidateReleaseId).toBe(P1FC_RELEASE_ID);
    expect(DEFAULT_CANDIDATE_RELEASE_ID).toBe(P1FC_RELEASE_ID);
  });

  it('approves all 15 cells with no HOLD or REJECT', () => {
    expect(approval.reviewedCells).toHaveLength(15);
    expect(approval.reviewSummary).toEqual({
      approve: 8,
      approveWithNote: 7,
      hold: 0,
      reject: 0,
    });
    expect(
      approval.reviewedCells.every((cell) => cell.candidateReleaseId === P2A2C_RELEASE_ID)
    ).toBe(true);
  });

  it('explicitly approves the uncontaminated G5/D2 cell', () => {
    const review = approval.reviewedCells.find(
      (cell) => cell.gradeId === 'lvl_p5' && cell.domainId === 'f_fundamentals'
    );
    const components = P2A2C_SOURCE_FIDELITY_CATALOG.competencyComponents.filter(
      (item) => item.gradeId === 'lvl_p5' && item.domainId === 'f_fundamentals'
    );
    const resources = P2A2C_SOURCE_FIDELITY_CATALOG.learningRequirements.filter(
      (item) => item.gradeId === 'lvl_p5' && item.domainId === 'f_fundamentals'
    );
    expect(review?.decision).toBe('APPROVE_WITH_NOTE');
    expect(review?.candidateBehavior).toBe(
      'ينجز حركات قاعدية مرتبطة بالجري والوثب للرمي بطريقة سليمة،'
    );
    expect(components).toHaveLength(3);
    expect(resources).toHaveLength(7);
    expect(components.every((item) => item.gradeId === 'lvl_p5')).toBe(true);
  });

  it.each([
    ['official-resource-group:lvl_p1:f_fundamentals:2', true, false],
    ['official-resource-group:lvl_p2:f_fundamentals:2', false, true],
    ['official-resource-group:lvl_p3:f_locomotion:1', false, true],
    ['official-resource-group:lvl_p4:f_locomotion:1', false, true],
    ['official-resource-group:lvl_p5:f_structuring:1', false, true],
    ['learning-section:lvl_p5:f_fundamentals:component:1', true, false],
  ])('reviews compatibility for %s without guessing', (historicalId, automatic, reviewRequired) => {
    expect(
      P2A2D_COMPATIBILITY_REVIEW.find((item) => item.historicalId === historicalId)
    ).toMatchObject({
      automaticMappingAllowed: automatic,
      reviewRequired,
      teacherTextPreserved: true,
    });
  });

  it('permits v1.5.1 only with its own approved record', () => {
    expect(runtime().getStatus()).toMatchObject({
      authority: 'candidate',
      releaseId: P2A2C_RELEASE_ID,
      productApproved: true,
    });
    expect(
      runtime({ ...approval, approvalStatus: 'pending', approvedAt: null }).getStatus()
    ).toMatchObject({
      authority: 'legacy',
      productApproved: false,
      diagnostic: { fallbackReason: 'PRODUCT_APPROVAL_REQUIRED' },
    });
    expect(
      createKnowledgeCoreRuntime(
        { mode: 'candidate', releaseId: P2A2C_RELEASE_ID },
        { approvalRecord: KNOWLEDGE_CORE_PRODUCT_APPROVAL }
      ).getStatus().authority
    ).toBe('legacy');
  });

  it('keeps legacy, v1.5, unknown, and invalid selections fail-safe', () => {
    expect(createKnowledgeCoreRuntime({ mode: 'legacy' }).getStatus().authority).toBe('legacy');
    expect(
      createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: P1FC_RELEASE_ID }).getStatus()
        .authority
    ).toBe('candidate');
    expect(
      createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: 'unknown' }).getStatus()
    ).toMatchObject({
      authority: 'legacy',
      diagnostic: { fallbackReason: 'UNKNOWN_RELEASE' },
    });
    expect(
      createKnowledgeCoreRuntime({ mode: 'invalid', releaseId: P2A2C_RELEASE_ID }).getStatus()
    ).toMatchObject({
      authority: 'legacy',
      diagnostic: { fallbackReason: 'INVALID_MODE' },
    });
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'resolves all Annual Plan references deterministically for %s',
    (gradeId) => {
      const model = resolveAnnualPlanReferenceReadModel(gradeId, runtime());
      expect(model.provenance).toMatchObject({
        authority: 'candidate',
        releaseId: P2A2C_RELEASE_ID,
      });
      expect(model.domains).toHaveLength(3);
      expect(model.domains.every((domain) => domain.finalCompetency.trim().length > 0)).toBe(true);
    }
  );

  it('preserves Teacher ownership and performs no persistence', () => {
    const plan = seedTeacherLearningPlan('lvl_p1', {
      f_locomotion__2: { objective: 'صياغة الأستاذ الخاصة' },
    });
    const before = structuredClone(plan);
    runtime().getAnnualPlanReference('lvl_p1');
    expect(plan).toEqual(before);
    const source = readFileSync(
      join(process.cwd(), 'src/domain/pedagogicalKnowledge/runtime/p2a2dSourceFidelityApproval.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/prisma\.|createMany|updateMany|deleteMany|\$transaction|fetch\(/);
  });

  it.each([
    ['lvl_p3:f_locomotion__7', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__6', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__3', 'SPLIT_REQUIRES_REVIEW'],
  ])('retains safeguard %s as %s', (referenceId, status) => {
    expect(runtime().resolveObjectiveReference(referenceId).status).toBe(status);
  });

  it('is rollback-ready but does not activate production or P1E', () => {
    expect(P2A2D_APPROVAL_READINESS).toMatchObject({
      cellsApproved: 15,
      semanticCoverageComplete: true,
      rollbackReady: true,
      productionActivated: false,
      status: 'APPROVED_FOR_CONTROLLED_ACTIVATION',
    });
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });
});
