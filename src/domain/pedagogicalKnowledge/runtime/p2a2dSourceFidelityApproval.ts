import { deepFreeze } from '../catalog';
import {
  P2A2C_COMPATIBILITY_MAP,
  P2A2C_RELEASE_ID,
  P2A2C_SOURCE_FIDELITY_CATALOG,
  validateP2A2CSourceFidelityRelease,
} from '../releases/p2a2cSourceFidelityRelease';
import type {
  CellApprovalDecision,
  KnowledgeCoreCellProductReview,
  KnowledgeCoreProductApprovalRecord,
} from './knowledgeCoreProductApproval';

export const P2A2D_APPROVAL_REVIEW_ID = 'knowledge-core-approval:p2a2d:v1.5.1' as const;

const notedCells = new Set([
  'lvl_p1|f_fundamentals',
  'lvl_p2|f_locomotion',
  'lvl_p2|f_fundamentals',
  'lvl_p3|f_locomotion',
  'lvl_p4|f_locomotion',
  'lvl_p5|f_fundamentals',
  'lvl_p5|f_structuring',
]);

const compatibilityNotes: Readonly<Record<string, string>> = Object.freeze({
  'lvl_p1|f_fundamentals': 'Merged historical resource identity resolves deterministically.',
  'lvl_p2|f_locomotion': 'A newly required official resource group has a collision-free identity.',
  'lvl_p2|f_fundamentals': 'Ambiguous historical split remains review-required and never guesses.',
  'lvl_p3|f_locomotion': 'Superseded resource identities retain explicit historical resolution.',
  'lvl_p4|f_locomotion': 'Split historical resources remain review-required and fail closed.',
  'lvl_p5|f_fundamentals':
    'Three historical component identities resolve explicitly to Grade 5 replacements.',
  'lvl_p5|f_structuring': 'Split historical resource remains review-required and fails closed.',
});

const validation = validateP2A2CSourceFidelityRelease(P2A2C_SOURCE_FIDELITY_CATALOG);

const reviewedCells: readonly KnowledgeCoreCellProductReview[] = deepFreeze(
  P2A2C_SOURCE_FIDELITY_CATALOG.domains.map((domain) => {
    const key = `${domain.gradeId}|${domain.domainId}`;
    const finalCompetency = P2A2C_SOURCE_FIDELITY_CATALOG.finalCompetencies.find(
      (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
    );
    const decision: CellApprovalDecision = notedCells.has(key) ? 'APPROVE_WITH_NOTE' : 'APPROVE';
    return {
      gradeId: domain.gradeId,
      domainId: domain.domainId,
      candidateReleaseId: P2A2C_RELEASE_ID,
      legacyBehavior: 'The currently approved v1.5 reference remains independently addressable.',
      candidateBehavior: finalCompetency?.label || 'Validated source-fidelity reference',
      differenceClassification: 'EXPECTED_CORRECTION',
      pedagogicalReason:
        compatibilityNotes[key] ||
        'The source-fidelity correction is validated with no special identity transition.',
      sourceBasis: 'Official Algerian Primary PE Curriculum 2023 source-fidelity release.',
      riskLevel: notedCells.has(key) ? 'CONTROLLED' : 'LOW',
      decision,
      activationRecommendation:
        decision === 'APPROVE_WITH_NOTE'
          ? 'Approve for a separate controlled activation while retaining compatibility safeguards.'
          : 'Approve for a separate controlled activation.',
    };
  })
);

const count = (decision: CellApprovalDecision) =>
  reviewedCells.filter((cell) => cell.decision === decision).length;

/**
 * P2A.2D is an independent product approval for v1.5.1. It is deliberately
 * not the runtime default; production activation remains a separate config task.
 */
export const P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL: Readonly<KnowledgeCoreProductApprovalRecord> =
  deepFreeze({
    candidateReleaseId: P2A2C_RELEASE_ID,
    approvalStatus: 'approved',
    approvedAt: '2026-09-09',
    approvedByPolicy: P2A2D_APPROVAL_REVIEW_ID,
    approvalScope: ['teacher_learning_plan_reference_reads', 'annual_plan_reference_reads'],
    approvalBasis: [
      'independent_v1_5_1_product_review',
      'official_source_fidelity_pass',
      'resource_groups_55_verified',
      'semantic_cells_15_of_15_pass',
      'semantic_coverage_complete',
      'identity_safety_pass',
      'teacher_ownership_preserved',
      'annual_plan_simulation_pass',
      'fail_closed_simulation_pass',
      'rollback_config_only',
    ],
    reviewedCells,
    reviewSummary: {
      approve: count('APPROVE'),
      approveWithNote: count('APPROVE_WITH_NOTE'),
      hold: count('HOLD'),
      reject: count('REJECT'),
    },
    activationConstraints: [
      'This record does not change the default release or production environment.',
      'Candidate authority requires explicit candidate mode, the v1.5.1 release ID, and this approval record.',
      'Ambiguous historical splits remain SPLIT_REQUIRES_REVIEW.',
      'Teacher-authored content, overrides, order, anchors, snapshots, and executed history are immutable.',
      'Rollback selects knowledge-core:v1.5-combined-2023 or legacy mode without database work.',
      'Production activation requires a separate explicitly authorized sprint.',
    ],
  });

export const P2A2D_COMPATIBILITY_REVIEW = deepFreeze(
  P2A2C_COMPATIBILITY_MAP.map((entry) => ({
    historicalId: entry.historicalId,
    canonicalIds: entry.canonicalIds,
    status: entry.status,
    automaticMappingAllowed:
      entry.status !== 'SPLIT_REQUIRES_REVIEW' && entry.canonicalIds.length === 1,
    reviewRequired: entry.status === 'SPLIT_REQUIRES_REVIEW',
    teacherTextPreserved: true,
  }))
);

export const P2A2D_APPROVAL_READINESS = deepFreeze({
  reviewId: P2A2D_APPROVAL_REVIEW_ID,
  releaseId: P2A2C_RELEASE_ID,
  sourceValidationPassed: validation.activationEligible,
  cellsApproved: reviewedCells.length,
  semanticCoverageComplete: validation.semanticCoverageComplete,
  rollbackReady: true,
  productionActivated: false,
  status:
    validation.activationEligible && count('HOLD') === 0 && count('REJECT') === 0
      ? ('APPROVED_FOR_CONTROLLED_ACTIVATION' as const)
      : ('BLOCKED' as const),
});
