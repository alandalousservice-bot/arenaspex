import { canSatisfyAuthoritativeCoverage } from './provenance';
import {
  DEFAULT_CANDIDATE_RELEASE_ID,
  getRegisteredKnowledgeCoreRelease,
} from './runtime/knowledgeCoreReleaseRegistry';
import type {
  CompetencyComponent,
  CriterionDefinition,
  CurriculumDomain,
  CurriculumGrade,
  FinalCompetency,
  IndicatorDefinition,
  LearningRequirement,
  PedagogicalKnowledgeCatalog,
} from './types';

export type AssessmentScopeKind = 'diagnostic' | 'summative';

export interface AssessmentScopeInput {
  gradeId: string;
  domainId: string;
  finalCompetencyId?: string | null;
  kind?: AssessmentScopeKind;
}

export interface CanonicalAssessmentScope {
  kind?: AssessmentScopeKind;
  gradeId: string;
  domainId: string;
  finalCompetencyId: string | null;
  grade?: CurriculumGrade;
  domain?: CurriculumDomain;
  finalCompetency?: FinalCompetency;
  competencyComponents: readonly CompetencyComponent[];
  requirements: readonly LearningRequirement[];
  criteria: readonly CriterionDefinition[];
  indicators: readonly IndicatorDefinition[];
  requiredCriteria: readonly CriterionDefinition[];
  coveredCriteria: readonly CriterionDefinition[];
  missingCriteria: readonly CriterionDefinition[];
  requiredIndicators: readonly IndicatorDefinition[];
  coveredIndicators: readonly IndicatorDefinition[];
  missingIndicators: readonly IndicatorDefinition[];
  unresolved: boolean;
}

const emptyScope = (input: AssessmentScopeInput): CanonicalAssessmentScope => ({
  kind: input.kind,
  gradeId: input.gradeId,
  domainId: input.domainId,
  finalCompetencyId: null,
  competencyComponents: [],
  requirements: [],
  criteria: [],
  indicators: [],
  requiredCriteria: [],
  coveredCriteria: [],
  missingCriteria: [],
  requiredIndicators: [],
  coveredIndicators: [],
  missingIndicators: [],
  unresolved: true,
});

/**
 * Resolves the one canonical assessment cell without copying curriculum
 * content. The optional catalog argument keeps the adapter deterministic and
 * makes release-scoped tests possible; runtime callers use the registered
 * candidate catalog already used by the assessment notebook.
 */
export function resolveAssessmentScope(
  input: AssessmentScopeInput,
  catalog?: PedagogicalKnowledgeCatalog
): CanonicalAssessmentScope {
  const resolvedCatalog =
    catalog || getRegisteredKnowledgeCoreRelease(DEFAULT_CANDIDATE_RELEASE_ID)?.catalog;
  if (!resolvedCatalog) return emptyScope(input);

  const grade = resolvedCatalog.grades.find(
    (item) => item.gradeId === input.gradeId && canSatisfyAuthoritativeCoverage(item)
  );
  const domain = resolvedCatalog.domains.find(
    (item) =>
      item.gradeId === input.gradeId &&
      item.domainId === input.domainId &&
      canSatisfyAuthoritativeCoverage(item)
  );
  const finalCompetencies = resolvedCatalog.finalCompetencies.filter(
    (item) =>
      item.gradeId === input.gradeId &&
      item.domainId === input.domainId &&
      canSatisfyAuthoritativeCoverage(item)
  );
  const finalCompetency = input.finalCompetencyId
    ? finalCompetencies.find((item) => item.id === input.finalCompetencyId)
    : finalCompetencies.length === 1
      ? finalCompetencies[0]
      : undefined;

  if (!grade || !domain || !finalCompetency) return emptyScope(input);

  const competencyComponents = resolvedCatalog.competencyComponents.filter(
    (item) =>
      item.gradeId === input.gradeId &&
      item.domainId === input.domainId &&
      item.finalCompetencyId === finalCompetency.id &&
      canSatisfyAuthoritativeCoverage(item)
  );
  const requirements = resolvedCatalog.learningRequirements.filter(
    (item) =>
      item.gradeId === input.gradeId &&
      item.domainId === input.domainId &&
      item.finalCompetencyId === finalCompetency.id &&
      item.required &&
      canSatisfyAuthoritativeCoverage(item)
  );
  const criteria = resolvedCatalog.criteria.filter(
    (item) =>
      item.gradeId === input.gradeId &&
      item.domainId === input.domainId &&
      item.finalCompetencyId === finalCompetency.id &&
      canSatisfyAuthoritativeCoverage(item)
  );
  const indicators = resolvedCatalog.indicators.filter(
    (item) =>
      item.gradeId === input.gradeId &&
      item.criterionId &&
      criteria.some((criterion) => criterion.id === item.criterionId) &&
      canSatisfyAuthoritativeCoverage(item)
  );

  return {
    kind: input.kind,
    gradeId: input.gradeId,
    domainId: input.domainId,
    finalCompetencyId: finalCompetency.id,
    grade,
    domain,
    finalCompetency,
    competencyComponents,
    requirements,
    criteria,
    indicators,
    requiredCriteria: criteria,
    coveredCriteria: [],
    missingCriteria: criteria,
    requiredIndicators: indicators,
    coveredIndicators: [],
    missingIndicators: indicators,
    unresolved: false,
  };
}

export function assessmentScopeRequirementLabels(scope: CanonicalAssessmentScope): string[] {
  return scope.requirements.map((item) => item.description?.trim() || item.label).filter(Boolean);
}
