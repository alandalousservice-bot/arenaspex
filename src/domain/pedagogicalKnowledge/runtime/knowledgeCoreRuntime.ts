import {
  DEFAULT_CANDIDATE_RELEASE_ID,
  getRegisteredKnowledgeCoreRelease,
  KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP,
} from './knowledgeCoreReleaseRegistry';
import { compareKnowledgeCoreCell } from './knowledgeCoreShadowComparison';
import {
  KNOWLEDGE_CORE_PRODUCT_APPROVAL,
  type KnowledgeCoreProductApprovalRecord,
} from './knowledgeCoreProductApproval';
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

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

declare const __ARENASPEX_KNOWLEDGE_CORE_MODE__: string | undefined;
declare const __ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID__: string | undefined;

export function knowledgeCoreConfigFromEnvironment(
  environment: RuntimeEnvironment = {}
): KnowledgeCoreRuntimeConfig {
  return {
    mode: environment[KNOWLEDGE_CORE_MODE_CONFIG],
    releaseId: environment[KNOWLEDGE_CORE_RELEASE_CONFIG],
  };
}

function normalizeMode(value: string | undefined): KnowledgeCoreMode | null {
  return value === 'legacy' || value === 'shadow' || value === 'candidate' ? value : null;
}

export function createKnowledgeCoreRuntime(
  config: KnowledgeCoreRuntimeConfig = {},
  dependencies: {
    getRelease?: typeof getRegisteredKnowledgeCoreRelease;
    approvalRecord?: Readonly<KnowledgeCoreProductApprovalRecord>;
  } = {}
): KnowledgeCoreRuntime {
  const requestedMode = config.mode || 'legacy';
  const parsedMode = normalizeMode(requestedMode);
  const requestedReleaseId = config.releaseId || DEFAULT_CANDIDATE_RELEASE_ID;
  const registered = (dependencies.getRelease || getRegisteredKnowledgeCoreRelease)(
    requestedReleaseId
  );
  const validCandidate = Boolean(registered?.validation.activationEligible);
  const approvalRecord = dependencies.approvalRecord || KNOWLEDGE_CORE_PRODUCT_APPROVAL;
  const productApproved =
    approvalRecord.approvalStatus === 'approved' &&
    approvalRecord.candidateReleaseId === requestedReleaseId;
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
    releaseId: registered?.catalog.release.id || null,
    productApproved,
    approvalStatus: approvalRecord.approvalStatus,
    candidateParticipates,
    diagnostic: Object.freeze({
      knowledgeCoreMode: effectiveMode,
      releaseId: registered?.catalog.release.id || null,
      validationStatus:
        parsedMode === 'legacy' ? 'NOT_REQUESTED' : validCandidate ? 'PASS' : 'FAIL',
      approvalStatus: approvalRecord.approvalStatus,
      authority,
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
    getAnnualPlanReference: (gradeId: string) => {
      if (
        authority !== 'candidate' ||
        !registered ||
        !approvalRecord.approvalScope.includes('annual_plan_reference_reads')
      )
        return null;
      const grade = registered.catalog.grades.find((item) => item.gradeId === gradeId);
      const overallCompetency = registered.catalog.overallCompetencies.find(
        (item) => item.gradeId === gradeId
      );
      if (!grade || !overallCompetency) return null;
      const domains = registered.catalog.domains
        .filter((item) => item.gradeId === gradeId)
        .sort((left, right) => (left.order || 0) - (right.order || 0))
        .flatMap((domain) => {
          const finalCompetency = registered.catalog.finalCompetencies.find(
            (item) => item.gradeId === gradeId && item.domainId === domain.domainId
          );
          if (!finalCompetency) return [];
          return [
            Object.freeze({
              domain,
              finalCompetency,
              components: Object.freeze(
                registered.catalog.competencyComponents
                  .filter((item) => item.gradeId === gradeId && item.domainId === domain.domainId)
                  .sort((left, right) => (left.order || 0) - (right.order || 0))
              ),
            }),
          ];
        });
      if (domains.length !== 3) return null;
      return Object.freeze({
        releaseId: registered.catalog.release.id,
        grade,
        overallCompetency,
        domains: Object.freeze(domains),
      });
    },
    resolveObjectiveReference: (referenceId: string) => {
      const found = KNOWLEDGE_CORE_HISTORICAL_IDENTITY_MAP.find(
        (item) => item.historicalId === referenceId
      );
      return Object.freeze(
        found || { historicalId: referenceId, status: 'UNKNOWN', canonicalIds: [] }
      );
    },
    resolveCompetencyComponentReference: (gradeId, domainId, referenceId) => {
      const component = registered?.catalog.competencyComponents.find(
        (item) => item.id === referenceId
      );
      if (!component) return Object.freeze({ referenceId, status: 'UNKNOWN' as const });
      if (component.gradeId === gradeId && component.domainId === domainId) {
        return Object.freeze({
          referenceId,
          status: 'CANONICAL' as const,
          canonicalGradeId: component.gradeId,
          canonicalDomainId: component.domainId,
        });
      }
      return Object.freeze({
        referenceId,
        status: 'MOVED_DOMAIN' as const,
        canonicalGradeId: component.gradeId,
        canonicalDomainId: component.domainId,
      });
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
  if (runtimeProcess?.env) return runtimeProcess.env;
  return {
    [KNOWLEDGE_CORE_MODE_CONFIG]:
      typeof __ARENASPEX_KNOWLEDGE_CORE_MODE__ === 'string'
        ? __ARENASPEX_KNOWLEDGE_CORE_MODE__
        : undefined,
    [KNOWLEDGE_CORE_RELEASE_CONFIG]:
      typeof __ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID__ === 'string'
        ? __ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID__
        : undefined,
  };
};

export const knowledgeCoreRuntime = createKnowledgeCoreRuntime(
  knowledgeCoreConfigFromEnvironment(processEnvironment())
);
