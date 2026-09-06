import { computeCatalogHash, deepFreeze } from '../catalog';
import { P0_GRADE_ONE_DOMAIN_ONE_CATALOG } from './p0GradeOneDomainOne';
import type {
  CatalogNode,
  CurriculumRelease,
  KnowledgeProvenance,
  LearningRequirement,
  PedagogicalKnowledgeCatalog,
} from '../types';

export const P1A_RELEASE_ID = 'knowledge-core:v1.1-g1-d1' as const;

export const P1A_LEARNING_REQUIREMENT_IDS = {
  postureVariety: 'learning-requirement:lvl_p1:f_locomotion:1',
  limbIntegration: 'learning-requirement:lvl_p1:f_locomotion:2',
  spatialMovement: 'learning-requirement:lvl_p1:f_locomotion:spatial-movement-adaptation',
  rulesAndSafety: 'learning-requirement:lvl_p1:f_locomotion:3',
} as const;

export const P1A_DIAGNOSTIC_REQUIREMENT_IDS = Object.freeze(
  Object.values(P1A_LEARNING_REQUIREMENT_IDS)
);
export const P1A_SUMMATIVE_REQUIREMENT_IDS = P1A_DIAGNOSTIC_REQUIREMENT_IDS;

const approvedDerived: KnowledgeProvenance = {
  originType: 'reviewed_derived',
  reviewStatus: 'approved',
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-07',
};

const reScope = <T extends CatalogNode>(item: T): T =>
  ({ ...item, releaseId: P1A_RELEASE_ID }) as T;

const componentIds = P0_GRADE_ONE_DOMAIN_ONE_CATALOG.competencyComponents.map((item) => item.id);

const requirement = (
  id: string,
  label: string,
  description: string,
  linkedComponentIds: readonly string[],
  order: number,
  sourceRef: string
): LearningRequirement => ({
  id,
  releaseId: P1A_RELEASE_ID,
  gradeId: 'lvl_p1',
  domainId: 'f_locomotion',
  finalCompetencyId: 'fc_lvl_p1_f_locomotion',
  label,
  description,
  competencyComponentIds: linkedComponentIds,
  required: true,
  order,
  ...approvedDerived,
  sourceRef,
});

const requirements: readonly LearningRequirement[] = [
  requirement(
    P1A_LEARNING_REQUIREMENT_IDS.postureVariety,
    'تمييز الوضعيات الطبيعية المألوفة وغير المألوفة واتخاذها بما يلائم التعليمة والموقف.',
    'يشمل تنوع هيآت الوقوف والجلوس والانبطاح والانتصاب والارتكاز دون ربط المطلب بتمرين أو عدد حصص.',
    [componentIds[0]],
    1,
    'annual-plan-reference:lvl_p1:f_locomotion:components+knowledge-resources:postures'
  ),
  requirement(
    P1A_LEARNING_REQUIREMENT_IDS.limbIntegration,
    'توظيف تكامل الأطراف والمحافظة على تنظيم الجسم وتوازنه أثناء التحول بين الوضعيات.',
    'يمثل التحكم الوظيفي الذي يربط وضعية بأخرى ويجعل التنفيذ منظمًا ومتوازنًا حسب الموقف.',
    [componentIds[0], componentIds[1]],
    2,
    'annual-plan-reference:lvl_p1:f_locomotion:components+knowledge-resources:limb-integration'
  ),
  requirement(
    P1A_LEARNING_REQUIREMENT_IDS.spatialMovement,
    'تكييف أنماط التنقل الأساسية واتجاهاتها ومساراتها مع فضاء الممارسة والموقف.',
    'يشمل المشي والهرولة والتنقل الأمامي والخلفي والجانبي وتغيير الاتجاه والربط داخل مسار محدد.',
    [componentIds[0], componentIds[1]],
    3,
    'annual-plan-reference:lvl_p1:f_locomotion:knowledge-resources:movement-patterns'
  ),
  requirement(
    P1A_LEARNING_REQUIREMENT_IDS.rulesAndSafety,
    'احترام التعليمات والقواعد العامة وضوابط السلامة والتكيف مع الآخرين أثناء الوضعيات والتنقلات.',
    'يمثل البعد القيمي والتنظيمي الملازم للإنجاز، ولا يختزل في توجيه عام أو إجراء تجهيزات.',
    [componentIds[1], componentIds[2]],
    4,
    'annual-plan-reference:lvl_p1:f_locomotion:components+transversal-resources:rules'
  ),
];

const objectiveRequirementMap: readonly (readonly string[])[] = [
  [P1A_LEARNING_REQUIREMENT_IDS.postureVariety],
  [
    P1A_LEARNING_REQUIREMENT_IDS.postureVariety,
    P1A_LEARNING_REQUIREMENT_IDS.limbIntegration,
    P1A_LEARNING_REQUIREMENT_IDS.rulesAndSafety,
  ],
  [P1A_LEARNING_REQUIREMENT_IDS.spatialMovement],
  [P1A_LEARNING_REQUIREMENT_IDS.limbIntegration, P1A_LEARNING_REQUIREMENT_IDS.spatialMovement],
  [P1A_LEARNING_REQUIREMENT_IDS.spatialMovement, P1A_LEARNING_REQUIREMENT_IDS.rulesAndSafety],
  [
    P1A_LEARNING_REQUIREMENT_IDS.postureVariety,
    P1A_LEARNING_REQUIREMENT_IDS.limbIntegration,
    P1A_LEARNING_REQUIREMENT_IDS.spatialMovement,
  ],
  Object.values(P1A_LEARNING_REQUIREMENT_IDS),
];

const catalogWithoutHash = {
  release: {
    ...P0_GRADE_ONE_DOMAIN_ONE_CATALOG.release,
    id: P1A_RELEASE_ID,
    version: '1.1.0',
    status: 'active',
    catalogHash: undefined,
    createdAt: '2026-09-07',
    releasedAt: '2026-09-07',
  },
  grades: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.grades.map(reScope),
  overallCompetencies: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.overallCompetencies.map(reScope),
  domains: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.domains.map(reScope),
  finalCompetencies: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.finalCompetencies.map((item) => ({
    ...reScope(item),
    requirementSetStatus: 'complete' as const,
    metadata: {
      reason:
        'P1A approved the smallest sufficient requirement set after component, resource, objective, and source-evidence reconciliation.',
    },
  })),
  competencyComponents: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.competencyComponents.map(reScope),
  learningRequirements: requirements,
  resources: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.resources.map((item) => ({
    ...reScope(item),
    learningRequirementIds:
      item.kind === 'motor_sensory'
        ? [P1A_LEARNING_REQUIREMENT_IDS.spatialMovement]
        : [
            P1A_LEARNING_REQUIREMENT_IDS.postureVariety,
            P1A_LEARNING_REQUIREMENT_IDS.limbIntegration,
          ],
  })),
  criteria: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.criteria.map(reScope),
  indicators: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.indicators.map(reScope),
  objectiveConcepts: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveConcepts.map((item, index) => ({
    ...reScope(item),
    learningRequirementIds: objectiveRequirementMap[index],
  })),
  objectiveVariants: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.objectiveVariants.map(reScope),
  objectiveKeys: [],
  aliases: P0_GRADE_ONE_DOMAIN_ONE_CATALOG.aliases,
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'> & { catalogHash?: undefined };
};

const catalogWithPlaceholderHash = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P1A_GRADE_ONE_DOMAIN_ONE_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze({
  ...catalogWithPlaceholderHash,
  release: {
    ...catalogWithPlaceholderHash.release,
    catalogHash: computeCatalogHash(catalogWithPlaceholderHash),
  },
});
