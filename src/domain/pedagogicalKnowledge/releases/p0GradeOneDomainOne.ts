import { computeCatalogHash, deepFreeze } from '../catalog';
import type {
  CatalogNode,
  CurriculumRelease,
  KnowledgeProvenance,
  PedagogicalKnowledgeCatalog,
} from '../types';

export const P0_RELEASE_ID = 'knowledge-core:v1.0-pilot' as const;
export const P0_GRADE_ID = 'lvl_p1' as const;
export const P0_DOMAIN_ID = 'f_locomotion' as const;
export const P0_FINAL_COMPETENCY_ID = 'fc_lvl_p1_f_locomotion' as const;
export const P0_CANONICAL_FINAL_COMPETENCY_WORDING =
  'يتخذ وضعيات وهيآت طبيعية لها علاقة مع محيطه المباشر.' as const;

const approvedOfficial: KnowledgeProvenance = {
  originType: 'official_source',
  reviewStatus: 'approved',
  sourceRef: 'annual-plan-reference:lvl_p1:f_locomotion',
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-06',
};

const approvedDerived: KnowledgeProvenance = {
  originType: 'reviewed_derived',
  reviewStatus: 'approved',
  sourceRef: 'domain-one-learning-section-reference:lvl_p1:f_locomotion',
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-06',
};

const approvedDomainOneDerived: KnowledgeProvenance = {
  ...approvedDerived,
  sourceRef: 'domain-one-learning-section-reference:lvl_p1:f_locomotion',
};

const approvedCanonicalFinalOfficial: KnowledgeProvenance = {
  ...approvedOfficial,
  sourceRef: 'pedagogical-knowledge-core-reference:g1:d1:final-competency',
};

const draftDerived: KnowledgeProvenance = {
  originType: 'reviewed_derived',
  reviewStatus: 'draft',
  sourceRef: 'algerian-curriculum:lvl_p1:f_locomotion',
};

const node = <T extends object>(
  id: string,
  label: string,
  extra: T,
  provenance = approvedOfficial
) => ({ id, releaseId: P0_RELEASE_ID, label, ...extra, ...provenance }) satisfies CatalogNode & T;

const componentIds = [1, 2, 3].map(
  (index) => `learning-section:${P0_GRADE_ID}:${P0_DOMAIN_ID}:component:${index}`
);
const requirementIds = [1, 2, 3].map(
  (index) => `learning-requirement:${P0_GRADE_ID}:${P0_DOMAIN_ID}:${index}`
);
const conceptIds = [1, 2, 3, 4, 5, 6, 7].map(
  (index) => `objective-concept:${P0_GRADE_ID}:${P0_DOMAIN_ID}:${index}`
);

const objectiveWordings = [
  'يتعرف على وضعيات الجسم الأساسية (الوقوف، الجلوس، الانبطاح، الاستلقاء) وينجزها حسب التعليمات.',
  'ينتقل من وضعية إلى أخرى بطريقة منظمة استجابة للإشارة.',
  'ينجز تنقلات بسيطة (المشي، الجري الخفيف) في اتجاهات مختلفة.',
  'يتحكم في التنقل الأمامي والخلفي مع المحافظة على التوازن.',
  'ينجز تنقلات جانبية وتغيير الاتجاه داخل فضاء محدد.',
  'يربط بين وضعيات الجسم والتنقلات في مسار حركي بسيط.',
  'ينجز سلسلة حركية تجمع بين عدة وضعيات وتنقلات.',
] as const;

const objectiveRequirementMap = [
  [requirementIds[0]],
  [requirementIds[0], requirementIds[1]],
  [requirementIds[1]],
  [requirementIds[1]],
  [requirementIds[1], requirementIds[2]],
  [requirementIds[0], requirementIds[1]],
  [requirementIds[0], requirementIds[1], requirementIds[2]],
] as const;

const objectiveComponentMap = [
  [componentIds[0]],
  [componentIds[0], componentIds[1]],
  [componentIds[1]],
  [componentIds[1]],
  [componentIds[1], componentIds[2]],
  [componentIds[0], componentIds[1]],
  componentIds,
] as const;

const catalogWithoutHash = {
  release: {
    id: P0_RELEASE_ID,
    version: '1.0.0-pilot.0',
    status: 'active',
    effectiveAcademicYears: ['2026-2027', '2027-2028'],
    sourceDocuments: [
      {
        id: 'annual-plan-reference',
        title: 'ArenaSPEX annual plan reference transcription',
        repositoryPath: 'src/data/annualPlanReference.ts',
        classification: 'official_source',
      },
      {
        id: 'domain-one-learning-section-reference',
        title: 'Reviewed Domain 1 Learning Section reference',
        repositoryPath: 'src/data/domainOneLearningSectionReference.ts',
        classification: 'platform_reference',
      },
      {
        id: 'algerian-curriculum',
        title: 'ArenaSPEX operational curriculum reference',
        repositoryPath: 'src/data/algerianCurriculum.ts',
        classification: 'platform_reference',
      },
      {
        id: 'pedagogical-knowledge-core-reference',
        title: 'ArenaSPEX Pedagogical Knowledge Core reference v1.0',
        classification: 'platform_reference',
      },
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Only approved official_source, platform_decision, or reviewed_derived records may satisfy authoritative coverage.',
    createdAt: '2026-09-06',
    releasedAt: '2026-09-06',
  },
  grades: [node('curriculum-grade:lvl_p1', 'السنة الأولى ابتدائي', { gradeId: P0_GRADE_ID })],
  overallCompetencies: [
    node(
      'overall-competency:lvl_p1',
      'يقوم بحركات باتّخاذ وضعيات وهيئات طبيعية بالتكامل بين مختلف الحركات القاعدية، مستغلا فضاء الممارسة ومعالمه',
      { gradeId: P0_GRADE_ID }
    ),
  ],
  domains: [
    node('curriculum-domain:lvl_p1:f_locomotion', 'الوضعيات والتنقلات', {
      gradeId: P0_GRADE_ID,
      domainId: P0_DOMAIN_ID,
    }),
  ],
  finalCompetencies: [
    node(
      P0_FINAL_COMPETENCY_ID,
      P0_CANONICAL_FINAL_COMPETENCY_WORDING,
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        requirementSetStatus: 'incomplete' as const,
        metadata: {
          reason:
            'P0 preserves only safely reconciled requirements; the complete approved requirement set remains pending pedagogical review.',
        },
      },
      approvedCanonicalFinalOfficial
    ),
  ],
  competencyComponents: [
    node(
      componentIds[0],
      'يتعرف على مختلف الوضعيات الطبيعية المألوفة وغير المألوفة في محيطه المباشر.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        order: 1,
      },
      approvedDomainOneDerived
    ),
    node(
      componentIds[1],
      'يوظف تكامل أطرافه ويستثمرها في الوضعيات المألوفة وغير المألوفة حسب الموقف.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        order: 2,
      },
      approvedDomainOneDerived
    ),
    node(
      componentIds[2],
      'يحترم القواعد العامة عند أخذ مختلف الوضعيات.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        order: 3,
      },
      approvedDomainOneDerived
    ),
  ],
  learningRequirements: [
    node(
      requirementIds[0],
      'تمييز الوضعيات الطبيعية المألوفة وغير المألوفة واتخاذها وفق التعليمة.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        competencyComponentIds: [componentIds[0]],
        required: true,
        order: 1,
      },
      approvedDerived
    ),
    node(
      requirementIds[1],
      'توظيف تكامل الأطراف والتحول والتنقل بما يلائم الوضعية والموقف.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        competencyComponentIds: [componentIds[0], componentIds[1]],
        required: true,
        order: 2,
      },
      approvedDerived
    ),
    node(
      requirementIds[2],
      'احترام التعليمات والقواعد العامة وضوابط السلامة أثناء الوضعيات والتنقلات.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        competencyComponentIds: [componentIds[1], componentIds[2]],
        required: true,
        order: 3,
      },
      approvedDerived
    ),
  ],
  resources: [
    node(
      'resource:lvl_p1:f_locomotion:body-positions',
      'وظائف الأطراف وتكاملها في وضعيات الوقوف والجلوس والانبطاح والانتصاب.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        kind: 'knowledge' as const,
        learningRequirementIds: [requirementIds[0], requirementIds[1]],
      }
    ),
    node(
      'resource:lvl_p1:f_locomotion:movement-patterns',
      'أنماط التنقل وصفاتها: المشي والهرولة الفردية والثنائية.',
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        kind: 'motor_sensory' as const,
        learningRequirementIds: [requirementIds[1]],
      }
    ),
  ],
  criteria: [],
  indicators: [],
  objectiveConcepts: objectiveWordings.map((wording, index) =>
    node(
      conceptIds[index],
      wording,
      {
        gradeId: P0_GRADE_ID,
        domainId: P0_DOMAIN_ID,
        finalCompetencyId: P0_FINAL_COMPETENCY_ID,
        learningRequirementIds: objectiveRequirementMap[index],
        competencyComponentIds: objectiveComponentMap[index],
        order: index + 1,
      },
      approvedDerived
    )
  ),
  objectiveVariants: objectiveWordings.map((wording, index) =>
    node(
      `objective-variant:lvl_p1:f_locomotion:${index + 1}:ar`,
      wording,
      {
        objectiveConceptId: conceptIds[index],
        wording,
        locale: 'ar-DZ',
      },
      approvedDerived
    )
  ),
  objectiveKeys: objectiveWordings.map((_, index) =>
    node(
      `objective-key:lvl_p1:f_locomotion:${index + 1}:draft`,
      `مفتاح إنجاز مقترح للمفهوم التعلمي ${index + 1}؛ يحتاج مراجعة بيداغوجية قبل الاعتماد.`,
      {
        objectiveConceptId: conceptIds[index],
        kind: 'methodological' as const,
      },
      draftDerived
    )
  ),
  aliases: [
    {
      legacyId: 'source:annual-plan-reference:lvl_p1:f_locomotion:final-competency',
      canonicalId: P0_FINAL_COMPETENCY_ID,
      reason: 'Resolve the Annual Plan source slot to the frozen canonical competency identity.',
    },
    {
      legacyId: 'source:domain-one-learning-section-reference:lvl_p1:f_locomotion:final-competency',
      canonicalId: P0_FINAL_COMPETENCY_ID,
      reason: 'Resolve the Domain 1 source slot to the frozen canonical competency identity.',
    },
    {
      legacyId: 'source:algerian-curriculum:lvl_p1:f_locomotion:final-competency',
      canonicalId: P0_FINAL_COMPETENCY_ID,
      reason:
        'Preserve the narrower operational wording as an alternate source representation without making it canonical.',
    },
    ...conceptIds.map((canonicalId, index) => ({
      legacyId: `${P0_DOMAIN_ID}__${[2, 3, 4, 6, 7, 8, 9][index]}`,
      canonicalId,
      reason: 'Preserve the existing Teacher Learning Plan sourceReferenceId.',
    })),
  ],
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const catalogWithPlaceholderHash = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P0_GRADE_ONE_DOMAIN_ONE_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze({
  ...catalogWithPlaceholderHash,
  release: {
    ...catalogWithPlaceholderHash.release,
    catalogHash: computeCatalogHash(catalogWithPlaceholderHash),
  },
});
