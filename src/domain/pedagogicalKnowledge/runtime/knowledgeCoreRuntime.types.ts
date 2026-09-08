import type {
  CompetencyComponent,
  CurriculumDomain,
  CurriculumRelease,
  CurriculumGrade,
  FinalCompetency,
  LearningRequirement,
  ObjectiveConcept,
  OverallCompetency,
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
  releaseId: string | null;
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

export interface KnowledgeCoreAnnualPlanReference {
  releaseId: string;
  grade: Readonly<CurriculumGrade>;
  overallCompetency: Readonly<OverallCompetency>;
  domains: readonly Readonly<{
    domain: CurriculumDomain;
    finalCompetency: FinalCompetency;
    components: readonly CompetencyComponent[];
  }>[];
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
  getAnnualPlanReference(gradeId: string): Readonly<KnowledgeCoreAnnualPlanReference> | null;
  resolveObjectiveReference(referenceId: string): Readonly<{
    historicalId: string;
    status: string;
    canonicalIds: readonly string[];
  }>;
  resolveCompetencyComponentReference(
    gradeId: string,
    domainId: string,
    referenceId: string
  ): Readonly<{
    referenceId: string;
    status: 'CANONICAL' | 'MOVED_DOMAIN' | 'UNKNOWN';
    canonicalGradeId?: string;
    canonicalDomainId?: string;
  }>;
  evaluateCoverage(
    gradeId: string,
    domainId: string,
    objectiveReferenceIds: readonly string[]
  ): Readonly<KnowledgeCoreCoverageResult>;
  compareLegacyReference(snapshot: LegacyReferenceSnapshot): Readonly<ShadowComparison> | null;
}
