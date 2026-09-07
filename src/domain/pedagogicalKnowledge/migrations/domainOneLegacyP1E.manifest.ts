import { deepFreeze } from '../catalog';
import {
  P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION,
  type DomainOneOperationalGradeId,
} from '../operationalReconciliation';
import {
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
  P1C_RELEASE_ID,
} from '../releases/p1cDomainOneGradesTwoToFive';

export type ReplacementDecisionStatus =
  'APPROVED_REPLACEMENT' | 'PENDING_PRODUCT_DECISION' | 'PRESERVE_LEGACY' | 'NO_SAFE_REPLACEMENT';

export interface DomainOneReferenceReplacement {
  legacyReferenceId: string;
  gradeId: DomainOneOperationalGradeId;
  domainId: 'f_locomotion';
  legacyWording: string;
  legacySemanticMeaning: string;
  canonicalObjectiveConceptId: string;
  canonicalVariantId: null;
  canonicalLearningRequirementIds: readonly string[];
  replacementWording: string;
  sourceEvidence: string;
  decisionStatus: ReplacementDecisionStatus;
  migrationSafety: 'UNMODIFIED_PLATFORM_DEFAULT_ONLY' | 'REVIEW_REQUIRED';
}

const conceptForPosition = (gradeId: DomainOneOperationalGradeId, sourceReferenceId: string) => {
  const gradeRows = P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter(
    (item) => item.gradeId === gradeId
  );
  const position = gradeRows.findIndex((item) => item.sourceReferenceId === sourceReferenceId) + 1;
  return P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts.find(
    (concept) => concept.id === `objective-concept:${gradeId}:f_locomotion:${position}`
  );
};

const migrationRows = P1D_DOMAIN_ONE_OPERATIONAL_RECONCILIATION.filter(
  (item) => item.decision === 'REPLACE_LATER' || item.decision === 'PRODUCT_DECISION_REQUIRED'
).map((item): DomainOneReferenceReplacement => {
  const positionalConcept = conceptForPosition(item.gradeId, item.sourceReferenceId);
  const concept =
    item.decision === 'PRODUCT_DECISION_REQUIRED' && item.canonicalConceptCandidateId
      ? P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts.find(
          (candidate) => candidate.id === item.canonicalConceptCandidateId
        )
      : positionalConcept;
  if (!concept) throw new Error(`Missing P1E canonical concept for ${item.id}`);
  const pending = item.decision === 'PRODUCT_DECISION_REQUIRED';
  return {
    legacyReferenceId: item.sourceReferenceId,
    gradeId: item.gradeId,
    domainId: item.domainId,
    legacyWording: item.operationalWording,
    legacySemanticMeaning: `${item.classification}: ${item.evidence}`,
    canonicalObjectiveConceptId: concept.id,
    canonicalVariantId: null,
    canonicalLearningRequirementIds: [...concept.learningRequirementIds],
    replacementWording: concept.label,
    sourceEvidence: `${item.id}; ${item.evidence}`,
    decisionStatus: pending ? 'PENDING_PRODUCT_DECISION' : 'APPROVED_REPLACEMENT',
    migrationSafety: pending ? 'REVIEW_REQUIRED' : 'UNMODIFIED_PLATFORM_DEFAULT_ONLY',
  };
});

export const DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST = deepFreeze({
  migrationId: 'knowledge-core:migration:p1e-domain1-legacy-v1',
  version: 1,
  fromReferenceVersion: 'legacy-algerian-curriculum-domain1',
  toCoreReleaseId: P1C_RELEASE_ID,
  gradeIds: ['lvl_p3', 'lvl_p4', 'lvl_p5'] as const,
  domainId: 'f_locomotion' as const,
  status: 'reviewed_not_activated' as const,
  referenceReplacementTable: migrationRows.filter(
    (item) => item.decisionStatus === 'APPROVED_REPLACEMENT'
  ),
  unresolvedProductDecisions: migrationRows.filter(
    (item) => item.decisionStatus === 'PENDING_PRODUCT_DECISION'
  ),
  integrationDefaultRepairRule: {
    historicalCause: 'objectives.at(-2)',
    proposedAnchor: 'final objective',
    evidenceRequired: 'untouched historical platform-default structure',
    ambiguousAction: 'PRESERVE_AND_REVIEW',
  },
  fieldOwnershipPolicyVersion: 1,
  historicalPreservationPolicy:
    'Materialized or executed sessions and their Notebook, Lesson Plan, attendance, or assessment snapshots are never rewritten.',
});
