import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_HISTORICAL_IDENTITY_MAP,
  P1FC_RELEASE_ID,
  validateP1FCCombinedRelease,
} from '../releases/p1fcCombinedSemanticRelease';
import {
  P2A2C_COMPATIBILITY_MAP,
  P2A2C_RELEASE_ID,
  P2A2C_SOURCE_FIDELITY_CATALOG,
  validateP2A2CSourceFidelityRelease,
} from '../releases/p2a2cSourceFidelityRelease';
import type { PedagogicalKnowledgeCatalog } from '../types';

export const DEFAULT_CANDIDATE_RELEASE_ID = P1FC_RELEASE_ID;
export const KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP = P1FC_HISTORICAL_IDENTITY_MAP;

export interface RegisteredKnowledgeCoreRelease {
  catalog: Readonly<PedagogicalKnowledgeCatalog>;
  validation: Readonly<{
    releaseId: string;
    errors: readonly { code: string; message: string; cell?: string }[];
    cellResults: readonly {
      cell: string;
      status: 'PASS' | 'BLOCK';
      errors: readonly string[];
    }[];
    semanticCoverageComplete: boolean;
    activationEligible: boolean;
  }>;
  historicalIdentityMap?: readonly {
    historicalId: string;
    status: string;
    canonicalIds: readonly string[];
  }[];
  productApprovedByDefault: false;
}

const candidate = Object.freeze({
  catalog: P1FC_COMBINED_SEMANTIC_CATALOG,
  validation: validateP1FCCombinedRelease(P1FC_COMBINED_SEMANTIC_CATALOG),
  historicalIdentityMap: P1FC_HISTORICAL_IDENTITY_MAP,
  productApprovedByDefault: false as const,
});

const sourceFidelityCandidate = Object.freeze({
  catalog: P2A2C_SOURCE_FIDELITY_CATALOG,
  validation: validateP2A2CSourceFidelityRelease(P2A2C_SOURCE_FIDELITY_CATALOG),
  historicalIdentityMap: P2A2C_COMPATIBILITY_MAP,
  productApprovedByDefault: false as const,
});

const RELEASES: ReadonlyMap<string, RegisteredKnowledgeCoreRelease> = new Map([
  [P1FC_RELEASE_ID, candidate],
  [P2A2C_RELEASE_ID, sourceFidelityCandidate],
]);

export function getRegisteredKnowledgeCoreRelease(
  releaseId: string
): RegisteredKnowledgeCoreRelease | null {
  return RELEASES.get(releaseId) || null;
}

export function registeredKnowledgeCoreReleaseIds(): readonly string[] {
  return Object.freeze([...RELEASES.keys()]);
}
