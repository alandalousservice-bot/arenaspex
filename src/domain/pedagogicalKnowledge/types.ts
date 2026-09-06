export type KnowledgeOriginType =
  'official_source' | 'platform_decision' | 'reviewed_derived' | 'teacher_owned' | 'unresolved';

export type KnowledgeReviewStatus = 'draft' | 'reviewed' | 'approved' | 'deprecated';

export interface KnowledgeProvenance {
  originType: KnowledgeOriginType;
  reviewStatus: KnowledgeReviewStatus;
  sourceRef?: string;
  reviewedById?: string;
  reviewedAt?: string;
  supersedesId?: string;
}

export type CurriculumReleaseStatus = 'draft' | 'reviewed' | 'active' | 'deprecated' | 'superseded';

export interface CurriculumSourceDocument {
  id: string;
  title: string;
  repositoryPath?: string;
  classification: 'official_source' | 'platform_reference';
}

export interface CurriculumRelease {
  id: string;
  version: string;
  status: CurriculumReleaseStatus;
  effectiveAcademicYears?: readonly string[];
  sourceDocuments: readonly CurriculumSourceDocument[];
  catalogHash: string;
  hashStrategy: 'fnv1a32-stable-json-v1';
  provenancePolicy: string;
  createdAt: string;
  releasedAt?: string;
}

export interface CatalogNode extends KnowledgeProvenance {
  id: string;
  releaseId: string;
  label: string;
  order?: number;
  aliases?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface CurriculumGrade extends CatalogNode {
  gradeId: string;
}

export interface OverallCompetency extends CatalogNode {
  gradeId: string;
}

export interface CurriculumDomain extends CatalogNode {
  gradeId: string;
  domainId: string;
}

export type RequirementSetStatus = 'complete' | 'incomplete' | 'unresolved';

export interface FinalCompetency extends CatalogNode {
  gradeId: string;
  domainId: string;
  requirementSetStatus: RequirementSetStatus;
}

export interface CompetencyComponent extends CatalogNode {
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
}

export interface LearningRequirement extends CatalogNode {
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  competencyComponentIds: readonly string[];
  required: boolean;
}

export type ResourceKind =
  'knowledge' | 'methodological' | 'motor_sensory' | 'value' | 'transversal';

export interface ResourceDefinition extends CatalogNode {
  gradeId: string;
  domainId: string;
  kind: ResourceKind;
  learningRequirementIds: readonly string[];
}

export interface CriterionDefinition extends CatalogNode {
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
}

export interface IndicatorDefinition extends CatalogNode {
  gradeId: string;
  domainId: string;
  criterionId: string;
  learningRequirementIds: readonly string[];
}

export interface ObjectiveConcept extends CatalogNode {
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  learningRequirementIds: readonly string[];
  competencyComponentIds: readonly string[];
}

export interface ObjectiveVariant extends CatalogNode {
  objectiveConceptId: string;
  wording: string;
  locale: string;
}

export type ObjectiveKeyKind = 'practical' | 'technical' | 'methodological';

export interface ObjectiveKey extends CatalogNode {
  objectiveConceptId: string;
  kind: ObjectiveKeyKind;
}

export type SituationAlignmentUsage =
  'learning' | 'diagnostic' | 'integration' | 'summative' | 'remediation' | 'adaptation';

/**
 * Future contract only. P0 does not persist or consume situation alignments.
 * Every future alignment is centered on one required LearningRequirement;
 * concept and indicator references may only narrow that semantic relationship.
 */
export interface SituationAlignmentContract {
  educationalSituationId: string;
  learningRequirementId: string;
  objectiveConceptId?: string;
  indicatorDefinitionId?: string;
  usageType: SituationAlignmentUsage;
  justification?: string;
}

export interface KnowledgeAlias {
  legacyId: string;
  canonicalId: string;
  reason: string;
}

export interface PedagogicalKnowledgeCatalog {
  release: CurriculumRelease;
  grades: readonly CurriculumGrade[];
  overallCompetencies: readonly OverallCompetency[];
  domains: readonly CurriculumDomain[];
  finalCompetencies: readonly FinalCompetency[];
  competencyComponents: readonly CompetencyComponent[];
  learningRequirements: readonly LearningRequirement[];
  resources: readonly ResourceDefinition[];
  criteria: readonly CriterionDefinition[];
  indicators: readonly IndicatorDefinition[];
  objectiveConcepts: readonly ObjectiveConcept[];
  objectiveVariants: readonly ObjectiveVariant[];
  objectiveKeys: readonly ObjectiveKey[];
  aliases: readonly KnowledgeAlias[];
}

export interface TeacherObjectiveCoverageInput {
  teacherObjectiveId: string;
  objectiveConceptId?: string | null;
  explicitReviewedRequirementIds?: readonly string[];
}

export type CompetencyCoverageStatus = 'complete' | 'partial' | 'unmapped' | 'indeterminate';

export interface RequirementCoverageEvidence {
  requirementId: string;
  teacherObjectiveIds: readonly string[];
  evidenceTypes: readonly ('objective_concept' | 'explicit_reviewed_requirement')[];
}

export interface CompetencyCoverageInput {
  catalog: PedagogicalKnowledgeCatalog;
  coreReleaseId: string;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string;
  teacherObjectives: readonly TeacherObjectiveCoverageInput[];
}

export interface CompetencyCoverageResult {
  requiredRequirements: readonly LearningRequirement[];
  coveredRequirements: readonly LearningRequirement[];
  missingRequirements: readonly LearningRequirement[];
  reinforcementRequirements: readonly LearningRequirement[];
  unmappedObjectives: readonly string[];
  coverageStatus: CompetencyCoverageStatus;
  coveragePercentage?: number;
  evidenceByRequirement: Readonly<Record<string, RequirementCoverageEvidence>>;
  indeterminateReasons: readonly string[];
}
