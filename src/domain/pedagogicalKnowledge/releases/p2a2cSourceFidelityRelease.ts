import { computeCatalogHash, deepFreeze } from '../catalog';
import {
  OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY,
  SOURCE_FIDELITY_ARTIFACT_ID,
  SOURCE_FIDELITY_RESOURCE_COUNTS,
} from '../source/officialCurriculum2023SourceFidelity';
import type {
  OfficialCurriculumDomainId,
  OfficialCurriculumGradeId,
} from '../source/officialCurriculum.types';
import type {
  CatalogNode,
  CurriculumRelease,
  KnowledgeProvenance,
  PedagogicalKnowledgeCatalog,
} from '../types';
import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_HISTORICAL_IDENTITY_MAP,
} from './p1fcCombinedSemanticRelease';

export const P2A2C_RELEASE_ID = 'knowledge-core:v1.5.1-source-fidelity-2023' as const;
export const P2A2C_RELEASE_STATUS = 'activation_candidate' as const;

const official = (sourceRef: string): KnowledgeProvenance => ({
  originType: 'official_source',
  reviewStatus: 'approved',
  sourceRef,
  reviewedById: 'arenaspex-p2a2c-source-fidelity-review',
  reviewedAt: '2026-09-08',
});

const derived = (sourceRef: string): KnowledgeProvenance => ({
  originType: 'reviewed_derived',
  reviewStatus: 'reviewed',
  sourceRef,
  reviewedById: 'arenaspex-p2a2c-source-fidelity-review',
  reviewedAt: '2026-09-08',
});

const node = <T extends object>(
  id: string,
  label: string,
  fields: T,
  provenance: KnowledgeProvenance
): CatalogNode & T => ({ id, releaseId: P2A2C_RELEASE_ID, label, ...fields, ...provenance });

const grades = OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY.grades;
const cells = grades.flatMap((grade) => grade.domains);

const catalogWithoutHash = {
  release: {
    id: P2A2C_RELEASE_ID,
    version: '1.5.1',
    status: P2A2C_RELEASE_STATUS,
    sourceDocuments: [
      {
        id: SOURCE_FIDELITY_ARTIFACT_ID,
        title: 'Official Algerian Primary PE Curriculum 2023 - source-fidelity correction',
        repositoryPath:
          'src/domain/pedagogicalKnowledge/source/officialCurriculum2023SourceFidelity.ts',
        classification: 'official_source',
      },
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Immutable source-fidelity correction; reviewed derivations remain distinct and Teacher-owned data is never rewritten.',
    createdAt: '2026-09-08',
    releasedAt: '2026-09-08',
  },
  grades: grades.map((grade, index) =>
    node(
      `curriculum-grade:${grade.gradeId}`,
      `السنة ${index + 1}`,
      { gradeId: grade.gradeId, order: index + 1 },
      official(grade.overallCompetency.id)
    )
  ),
  overallCompetencies: grades.map((grade) =>
    node(
      grade.overallCompetency.id,
      grade.overallCompetency.text,
      { gradeId: grade.gradeId },
      official(grade.overallCompetency.id)
    )
  ),
  domains: cells.map((cell) =>
    node(
      `curriculum-domain:${cell.gradeId}:${cell.domainId}`,
      cell.domainLabel,
      { gradeId: cell.gradeId, domainId: cell.domainId },
      official(cell.finalCompetency.id)
    )
  ),
  finalCompetencies: cells.map((cell) =>
    node(
      cell.finalCompetency.id,
      cell.finalCompetency.text,
      {
        gradeId: cell.gradeId,
        domainId: cell.domainId,
        requirementSetStatus: 'complete' as const,
        metadata: { sourceArtifactId: SOURCE_FIDELITY_ARTIFACT_ID },
      },
      official(cell.finalCompetency.id)
    )
  ),
  competencyComponents: cells.flatMap((cell) =>
    cell.competencyComponents.map((component, index) =>
      node(
        component.id,
        component.text,
        {
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          order: index + 1,
          metadata: { sourceArtifactId: SOURCE_FIDELITY_ARTIFACT_ID },
        },
        official(component.id)
      )
    )
  ),
  learningRequirements: cells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => {
      const component = cell.competencyComponents[index % cell.competencyComponents.length];
      const id = group.id.replace('official-resource-group:', 'learning-requirement:');
      return node(
        id,
        `إتقان ${group.label}`,
        {
          description: group.content.join(' '),
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          competencyComponentIds: [component.id],
          required: true,
          order: index + 1,
          metadata: {
            sourceArtifactId: SOURCE_FIDELITY_ARTIFACT_ID,
            officialResourceGroupIds: [group.id],
            officialContent: group.content,
          },
        },
        derived(group.id)
      );
    })
  ),
  resources: [],
  criteria: P1FC_COMBINED_SEMANTIC_CATALOG.criteria.map((item) => ({
    ...item,
    releaseId: P2A2C_RELEASE_ID,
  })),
  indicators: P1FC_COMBINED_SEMANTIC_CATALOG.indicators.map((item) => ({
    ...item,
    releaseId: P2A2C_RELEASE_ID,
  })),
  objectiveConcepts: cells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => {
      const component = cell.competencyComponents[index % cell.competencyComponents.length];
      const requirementId = group.id.replace('official-resource-group:', 'learning-requirement:');
      return node(
        group.id.replace('official-resource-group:', 'objective-concept:'),
        `يوظف ${group.label} بإنجاز منظم وملائم للموقف.`,
        {
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          learningRequirementIds: [requirementId],
          competencyComponentIds: [component.id],
          order: index + 1,
          metadata: {
            sourceArtifactId: SOURCE_FIDELITY_ARTIFACT_ID,
            officialResourceGroupIds: [group.id],
            officialComponentIds: [component.id],
          },
        },
        derived(group.id)
      );
    })
  ),
  objectiveVariants: [],
  objectiveKeys: [],
  aliases: P1FC_COMBINED_SEMANTIC_CATALOG.aliases,
  teacherPlanSourceReferenceMappings: [],
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const placeholder = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P2A2C_SOURCE_FIDELITY_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze({
  ...placeholder,
  release: { ...placeholder.release, catalogHash: computeCatalogHash(placeholder) },
});

export const P2A2C_COMPATIBILITY_MAP = deepFreeze([
  ...P1FC_HISTORICAL_IDENTITY_MAP,
  {
    historicalId: 'official-resource-group:lvl_p1:f_locomotion:2',
    status: 'SUPERSEDED',
    canonicalIds: ['official-resource-group:lvl_p1:f_locomotion:1'],
  },
  {
    historicalId: 'official-resource-group:lvl_p1:f_locomotion:3',
    status: 'SUPERSEDED',
    canonicalIds: ['official-resource-group:lvl_p1:f_locomotion:1'],
  },
  {
    historicalId: 'official-resource-group:lvl_p1:f_fundamentals:2',
    status: 'SUPERSEDED',
    canonicalIds: ['official-resource-group:lvl_p1:f_fundamentals:1'],
  },
  {
    historicalId: 'official-resource-group:lvl_p2:f_fundamentals:2',
    status: 'SPLIT_REQUIRES_REVIEW',
    canonicalIds: [
      'official-resource-group:lvl_p2:f_fundamentals:2',
      'official-resource-group:lvl_p2:f_fundamentals:3',
    ],
  },
  {
    historicalId: 'official-resource-group:lvl_p3:f_locomotion:1',
    status: 'SPLIT_REQUIRES_REVIEW',
    canonicalIds: [
      'official-resource-group:lvl_p3:f_locomotion:running-throwing',
      'official-resource-group:lvl_p3:f_locomotion:throwing',
      'official-resource-group:lvl_p3:f_locomotion:instructions',
    ],
  },
  {
    historicalId: 'official-resource-group:lvl_p3:f_locomotion:2',
    status: 'SPLIT_REQUIRES_REVIEW',
    canonicalIds: [
      'official-resource-group:lvl_p3:f_locomotion:running-throwing',
      'official-resource-group:lvl_p3:f_locomotion:throwing',
      'official-resource-group:lvl_p3:f_locomotion:instructions',
    ],
  },
  {
    historicalId: 'official-resource-group:lvl_p4:f_locomotion:1',
    status: 'SPLIT_REQUIRES_REVIEW',
    canonicalIds: [
      'official-resource-group:lvl_p4:f_locomotion:1',
      'official-resource-group:lvl_p4:f_locomotion:body-position',
    ],
  },
  {
    historicalId: 'official-resource-group:lvl_p4:f_locomotion:2',
    status: 'SPLIT_REQUIRES_REVIEW',
    canonicalIds: [
      'official-resource-group:lvl_p4:f_locomotion:2',
      'official-resource-group:lvl_p4:f_locomotion:group-running',
    ],
  },
  {
    historicalId: 'official-resource-group:lvl_p5:f_structuring:1',
    status: 'SPLIT_REQUIRES_REVIEW',
    canonicalIds: [
      'official-resource-group:lvl_p5:f_structuring:1',
      'official-resource-group:lvl_p5:f_structuring:basic-concepts',
    ],
  },
  ...[1, 2, 3].map((index) => ({
    historicalId: `learning-section:lvl_p5:f_fundamentals:component:${index}`,
    status: 'SUPERSEDED' as const,
    canonicalIds: [`learning-section:lvl_p5:f_fundamentals:source-fidelity-component:${index}`],
  })),
] as const);

export interface P2A2CValidationResult {
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

export function validateP2A2CSourceFidelityRelease(
  catalog: PedagogicalKnowledgeCatalog
): P2A2CValidationResult {
  const errors: { code: string; message: string; cell?: string }[] = [];
  if (catalog.release.id !== P2A2C_RELEASE_ID)
    errors.push({ code: 'INVALID_RELEASE', message: 'Unexpected source-fidelity release ID.' });
  if (catalog.release.status !== P2A2C_RELEASE_STATUS)
    errors.push({
      code: 'INVALID_STATUS',
      message: 'Release must remain an activation candidate.',
    });

  const cellResults = catalog.domains.map((domain) => {
    const cell = `${domain.gradeId}|${domain.domainId}`;
    const local: string[] = [];
    const finalCompetencies = catalog.finalCompetencies.filter(
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
    const expected =
      SOURCE_FIDELITY_RESOURCE_COUNTS[domain.gradeId as OfficialCurriculumGradeId][
        domain.domainId as OfficialCurriculumDomainId
      ];
    if (finalCompetencies.length !== 1) local.push('Expected one FinalCompetency.');
    if (components.length !== 3) local.push('Expected three CompetencyComponents.');
    if (requirements.length !== expected) local.push(`Expected ${expected} resource requirements.`);
    if (concepts.length !== expected) local.push(`Expected ${expected} objective concepts.`);
    if (
      [...finalCompetencies, ...components, ...requirements, ...concepts].some(
        (item) => item.metadata?.sourceArtifactId !== SOURCE_FIDELITY_ARTIFACT_ID
      )
    )
      local.push('Source traceability is incomplete.');
    if (requirements.some((item) => !item.description?.trim()))
      local.push('Complete official resource content is required.');
    if (local.length)
      errors.push(...local.map((message) => ({ code: 'CELL_INVALID', message, cell })));
    return { cell, status: local.length ? ('BLOCK' as const) : ('PASS' as const), errors: local };
  });

  if (catalog.grades.length !== 5)
    errors.push({ code: 'GRADE_COUNT', message: 'Expected 5 grades.' });
  if (catalog.domains.length !== 15)
    errors.push({ code: 'CELL_COUNT', message: 'Expected 15 cells.' });
  if (catalog.finalCompetencies.length !== 15)
    errors.push({ code: 'FC_COUNT', message: 'Expected 15 FinalCompetencies.' });
  if (catalog.competencyComponents.length !== 45)
    errors.push({ code: 'COMPONENT_COUNT', message: 'Expected 45 components.' });
  if (catalog.learningRequirements.length !== 55)
    errors.push({ code: 'RESOURCE_COUNT', message: 'Expected 55 official resource groups.' });

  const ids = [
    ...catalog.finalCompetencies,
    ...catalog.competencyComponents,
    ...catalog.learningRequirements,
    ...catalog.objectiveConcepts,
  ].map((item) => item.id);
  if (new Set(ids).size !== ids.length)
    errors.push({ code: 'DUPLICATE_ID', message: 'Semantic IDs must be unique.' });

  const semanticCoverageComplete =
    errors.length === 0 &&
    catalog.learningRequirements.every((requirement) =>
      catalog.objectiveConcepts.some((concept) =>
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

export const P2A2C_IDENTITY_TREATMENT_COUNTS = deepFreeze({
  KEEP_ID_CONTENT_CORRECTION: 48,
  SUPERSEDE_ID: 5,
  SPLIT_ID: 4,
  MERGE_IDS: 2,
  NEW_ID_REQUIRED: 4,
  REMOVE_FALSE_OFFICIAL_RECORD: 2,
  REVIEW_IDENTITY: 0,
} as const);
