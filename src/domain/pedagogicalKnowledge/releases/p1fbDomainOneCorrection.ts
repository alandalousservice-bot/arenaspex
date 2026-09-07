import { computeCatalogHash, deepFreeze } from '../catalog';
import { P1A_GRADE_ONE_DOMAIN_ONE_CATALOG } from './p1aGradeOneDomainOne';
import { P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG } from './p1cDomainOneGradesTwoToFive';
import type { CatalogNode, CurriculumRelease, PedagogicalKnowledgeCatalog } from '../types';

export const P1FB_RELEASE_ID = 'knowledge-core:v1.4-domain1-correction' as const;
export const P1FB_RELEASE_STATUS = 'reviewed' as const;
export const P1FB_REFINED_G3_CONCEPT_ID =
  'objective-concept:lvl_p3:f_locomotion:stationary-two-hand-throw' as const;

const previous = [P1A_GRADE_ONE_DOMAIN_ONE_CATALOG, P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG];
const reScope = <T extends CatalogNode>(item: T): T => ({ ...item, releaseId: P1FB_RELEASE_ID });
const oldRefinedId = 'objective-concept:lvl_p3:f_locomotion:5';

export const P1FB_LEGACY_RECONCILIATIONS = deepFreeze([
  {
    gradeId: 'lvl_p3',
    legacyReferenceId: 'f_locomotion__7',
    decision: 'MOVE_TO_OTHER_DOMAIN',
    canonicalObjectiveConceptIds: [],
    countsForDomainOneCoverage: false,
  },
  {
    gradeId: 'lvl_p4',
    legacyReferenceId: 'f_locomotion__6',
    decision: 'APPROVE_REPLACEMENT',
    canonicalObjectiveConceptIds: ['objective-concept:lvl_p4:f_locomotion:4'],
    countsForDomainOneCoverage: true,
  },
  {
    gradeId: 'lvl_p4',
    legacyReferenceId: 'f_locomotion__7',
    decision: 'APPROVE_REPLACEMENT',
    canonicalObjectiveConceptIds: ['objective-concept:lvl_p4:f_locomotion:6'],
    countsForDomainOneCoverage: true,
  },
  {
    gradeId: 'lvl_p5',
    legacyReferenceId: 'f_locomotion__2',
    decision: 'APPROVE_REPLACEMENT',
    canonicalObjectiveConceptIds: ['objective-concept:lvl_p5:f_locomotion:3'],
    countsForDomainOneCoverage: true,
  },
  {
    gradeId: 'lvl_p5',
    legacyReferenceId: 'f_locomotion__3',
    decision: 'SPLIT_REQUIRED',
    canonicalObjectiveConceptIds: [
      'objective-concept:lvl_p5:f_locomotion:1',
      'objective-concept:lvl_p5:f_locomotion:3',
    ],
    countsForDomainOneCoverage: false,
  },
  {
    gradeId: 'lvl_p5',
    legacyReferenceId: 'f_locomotion__6',
    decision: 'MOVE_TO_OTHER_DOMAIN',
    canonicalObjectiveConceptIds: [],
    countsForDomainOneCoverage: false,
  },
  {
    gradeId: 'lvl_p5',
    legacyReferenceId: 'f_locomotion__7',
    decision: 'APPROVE_REPLACEMENT',
    canonicalObjectiveConceptIds: ['objective-concept:lvl_p5:f_locomotion:5'],
    countsForDomainOneCoverage: true,
  },
] as const);

const concepts = previous
  .flatMap((catalog) => catalog.objectiveConcepts)
  .map((item) => {
    if (item.id !== oldRefinedId) return reScope(item);
    return {
      ...reScope(item),
      id: P1FB_REFINED_G3_CONCEPT_ID,
      label: 'ينظم وضعية الجسم ويؤدي الرمي من الثبات باليدين ضمن مجال آمن ومع احترام التعليمات.',
      sourceRef: 'official-resource-group:lvl_p3:f_locomotion:1',
      supersedesId: oldRefinedId,
      metadata: { ...item.metadata, correction: 'REFINE', sourceArtifactId: 'dz-primary-pe-2023' },
    };
  });

const variants = previous
  .flatMap((catalog) => catalog.objectiveVariants)
  .map((item) =>
    item.objectiveConceptId === oldRefinedId
      ? {
          ...reScope(item),
          id: 'objective-variant:lvl_p3:f_locomotion:stationary-two-hand-throw:ar',
          objectiveConceptId: P1FB_REFINED_G3_CONCEPT_ID,
          wording:
            'ينظم وضعية الجسم ويؤدي الرمي من الثبات باليدين ضمن مجال آمن ومع احترام التعليمات.',
          supersedesId: item.id,
        }
      : reScope(item)
  );

const catalogWithoutHash = {
  release: {
    id: P1FB_RELEASE_ID,
    version: '1.4.0',
    status: P1FB_RELEASE_STATUS,
    sourceDocuments: [
      {
        id: 'dz-primary-pe-2023',
        title: 'Official Algerian Primary PE Curriculum source artifact 2023',
        repositoryPath: 'src/domain/pedagogicalKnowledge/source/officialCurriculum2023.ts',
        classification: 'official_source',
      },
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Reviewed Domain 1 correction; historical Teacher plans and P1E migration remain untouched.',
    createdAt: '2026-09-07',
    releasedAt: '2026-09-07',
  },
  grades: previous.flatMap((catalog) => catalog.grades).map(reScope),
  overallCompetencies: previous.flatMap((catalog) => catalog.overallCompetencies).map(reScope),
  domains: previous.flatMap((catalog) => catalog.domains).map(reScope),
  finalCompetencies: previous
    .flatMap((catalog) => catalog.finalCompetencies)
    .map((item) => ({
      ...reScope(item),
      sourceRef: `fc_${item.gradeId}_f_locomotion`,
      metadata: { ...item.metadata, sourceArtifactId: 'dz-primary-pe-2023' },
    })),
  competencyComponents: previous
    .flatMap((catalog) => catalog.competencyComponents)
    .map((item) => ({
      ...reScope(item),
      sourceRef: item.id,
      metadata: { ...item.metadata, sourceArtifactId: 'dz-primary-pe-2023' },
    })),
  learningRequirements: previous
    .flatMap((catalog) => catalog.learningRequirements)
    .map((item) => ({
      ...reScope(item),
      metadata: { ...item.metadata, correctionClassification: 'KEEP' },
    })),
  resources: previous.flatMap((catalog) => catalog.resources).map(reScope),
  criteria: previous.flatMap((catalog) => catalog.criteria).map(reScope),
  indicators: previous.flatMap((catalog) => catalog.indicators).map(reScope),
  objectiveConcepts: concepts,
  objectiveVariants: variants,
  objectiveKeys: [],
  aliases: previous.flatMap((catalog) => catalog.aliases),
  teacherPlanSourceReferenceMappings: P1FB_LEGACY_RECONCILIATIONS.filter(
    (item) => item.decision === 'APPROVE_REPLACEMENT'
  ).map((item) => ({
    id: `p1fb-reconciliation:${item.gradeId}:${item.legacyReferenceId}`,
    releaseId: P1FB_RELEASE_ID,
    gradeId: item.gradeId,
    domainId: 'f_locomotion',
    sourceReferenceId: item.legacyReferenceId,
    objectiveConceptId: item.canonicalObjectiveConceptIds[0],
    reason: 'Approved P1F-B replacement; read-only resolution preserves Teacher wording.',
    originType: 'reviewed_derived' as const,
    reviewStatus: 'approved' as const,
    reviewedById: 'arenaspex-pedagogical-review',
    reviewedAt: '2026-09-07',
    sourceRef: `p1fb-decision:${item.gradeId}:${item.legacyReferenceId}`,
  })),
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const placeholder = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P1FB_DOMAIN_ONE_CORRECTION_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze(
  {
    ...placeholder,
    release: { ...placeholder.release, catalogHash: computeCatalogHash(placeholder) },
  }
);
