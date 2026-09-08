import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import { P1FC_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { P2A2C_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/releases/p2a2cSourceFidelityRelease';
import { KNOWLEDGE_CORE_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import {
  KNOWLEDGE_CORE_PRODUCT_APPROVALS,
  resolveKnowledgeCoreProductApproval,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApprovalRegistry';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/p2a2dSourceFidelityApproval';
import { resolveAnnualPlanReferenceReadModel } from '../src/services/annualPlanReferenceReadModel';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';

describe('P2A.2F release-scoped approval resolution', () => {
  it('addresses the two immutable approval records independently', () => {
    expect(KNOWLEDGE_CORE_PRODUCT_APPROVALS).toHaveLength(2);
    expect(resolveKnowledgeCoreProductApproval(P1FC_RELEASE_ID)).toBe(
      KNOWLEDGE_CORE_PRODUCT_APPROVAL
    );
    expect(resolveKnowledgeCoreProductApproval(P2A2C_RELEASE_ID)).toBe(
      P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL
    );
  });

  it('never permits cross-release approval inheritance', () => {
    expect(
      createKnowledgeCoreRuntime(
        { mode: 'candidate', releaseId: P2A2C_RELEASE_ID },
        { approvalRecord: KNOWLEDGE_CORE_PRODUCT_APPROVAL }
      ).getStatus()
    ).toMatchObject({
      authority: 'legacy',
      diagnostic: { fallbackReason: 'PRODUCT_APPROVAL_REQUIRED' },
    });
    expect(
      createKnowledgeCoreRuntime(
        { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
        { approvalRecord: P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL }
      ).getStatus()
    ).toMatchObject({
      authority: 'legacy',
      diagnostic: { fallbackReason: 'PRODUCT_APPROVAL_REQUIRED' },
    });
  });

  it('fails closed for missing and duplicate approval records', () => {
    expect(resolveKnowledgeCoreProductApproval('known-without-approval')).toBeNull();
    expect(
      resolveKnowledgeCoreProductApproval(P1FC_RELEASE_ID, [
        KNOWLEDGE_CORE_PRODUCT_APPROVAL,
        KNOWLEDGE_CORE_PRODUCT_APPROVAL,
      ])
    ).toBeNull();
    expect(
      createKnowledgeCoreRuntime(
        { mode: 'candidate', releaseId: P2A2C_RELEASE_ID },
        { resolveApproval: () => null }
      ).getStatus()
    ).toMatchObject({
      authority: 'legacy',
      diagnostic: { fallbackReason: 'PRODUCT_APPROVAL_REQUIRED' },
    });
  });

  it('preserves unknown release and invalid mode reasons', () => {
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

  it.each([
    [P1FC_RELEASE_ID, P1FC_RELEASE_ID],
    [P2A2C_RELEASE_ID, P2A2C_RELEASE_ID],
  ])('authorizes candidate runtime for the exact approved release %s', (releaseId, expected) => {
    expect(createKnowledgeCoreRuntime({ mode: 'candidate', releaseId }).getStatus()).toMatchObject({
      requestedMode: 'candidate',
      effectiveMode: 'candidate',
      authority: 'candidate',
      releaseId: expected,
      approvalStatus: 'approved',
      productApproved: true,
      diagnostic: { validationStatus: 'PASS' },
    });
    expect(
      createKnowledgeCoreRuntime({ mode: 'candidate', releaseId }).getStatus().diagnostic
        .fallbackReason
    ).toBeUndefined();
  });

  it('preserves legacy authority', () => {
    expect(createKnowledgeCoreRuntime({ mode: 'legacy' }).getStatus()).toMatchObject({
      effectiveMode: 'legacy',
      authority: 'legacy',
    });
  });

  it.each([P1FC_RELEASE_ID, P2A2C_RELEASE_ID])(
    'keeps Annual Plan behind runtime for %s',
    (releaseId) => {
      const runtime = createKnowledgeCoreRuntime({ mode: 'candidate', releaseId });
      const model = resolveAnnualPlanReferenceReadModel('lvl_p5', runtime);
      expect(model.provenance).toMatchObject({ authority: 'candidate', releaseId });
      expect(model.domains).toHaveLength(3);
    }
  );

  it('does not mutate Teacher-owned plans or persistence', () => {
    const plan = seedTeacherLearningPlan('lvl_p1', {
      f_locomotion__2: { objective: 'صياغة الأستاذ الخاصة' },
    });
    const before = structuredClone(plan);
    createKnowledgeCoreRuntime({
      mode: 'candidate',
      releaseId: P2A2C_RELEASE_ID,
    }).getAnnualPlanReference('lvl_p1');
    expect(plan).toEqual(before);
    const files = [
      'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApprovalRegistry.ts',
      'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.ts',
    ].map((file) => readFileSync(join(process.cwd(), file), 'utf8'));
    expect(files.join('\n')).not.toMatch(/prisma\.|createMany|updateMany|deleteMany|\$transaction/);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });
});
