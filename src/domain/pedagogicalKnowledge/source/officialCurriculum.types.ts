export const OFFICIAL_CURRICULUM_GRADE_IDS = [
  'lvl_p1',
  'lvl_p2',
  'lvl_p3',
  'lvl_p4',
  'lvl_p5',
] as const;

export const OFFICIAL_CURRICULUM_DOMAIN_IDS = [
  'f_locomotion',
  'f_fundamentals',
  'f_structuring',
] as const;

export type OfficialCurriculumGradeId = (typeof OFFICIAL_CURRICULUM_GRADE_IDS)[number];
export type OfficialCurriculumDomainId = (typeof OFFICIAL_CURRICULUM_DOMAIN_IDS)[number];
export type OfficialProvenance = 'official_verbatim' | 'official_structured_extraction';
export type LearningRequirementBasis =
  'source_sufficient' | 'source_partial' | 'source_insufficient';
export type ObjectiveBankReadiness =
  | 'ready_with_reviewed_derivation'
  | 'ready_from_source'
  | 'needs_additional_reference'
  | 'unresolved';

export interface OfficialSourceReference {
  readonly sourceDocument: 'EPS-2023';
  readonly sourcePage: number | readonly number[];
  readonly sourceHeading: string;
}

export interface OfficialSourceRecord extends OfficialSourceReference {
  readonly id: string;
  readonly provenance: OfficialProvenance;
}

export interface OfficialOverallCompetency extends OfficialSourceRecord {
  readonly gradeId: OfficialCurriculumGradeId;
  readonly text: string;
}

export interface OfficialFinalCompetency extends OfficialSourceRecord {
  readonly gradeId: OfficialCurriculumGradeId;
  readonly domainId: OfficialCurriculumDomainId;
  readonly text: string;
}

export interface OfficialCompetencyComponent extends OfficialSourceRecord {
  readonly finalCompetencyId: string;
  readonly gradeId: OfficialCurriculumGradeId;
  readonly domainId: OfficialCurriculumDomainId;
  readonly text: string;
}

export interface OfficialResourceGroup extends OfficialSourceRecord {
  readonly gradeId: OfficialCurriculumGradeId;
  readonly domainId: OfficialCurriculumDomainId;
  readonly finalCompetencyId: string;
  readonly componentIds?: readonly string[];
  readonly label: string;
  readonly content: readonly string[];
}

export interface OfficialGradeDomainCell {
  readonly gradeId: OfficialCurriculumGradeId;
  readonly domainId: OfficialCurriculumDomainId;
  readonly domainLabel: string;
  readonly finalCompetency: OfficialFinalCompetency;
  readonly competencyComponents: readonly OfficialCompetencyComponent[];
  readonly resourceGroups: readonly OfficialResourceGroup[];
  readonly source: OfficialSourceReference;
  readonly provenance: OfficialProvenance;
  readonly learningRequirementBasis: LearningRequirementBasis;
  readonly objectiveBankReadiness: ObjectiveBankReadiness;
}

export interface OfficialCurriculumGrade {
  readonly gradeId: OfficialCurriculumGradeId;
  readonly overallCompetency: OfficialOverallCompetency;
  readonly domains: readonly OfficialGradeDomainCell[];
}

export interface OfficialCurriculumSourceArtifact {
  readonly curriculumSourceId: 'dz-primary-pe-2023';
  readonly sourceVersion: '2023';
  readonly contentHash: string;
  readonly sourceDocument: Readonly<{
    id: 'EPS-2023';
    title: string;
    repositoryPath: 'docs/EPS.pdf';
  }>;
  readonly grades: readonly OfficialCurriculumGrade[];
  readonly evaluationFramework: Readonly<{
    available: true;
    sourcePage: readonly [27, 28];
    perCellCriteriaAvailable: false;
    perCellIndicatorsAvailable: false;
  }>;
  readonly sessionSemantics: Readonly<{
    formativeRegulationSupported: true;
    arenaSpexSequenceIsOfficial: false;
  }>;
}
