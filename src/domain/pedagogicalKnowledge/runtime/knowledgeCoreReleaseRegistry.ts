import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_HISTORICAL_IDENTITY_MAP,
  P1FC_RELEASE_ID,
  validateP1FCCombinedRelease,
} from '../releases/p1fcCombinedSemanticRelease';
import type { PedagogicalKnowledgeCatalog } from '../types';

export const DEFAULT_CANDIDATE_RELEASE_ID = P1FC_RELEASE_ID;
export const KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP = P1FC_HISTORICAL_IDENTITY_MAP;

export interface RegisteredKnowledgeCoreRelease {
  catalog: Readonly<PedagogicalKnowledgeCatalog>;
  validation: ReturnType<typeof validateP1FCCombinedRelease>;
  productApprovedByDefault: false;
}

const candidate = Object.freeze({
  catalog: P1FC_COMBINED_SEMANTIC_CATALOG,
  validation: validateP1FCCombinedRelease(P1FC_COMBINED_SEMANTIC_CATALOG),
  productApprovedByDefault: false as const,
});

const RELEASES: ReadonlyMap<string, RegisteredKnowledgeCoreRelease> = new Map([
  [P1FC_RELEASE_ID, candidate],
]);

export function getRegisteredKnowledgeCoreRelease(
  releaseId: string
): RegisteredKnowledgeCoreRelease | null {
  return RELEASES.get(releaseId) || null;
}

export function registeredKnowledgeCoreReleaseIds(): readonly string[] {
  return Object.freeze([...RELEASES.keys()]);
}
