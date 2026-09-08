import type {
  CompetencyComponent,
  CurriculumRelease,
  FinalCompetency,
  LearningRequirement,
  ObjectiveConcept,
} from '../types';

export type KnowledgeCoreMode = 'legacy' | 'shadow' | 'candidate';
export type KnowledgeCoreAuthority = 'legacy' | 'candidate';
export type ShadowComparisonStatus =
  | 'MATCH'
  | 'SEMANTIC_EQUIVALENT'
  | 'EXPECTED_CORRECTION'
  | 'LEGACY_ONLY'
  | 'CANDIDATE_ONLY'
  | 'AMBIGUOUS'
  | 'CONFLICT';

export interface KnowledgeCoreRuntimeConfig {
  mode?: string;
  releaseId?: string;
  productApproved?: boolean;
}

export interface KnowledgeCoreDiagnostic {
  knowledgeCoreMode: KnowledgeCoreMode;
  releaseId: string | null;
  validationStatus: 'PASS' | 'FAIL' | 'NOT_REQUESTED';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  authority: KnowledgeCoreAuthority;
  shadowComparisonStatus?: ShadowComparisonStatus;
  fallbackReason?: string;
}

export interface KnowledgeCoreStatus {
  requestedMode: string;
  effectiveMode: KnowledgeCoreMode;
  authority: KnowledgeCoreAuthority;
  productApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  candidateParticipates: boolean;
  diagnostic: KnowledgeCoreDiagnostic;
}

export interface KnowledgeCoreCell {
  gradeId: string;
  domainId: string;
  finalCompetency: FinalCompetency;
  components: readonly CompetencyComponent[];
  requirements: readonly LearningRequirement[];
  objectiveConcepts: readonly ObjectiveConcept[];
}

export interface KnowledgeCoreCoverageResult {
  releaseId: string;
  coveredRequirementIds: readonly string[];
  missingRequirementIds: readonly string[];
  unmappedReferences: readonly string[];
  semanticStatus: 'COMPLETE' | 'PARTIAL' | 'UNMAPPED';
}

export interface LegacyReferenceSnapshot {
  gradeId: string;
  domainId: string;
  finalCompetency?: string;
  componentLabels?: readonly string[];
  objectiveReferenceIds?: readonly string[];
}

export interface ShadowComparison {
  gradeId: string;
  domainId: string;
  status: ShadowComparisonStatus;
  legacyFinalCompetencyStatus: 'PRESENT' | 'MISSING';
  candidateFinalCompetencyStatus: 'PRESENT' | 'MISSING';
  componentComparison: 'MATCH' | 'LEGACY_UNSTRUCTURED' | 'DIFFERENT';
  semanticReferenceComparison: ShadowComparisonStatus;
  expectedCorrection: boolean;
  risk: 'NONE' | 'REVIEWED' | 'BLOCKING';
}

export interface KnowledgeCoreRuntime {
  getStatus(): KnowledgeCoreStatus;
  getReleaseMetadata(): Readonly<CurriculumRelease> | null;
  getGradeDomainCell(gradeId: string, domainId: string): Readonly<KnowledgeCoreCell> | null;
  resolveObjectiveReference(referenceId: string): Readonly<{
    historicalId: string;
    status: string;
    canonicalIds: readonly string[];
  }>;
  evaluateCoverage(
    gradeId: string,
    domainId: string,
    objectiveReferenceIds: readonly string[]
  ): Readonly<KnowledgeCoreCoverageResult>;
  compareLegacyReference(snapshot: LegacyReferenceSnapshot): Readonly<ShadowComparison> | null;
}
