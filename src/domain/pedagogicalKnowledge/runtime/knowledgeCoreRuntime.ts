import {
  DEFAULT_CANDIDATE_RELEASE_ID,
  getRegisteredKnowledgeCoreRelease,
  KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP,
} from './knowledgeCoreReleaseRegistry';
import { compareKnowledgeCoreCell } from './knowledgeCoreShadowComparison';
import type {
  KnowledgeCoreCell,
  KnowledgeCoreMode,
  KnowledgeCoreRuntime,
  KnowledgeCoreRuntimeConfig,
  KnowledgeCoreStatus,
  LegacyReferenceSnapshot,
} from './knowledgeCoreRuntime.types';

export const KNOWLEDGE_CORE_MODE_CONFIG = 'ARENASPEX_KNOWLEDGE_CORE_MODE';
export const KNOWLEDGE_CORE_RELEASE_CONFIG = 'ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID';
export const KNOWLEDGE_CORE_APPROVAL_CONFIG = 'ARENASPEX_KNOWLEDGE_CORE_PRODUCT_APPROVED';

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export function knowledgeCoreConfigFromEnvironment(
  environment: RuntimeEnvironment = {}
): KnowledgeCoreRuntimeConfig {
  return {
    mode: environment[KNOWLEDGE_CORE_MODE_CONFIG],
    releaseId: environment[KNOWLEDGE_CORE_RELEASE_CONFIG],
    productApproved: environment[KNOWLEDGE_CORE_APPROVAL_CONFIG] === 'true',
  };
}

function normalizeMode(value: string | undefined): KnowledgeCoreMode | null {
  return value === 'legacy' || value === 'shadow' || value === 'candidate' ? value : null;
}

export function createKnowledgeCoreRuntime(
  config: KnowledgeCoreRuntimeConfig = {},
  dependencies: {
    getRelease?: typeof getRegisteredKnowledgeCoreRelease;
  } = {}
): KnowledgeCoreRuntime {
  const requestedMode = config.mode || 'legacy';
  const parsedMode = normalizeMode(requestedMode);
  const requestedReleaseId = config.releaseId || DEFAULT_CANDIDATE_RELEASE_ID;
  const registered = (dependencies.getRelease || getRegisteredKnowledgeCoreRelease)(
    requestedReleaseId
  );
  const validCandidate = Boolean(registered?.validation.activationEligible);
  const productApproved = config.productApproved === true;
  let effectiveMode: KnowledgeCoreMode = parsedMode || 'legacy';
  let fallbackReason: string | undefined;

  if (!parsedMode) {
    effectiveMode = 'legacy';
    fallbackReason = 'INVALID_MODE';
  } else if (parsedMode !== 'legacy' && !registered) {
    effectiveMode = 'legacy';
    fallbackReason = 'UNKNOWN_RELEASE';
  } else if (parsedMode !== 'legacy' && !validCandidate) {
    effectiveMode = 'legacy';
    fallbackReason = 'CANDIDATE_VALIDATION_FAILED';
  } else if (parsedMode === 'candidate' && !productApproved) {
    effectiveMode = 'legacy';
    fallbackReason = 'PRODUCT_APPROVAL_REQUIRED';
  }

  const authority = effectiveMode === 'candidate' ? 'candidate' : 'legacy';
  const candidateParticipates = effectiveMode === 'shadow' || effectiveMode === 'candidate';
  const status: KnowledgeCoreStatus = Object.freeze({
    requestedMode,
    effectiveMode,
    authority,
    productApproved,
    candidateParticipates,
    diagnostic: Object.freeze({
      knowledgeCoreMode: effectiveMode,
      releaseId: registered?.catalog.release.id || null,
      validationStatus:
        parsedMode === 'legacy' ? 'NOT_REQUESTED' : validCandidate ? 'PASS' : 'FAIL',
      ...(fallbackReason ? { fallbackReason } : {}),
    }),
  });

  const getCell = (gradeId: string, domainId: string): KnowledgeCoreCell | null => {
    if (!candidateParticipates || !registered) return null;
    const finalCompetency = registered.catalog.finalCompetencies.find(
      (item) => item.gradeId === gradeId && item.domainId === domainId
    );
    if (!finalCompetency) return null;
    return Object.freeze({
      gradeId,
      domainId,
      finalCompetency,
      components: registered.catalog.competencyComponents.filter(
        (item) => item.gradeId === gradeId && item.domainId === domainId
      ),
      requirements: registered.catalog.learningRequirements.filter(
        (item) => item.gradeId === gradeId && item.domainId === domainId
      ),
      objectiveConcepts: registered.catalog.objectiveConcepts.filter(
        (item) => item.gradeId === gradeId && item.domainId === domainId
      ),
    });
  };

  return Object.freeze({
    getStatus: () => status,
    getReleaseMetadata: () =>
      candidateParticipates && registered ? registered.catalog.release : null,
    getGradeDomainCell: getCell,
    resolveObjectiveReference: (referenceId: string) => {
      const found = KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP.find(
        (item) => item.historicalId === referenceId
      );
      return Object.freeze(
        found || { historicalId: referenceId, status: 'UNKNOWN', canonicalIds: [] }
      );
    },
    evaluateCoverage: (gradeId, domainId, objectiveReferenceIds) => {
      const cell = getCell(gradeId, domainId);
      if (!cell) {
        return Object.freeze({
          releaseId: requestedReleaseId,
          coveredRequirementIds: [],
          missingRequirementIds: [],
          unmappedReferences: [...objectiveReferenceIds],
          semanticStatus: 'UNMAPPED' as const,
        });
      }
      const concepts = new Map(cell.objectiveConcepts.map((item) => [item.id, item]));
      const matched = objectiveReferenceIds.flatMap((id) => {
        const direct = concepts.get(id);
        if (direct) return [direct];
        const historical = KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP.find(
          (item) => item.historicalId === id
        );
        if (!historical || historical.status !== 'CANONICAL') return [];
        return historical.canonicalIds.flatMap((canonicalId) => {
          const concept = concepts.get(canonicalId);
          return concept ? [concept] : [];
        });
      });
      const covered = new Set<string>(matched.flatMap((item) => item.learningRequirementIds));
      const missing = cell.requirements.map((item) => item.id).filter((id) => !covered.has(id));
      const unmapped = objectiveReferenceIds.filter(
        (id) =>
          !concepts.has(id) &&
          !KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP.some(
            (item) => item.historicalId === id && item.status === 'CANONICAL'
          )
      );
      return Object.freeze({
        releaseId: registered!.catalog.release.id,
        coveredRequirementIds: [...covered],
        missingRequirementIds: missing,
        unmappedReferences: unmapped,
        semanticStatus:
          covered.size === 0
            ? ('UNMAPPED' as const)
            : missing.length
              ? ('PARTIAL' as const)
              : ('COMPLETE' as const),
      });
    },
    compareLegacyReference: (snapshot: LegacyReferenceSnapshot) =>
      effectiveMode === 'shadow'
        ? compareKnowledgeCoreCell(snapshot, getCell(snapshot.gradeId, snapshot.domainId))
        : null,
  });
}

/** Default-deny runtime used by product features. Deployment stays legacy until
 * a later, explicitly approved activation task supplies guarded configuration. */
const processEnvironment = (): RuntimeEnvironment => {
  const runtimeProcess = (globalThis as { process?: { env?: RuntimeEnvironment } }).process;
  return runtimeProcess?.env || {};
};

export const knowledgeCoreRuntime = createKnowledgeCoreRuntime(
  knowledgeCoreConfigFromEnvironment(processEnvironment())
);
