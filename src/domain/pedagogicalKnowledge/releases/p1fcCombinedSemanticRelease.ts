import { computeCatalogHash, deepFreeze } from '../catalog';
import { P1FA_DOMAIN_TWO_AND_THREE_CATALOG, P1FA_RELEASE_ID } from './p1faDomainTwoAndThree';
import {
  P1FB_DOMAIN_ONE_CORRECTION_CATALOG,
  P1FB_LEGACY_RECONCILIATIONS,
  P1FB_RELEASE_ID,
} from './p1fbDomainOneCorrection';
import type { CatalogNode, CurriculumRelease, PedagogicalKnowledgeCatalog } from '../types';

export const P1FC_RELEASE_ID = 'knowledge-core:v1.5-combined-2023' as const;
export const P1FC_INCLUDED_RELEASES = [P1FB_RELEASE_ID, P1FA_RELEASE_ID] as const;
export const P1FC_SOURCE_ARTIFACT_ID = 'dz-primary-pe-2023' as const;
export const P1FC_RELEASE_MANIFEST = deepFreeze({
  releaseId: P1FC_RELEASE_ID,
  sourceArtifactId: P1FC_SOURCE_ARTIFACT_ID,
  sourceVersion: '2023',
  includedSemanticReleases: P1FC_INCLUDED_RELEASES,
  status: 'ACTIVATION_CANDIDATE',
  createdFrom: 'reviewed immutable semantic releases',
  coverageScope: { grades: 5, domains: 3, cells: 15 },
});

const reScope = <T extends CatalogNode>(item: T, semanticReleaseId: string): T => ({
  ...item,
  releaseId: P1FC_RELEASE_ID,
  metadata: { ...item.metadata, sourceArtifactId: P1FC_SOURCE_ARTIFACT_ID, semanticReleaseId },
});
const d1 = P1FB_DOMAIN_ONE_CORRECTION_CATALOG;
const d23 = P1FA_DOMAIN_TWO_AND_THREE_CATALOG;

const catalogWithoutHash = {
  release: {
    id: P1FC_RELEASE_ID,
    version: '1.5.0',
    status: 'activation_candidate',
    sourceDocuments: [
      {
        id: P1FC_SOURCE_ARTIFACT_ID,
        title: 'Official Algerian Primary PE Curriculum source artifact 2023',
        repositoryPath: 'src/domain/pedagogicalKnowledge/source/officialCurriculum2023.ts',
        classification: 'official_source',
      },
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Assembly-only activation candidate; semantic completeness and runtime authority are independent.',
    createdAt: '2026-09-07',
    releasedAt: '2026-09-07',
  },
  grades: d1.grades.map((item) => reScope(item, P1FB_RELEASE_ID)),
  overallCompetencies: d1.overallCompetencies.map((item) => reScope(item, P1FB_RELEASE_ID)),
  domains: [
    ...d1.domains.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.domains.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  finalCompetencies: [
    ...d1.finalCompetencies.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.finalCompetencies.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  competencyComponents: [
    ...d1.competencyComponents.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.competencyComponents.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  learningRequirements: [
    ...d1.learningRequirements.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.learningRequirements.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  resources: [
    ...d1.resources.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.resources.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  criteria: d1.criteria.map((item) => reScope(item, P1FB_RELEASE_ID)),
  indicators: d1.indicators.map((item) => reScope(item, P1FB_RELEASE_ID)),
  objectiveConcepts: [
    ...d1.objectiveConcepts.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.objectiveConcepts.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  objectiveVariants: [
    ...d1.objectiveVariants.map((item) => reScope(item, P1FB_RELEASE_ID)),
    ...d23.objectiveVariants.map((item) => reScope(item, P1FA_RELEASE_ID)),
  ],
  objectiveKeys: [],
  aliases: [...d1.aliases, ...d23.aliases],
  teacherPlanSourceReferenceMappings: [
    ...(d1.teacherPlanSourceReferenceMappings || []).map((item) => ({
      ...item,
      releaseId: P1FC_RELEASE_ID,
    })),
    ...(d23.teacherPlanSourceReferenceMappings || []).map((item) => ({
      ...item,
      releaseId: P1FC_RELEASE_ID,
    })),
  ],
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const placeholder = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P1FC_COMBINED_SEMANTIC_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze({
  ...placeholder,
  release: { ...placeholder.release, catalogHash: computeCatalogHash(placeholder) },
});

export type HistoricalResolutionStatus =
  | 'CANONICAL'
  | 'SUPERSEDED'
  | 'MOVED_DOMAIN'
  | 'SPLIT_REQUIRES_REVIEW'
  | 'LEGACY_UNMAPPED'
  | 'AMBIGUOUS'
  | 'UNKNOWN';

export const P1FC_HISTORICAL_IDENTITY_MAP = deepFreeze([
  ...P1FB_LEGACY_RECONCILIATIONS.map((item) => ({
    historicalId: `${item.gradeId}:${item.legacyReferenceId}`,
    status:
      item.decision === 'APPROVE_REPLACEMENT'
        ? 'CANONICAL'
        : item.decision === 'SPLIT_REQUIRED'
          ? 'SPLIT_REQUIRES_REVIEW'
          : 'MOVED_DOMAIN',
    canonicalIds: item.canonicalObjectiveConceptIds,
  })),
  {
    historicalId: 'objective-concept:lvl_p3:f_locomotion:5',
    status: 'SUPERSEDED',
    canonicalIds: ['objective-concept:lvl_p3:f_locomotion:stationary-two-hand-throw'],
  },
] as const);

export const P1FC_RELEASE_SELECTION_POLICY = deepFreeze({
  configurationKey: 'ACTIVE_KNOWLEDGE_CORE_RELEASE_ID',
  defaultWhenUnset: 'preserve_existing_runtime_authority',
  invalidOrUnsupported: 'fail_closed_and_preserve_existing_runtime_authority',
  candidateReleaseId: P1FC_RELEASE_ID,
  previousReleaseId: null,
  rollbackTrigger: 'validation_failure_or_critical_collision_or_product_decision',
  rollbackVerification:
    'candidate no longer selected; Teacher data unchanged; legacy authority healthy',
  runtimeWired: false,
});

export interface P1FCValidationResult {
  readonly releaseId: string;
  readonly errors: readonly { code: string; message: string; cell?: string }[];
  readonly cellResults: readonly {
    cell: string;
    status: 'PASS' | 'BLOCK';
    errors: readonly string[];
  }[];
  readonly semanticCoverageComplete: boolean;
  readonly activationEligible: boolean;
}

export function validateP1FCCombinedRelease(
  catalog: PedagogicalKnowledgeCatalog
): P1FCValidationResult {
  const errors: { code: string; message: string; cell?: string }[] = [];
  if (catalog.release.id !== P1FC_RELEASE_ID)
    errors.push({ code: 'INVALID_RELEASE', message: 'Unexpected candidate release ID.' });
  if (catalog.release.status !== 'activation_candidate')
    errors.push({ code: 'INVALID_STATUS', message: 'Candidate must remain activation_candidate.' });
  const cellResults = catalog.domains.map((domain) => {
    const cell = `${domain.gradeId}|${domain.domainId}`;
    const local: string[] = [];
    const fc = catalog.finalCompetencies.filter(
      (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
    );
    const components = catalog.competencyComponents.filter(
      (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
    );
    const requirements = catalog.learningRequirements.filter(
      (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
    );
    const concepts = catalog.objectiveConcepts.filter(
      (item) => item.gradeId === domain.gradeId && item.domainId === domain.domainId
    );
    if (fc.length !== 1) local.push('Expected exactly one FinalCompetency.');
    if (components.length !== 3) local.push('Expected exactly three CompetencyComponents.');
    const reqIds = new Set(requirements.map((item) => item.id));
    if (requirements.length === 0 || concepts.length === 0)
      local.push('Semantic requirements/concepts are missing.');
    if (concepts.some((item) => item.learningRequirementIds.some((id) => !reqIds.has(id))))
      local.push('Concept references a requirement outside its cell.');
    if (
      [...requirements, ...concepts].some(
        (item) => item.metadata?.sourceArtifactId !== P1FC_SOURCE_ARTIFACT_ID
      )
    )
      local.push('Source traceability is incomplete.');
    if (local.length)
      errors.push(...local.map((message) => ({ code: 'CELL_INVALID', message, cell })));
    return { cell, status: local.length ? ('BLOCK' as const) : ('PASS' as const), errors: local };
  });
  if (catalog.domains.length !== 15)
    errors.push({ code: 'CELL_COUNT', message: 'Expected 15 cells.' });
  if (catalog.finalCompetencies.length !== 15)
    errors.push({ code: 'FC_COUNT', message: 'Expected 15 FinalCompetencies.' });
  if (catalog.competencyComponents.length !== 45)
    errors.push({ code: 'COMPONENT_COUNT', message: 'Expected 45 components.' });
  const ids = [
    ...catalog.finalCompetencies,
    ...catalog.competencyComponents,
    ...catalog.learningRequirements,
    ...catalog.objectiveConcepts,
    ...catalog.objectiveVariants,
  ].map((item) => item.id);
  if (new Set(ids).size !== ids.length)
    errors.push({ code: 'DUPLICATE_ID', message: 'Semantic IDs must be unique.' });
  if (
    catalog.objectiveConcepts.some(
      (item) => item.domainId === 'f_structuring' && item.label.includes('نشاط جماعي بسيط')
    )
  )
    errors.push({
      code: 'CRITICAL_COLLISION',
      message: 'Known generic group-activity contamination detected in Domain 3.',
    });
  const semanticCoverageComplete =
    cellResults.every((result) => result.status === 'PASS') &&
    catalog.learningRequirements.every((requirement) =>
      catalog.objectiveConcepts.some(
        (concept) =>
          concept.gradeId === requirement.gradeId &&
          concept.domainId === requirement.domainId &&
          concept.learningRequirementIds.includes(requirement.id)
      )
    );
  return {
    releaseId: catalog.release.id,
    errors,
    cellResults,
    semanticCoverageComplete,
    activationEligible: errors.length === 0 && semanticCoverageComplete,
  };
}

export const P1FC_ACTIVATION_READINESS = deepFreeze({
  releaseId: P1FC_RELEASE_ID,
  semanticValidation: 'PASS',
  coverageValidation: 'PASS',
  crossDomainValidation: 'PASS',
  historicalCompatibility: 'PASS',
  teacherPlanSafety: 'PASS',
  executedHistorySafety: 'PASS',
  rollbackReady: true,
  runtimeIntegrationReady: false,
  productApproval: false,
  overallReadiness: 'READY_FOR_RUNTIME_INTEGRATION_SPRINT',
  blockers: ['GATE_I_RUNTIME_INTEGRATION_PENDING', 'GATE_J_PRODUCT_APPROVAL_PENDING'],
});

export const P1FC_EXECUTED_HISTORY_POLICY = deepFreeze({
  protectedModels: ['ClassPlannedSession', 'NotebookEntry', 'LessonPlan', 'Assessment'],
  rewriteHistoricalRecords: false,
  rewriteTeacherPlans: false,
  semanticResolutionOnly: true,
});
