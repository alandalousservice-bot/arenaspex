import {
  KNOWLEDGE_CORE_PRODUCT_APPROVAL,
  type KnowledgeCoreProductApprovalRecord,
} from './knowledgeCoreProductApproval';
import { P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL } from './p2a2dSourceFidelityApproval';

export const KNOWLEDGE_CORE_PRODUCT_APPROVALS: readonly Readonly<KnowledgeCoreProductApprovalRecord>[] =
  Object.freeze([KNOWLEDGE_CORE_PRODUCT_APPROVAL, P2A2D_SOURCE_FIDELITY_PRODUCT_APPROVAL]);

/**
 * Resolves exactly one approval for the requested release. Missing and
 * duplicate records both fail closed; no default, latest, or family fallback
 * is permitted.
 */
export function resolveKnowledgeCoreProductApproval(
  releaseId: string,
  records: readonly Readonly<KnowledgeCoreProductApprovalRecord>[] = KNOWLEDGE_CORE_PRODUCT_APPROVALS
): Readonly<KnowledgeCoreProductApprovalRecord> | null {
  const matches = records.filter((record) => record.candidateReleaseId === releaseId);
  return matches.length === 1 ? matches[0] : null;
}
