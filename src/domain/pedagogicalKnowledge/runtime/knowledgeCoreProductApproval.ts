import { COMPLETE_ANNUAL_CURRICULUM } from '../../../data/algerianCurriculum';
import {
  DEFAULT_CANDIDATE_RELEASE_ID,
  getRegisteredKnowledgeCoreRelease,
} from './knowledgeCoreReleaseRegistry';

export type ProductApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CellApprovalDecision = 'APPROVE' | 'APPROVE_WITH_NOTE' | 'HOLD' | 'REJECT';

export interface KnowledgeCoreCellProductReview {
  gradeId: string;
  domainId: string;
  candidateReleaseId: string;
  legacyBehavior: string;
  candidateBehavior: string;
  differenceClassification: 'EXPECTED_CORRECTION';
  pedagogicalReason: string;
  sourceBasis: string;
  riskLevel: 'LOW' | 'CONTROLLED';
  decision: CellApprovalDecision;
  activationRecommendation: string;
}

export interface KnowledgeCoreProductApprovalRecord {
  candidateReleaseId: string;
  approvalStatus: ProductApprovalStatus;
  approvedAt: string | null;
  approvedByPolicy: string;
  reviewedCells: readonly KnowledgeCoreCellProductReview[];
  reviewSummary: Readonly<{
    approve: number;
    approveWithNote: number;
    hold: number;
    reject: number;
  }>;
  activationConstraints: readonly string[];
}

const registeredCandidate = getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID);
const candidateCatalog = registeredCandidate?.validation.activationEligible
  ? registeredCandidate.catalog
  : null;

const domainReason: Readonly<Record<string, string>> = Object.freeze({
  f_locomotion:
    'Replaces broad legacy summaries with the reviewed progression for posture, movement, and contextual body control.',
  f_fundamentals:
    'Aligns fundamental motor actions with the official grade-specific execution progression.',
  f_structuring:
    'Removes generic group-activity contamination and restores the official space, tools, interventions, landmarks, rules, and collective-games progression.',
});

const sourceBasis =
  'Official Algerian Primary PE Curriculum 2023 (dz-primary-pe-2023) and reviewed P1F semantic derivation.';

const reviewedCells: readonly KnowledgeCoreCellProductReview[] = Object.freeze(
  (candidateCatalog?.domains || []).map((domain) => {
    const legacy = COMPLETE_ANNUAL_CURRICULUM[domain.gradeId]?.fields[domain.domainId];
    const candidate = candidateCatalog?.finalCompetencies.find(
      (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
    );
    const requiresNote =
      domain.domainId === 'f_locomotion' ||
      (domain.domainId === 'f_structuring' && domain.gradeId !== 'lvl_p5');
    return Object.freeze({
      gradeId: domain.gradeId,
      domainId: domain.domainId,
      candidateReleaseId: DEFAULT_CANDIDATE_RELEASE_ID,
      legacyBehavior: legacy?.finalCompetency || 'Legacy reference unavailable',
      candidateBehavior: candidate?.label || 'Candidate reference unavailable',
      differenceClassification: 'EXPECTED_CORRECTION' as const,
      pedagogicalReason: domainReason[domain.domainId],
      sourceBasis,
      riskLevel: requiresNote ? ('CONTROLLED' as const) : ('LOW' as const),
      decision: requiresNote ? ('APPROVE_WITH_NOTE' as const) : ('APPROVE' as const),
      activationRecommendation: requiresNote
        ? 'Approve for guarded reference reads; retain historical reconciliation and non-covering moved/split safeguards.'
        : 'Approve for guarded reference reads after explicit Gate J product approval.',
    });
  })
);

const count = (decision: CellApprovalDecision) =>
  reviewedCells.filter((cell) => cell.decision === decision).length;

/**
 * Review is complete, but this repository task contains no explicit human
 * product-approval grant. Runtime authority therefore remains default-deny.
 */
export const KNOWLEDGE_CORE_PRODUCT_APPROVAL: Readonly<KnowledgeCoreProductApprovalRecord> =
  Object.freeze({
    candidateReleaseId: DEFAULT_CANDIDATE_RELEASE_ID,
    approvalStatus: 'pending',
    approvedAt: null,
    approvedByPolicy: 'explicit_product_decision_required',
    reviewedCells,
    reviewSummary: Object.freeze({
      approve: count('APPROVE'),
      approveWithNote: count('APPROVE_WITH_NOTE'),
      hold: count('HOLD'),
      reject: count('REJECT'),
    }),
    activationConstraints: Object.freeze([
      'Default runtime mode remains legacy.',
      'Candidate authority requires valid release, explicit candidate mode, and approved product record.',
      'Authority scope is limited to Teacher Learning Plan reference reads.',
      'Runtime activation is not Teacher-plan migration; P1E remains inactive.',
      'Switching mode to legacy is the immediate rollback.',
    ]),
  });
