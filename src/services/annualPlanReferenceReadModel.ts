import {
  ANNUAL_PLAN_REFERENCE,
  type AnnualPlanDomain,
  type AnnualPlanLevel,
} from '../data/annualPlanReference';
import { knowledgeCoreRuntime } from '../domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import type { KnowledgeCoreRuntime } from '../domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.types';
import type { AnnualPlanObjectiveOverride } from '../types/spex';

type AnnualPlanReadOverride = Omit<AnnualPlanObjectiveOverride, 'components'> & {
  components?: string | string[];
};

export type AnnualPlanReferenceProvenance = Readonly<{
  authority: 'legacy' | 'candidate';
  releaseId: string | null;
  canonicalFields: readonly string[];
  preservedDerivedFields: readonly string[];
}>;

export interface AnnualPlanReferenceReadModel extends AnnualPlanLevel {
  provenance: AnnualPlanReferenceProvenance;
}

export function canonicalAnnualPlanDomainId(domainId: string): string {
  return domainId === 'f_structure' ? 'f_structuring' : domainId;
}

export function resolveAnnualPlanTeacherValue(
  key: string,
  reference: string,
  hasCustomization: boolean,
  values: Record<string, AnnualPlanReadOverride>
): string {
  if (!hasCustomization) return reference;
  if (values.__cleared) return '';
  const override = values[key];
  if (!override) return reference;
  const value =
    key === 'comprehensive'
      ? override.comprehensive
      : key.endsWith('__final')
        ? override.finalCompetency
        : key.endsWith('__components')
          ? override.components
          : key.endsWith('__knowledge')
            ? override.knowledgeResources
            : key.endsWith('__transversal')
              ? override.transversalResources
              : key.endsWith('__evaluation')
                ? override.evaluationCriteria
                : override.time;
  return typeof value === 'string' ? value : reference;
}

const legacyModel = (level: AnnualPlanLevel): AnnualPlanReferenceReadModel => ({
  ...level,
  domains: level.domains.map((domain) => ({ ...domain })),
  provenance: Object.freeze({
    authority: 'legacy',
    releaseId: null,
    canonicalFields: Object.freeze([]),
    preservedDerivedFields: Object.freeze([
      'knowledgeResources',
      'transversalResources',
      'evaluationCriteria',
      'time',
    ]),
  }),
});

export function resolveAnnualPlanReferenceReadModel(
  levelId: string,
  runtime: KnowledgeCoreRuntime = knowledgeCoreRuntime
): AnnualPlanReferenceReadModel {
  const legacy = ANNUAL_PLAN_REFERENCE[levelId] || ANNUAL_PLAN_REFERENCE.lvl_p1;
  const canonical = runtime.getAnnualPlanReference(legacy.levelId);
  if (!canonical) return legacyModel(legacy);

  const domains = legacy.domains.map((legacyDomain): AnnualPlanDomain => {
    const domainId = canonicalAnnualPlanDomainId(legacyDomain.fieldId);
    const reference = canonical.domains.find((item) => item.domain.domainId === domainId);
    if (!reference) return { ...legacyDomain };
    return {
      ...legacyDomain,
      fieldId: reference.domain.domainId,
      fieldName: reference.domain.label,
      finalCompetency: reference.finalCompetency.label,
      components: reference.components.map((component) => component.label).join('\n'),
    };
  });

  return {
    levelId: canonical.grade.gradeId,
    levelName: canonical.grade.label,
    comprehensive: canonical.overallCompetency.label,
    domains,
    provenance: Object.freeze({
      authority: 'candidate',
      releaseId: canonical.releaseId,
      canonicalFields: Object.freeze([
        'grade',
        'overallCompetency',
        'domains',
        'finalCompetencies',
        'competencyComponents',
      ]),
      preservedDerivedFields: Object.freeze([
        'knowledgeResources',
        'transversalResources',
        'evaluationCriteria',
        'time',
      ]),
    }),
  };
}
