import { computeCatalogHash, deepFreeze } from '../catalog';
import { OFFICIAL_CURRICULUM_2023 } from '../source/officialCurriculum2023';
import type {
  CatalogNode,
  CurriculumRelease,
  KnowledgeProvenance,
  PedagogicalKnowledgeCatalog,
} from '../types';

export const P1FA_RELEASE_ID = 'knowledge-core:v1.3-domain2-domain3' as const;
export const P1FA_DOMAIN_IDS = ['f_fundamentals', 'f_structuring'] as const;
export const P1FA_GRADE_IDS = ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'] as const;
export type P1FADomainId = (typeof P1FA_DOMAIN_IDS)[number];
export type P1FAGradeId = (typeof P1FA_GRADE_IDS)[number];

const approvedOfficial = (sourceRef: string): KnowledgeProvenance => ({
  originType: 'official_source',
  reviewStatus: 'approved',
  sourceRef,
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-07',
});
const approvedDerived = (sourceRef: string): KnowledgeProvenance => ({
  originType: 'reviewed_derived',
  reviewStatus: 'approved',
  sourceRef,
  reviewedById: 'arenaspex-pedagogical-review',
  reviewedAt: '2026-09-07',
});
const node = <T extends object>(
  id: string,
  label: string,
  fields: T,
  provenance: KnowledgeProvenance
): CatalogNode & T => ({ id, releaseId: P1FA_RELEASE_ID, label, ...fields, ...provenance });

const sourceCells = OFFICIAL_CURRICULUM_2023.grades
  .flatMap((grade) => grade.domains)
  .filter((cell): cell is typeof cell & { domainId: P1FADomainId } =>
    P1FA_DOMAIN_IDS.includes(cell.domainId as P1FADomainId)
  );

const G1_D2_GRADE_ID = 'lvl_p1' as const;
const G1_D2_DOMAIN_ID = 'f_fundamentals' as const;
const G1_D2_FINAL_COMPETENCY_ID = 'fc_lvl_p1_f_fundamentals' as const;
const G1_D2_CRITERION_IDS = [1, 2, 3, 4].map(
  (index) => `criterion:${G1_D2_GRADE_ID}:${G1_D2_DOMAIN_ID}:final-competency:${index}`
);
const G1_D2_INDICATOR_IDS = [1, 2, 3, 4].map(
  (index) => `indicator:${G1_D2_GRADE_ID}:${G1_D2_DOMAIN_ID}:criterion:${index}:1`
);
const G1_D2_CRITERIA = [
  [
    'اختيار الحركات القاعدية المناسبة للموقف',
    'تنفيذ وضعيات الوقوف المختلفة بشكل سليمو ربط بعض الوضعيات بشكل صحيح',
  ],
  ['تنسيق وظائف جسمه حسب نوع الحركة المطلوبة', 'تكامل عمل الأطراف – أداء جملة من الوضعيات'],
  [
    'التنفيذ المناسب في الوقت المناسب',
    'التنفيذ الصحيح لمختلف الوضعيات – يوظف تكامل أطرافه عند التنفيذ',
  ],
  [
    'المحافظة على التوازن خلال التنفيذ',
    'أداء متدرج السرعة للمشي فرديا وثنائيا بشكل صحيح- تنفيذ الهرولة فرديا وثنائيا بطريقة سليمة',
  ],
] as const;
const G1_D2_CRITERIA_SOURCE = 'annual-plan-reference:lvl_p1:f_fundamentals:evaluation-criteria';
const G1_D3_GRADE_ID = 'lvl_p1' as const;
const G1_D3_DOMAIN_ID = 'f_structuring' as const;
const G1_D3_FINAL_COMPETENCY_ID = 'fc_lvl_p1_f_structuring' as const;
const G1_D3_CRITERION_IDS = [1, 2, 3, 4].map(
  (index) => `criterion:${G1_D3_GRADE_ID}:${G1_D3_DOMAIN_ID}:final-competency:${index}`
);
const G1_D3_INDICATOR_IDS = [1, 2, 3, 4].map(
  (index) => `indicator:${G1_D3_GRADE_ID}:${G1_D3_DOMAIN_ID}:criterion:${index}:1`
);
const G1_D3_CRITERIA = [
  ['ضبط مسار الحركات تماشيا مع الفضاء المتاح', 'التنقل في فضاء الممارسة بشكل منظم'],
  ['ترتيب الحركات حسب أولويتها بالنسبة للعملية', 'مشاركة فضاء الممارسة'],
  ['التنفيذ المناسب للفضاء المتاح', 'التفاعل مع التشكيلات والصفوف'],
  ['القيام بحركات لتمكين الزملاء من استثمار الفضاء', 'مشاركة الأقران'],
] as const;
const G1_D3_CRITERIA_SOURCE = 'annual-plan-reference:lvl_p1:f_structuring:evaluation-criteria';
const G2_CRITERIA_SOURCE = 'annual-plan-reference:lvl_p2:evaluation-criteria';
const G2_CRITERIA: Record<P1FADomainId, readonly (readonly [string, string])[]> = {
  f_fundamentals: [
    ['المحافظة على التوازن خلال عملية التحول', 'تنفيذ حركات المشي والهرولة المختلفة بشكل سليم'],
    ['استثمار الإرتكازات بطريقة سليمة لضمان عملية التحول', 'تكامل عمل الأطراف جثو - وثب'],
    [
      'استعمال الحركات المناسبة لعملية التحول',
      'التنفيذ الصحيح– يوظف تكامل أطرافه في الجري المتعرج',
    ],
    ['حسن اختيار أسلوب أو مدة أو مسافة التحول', 'تنفيذ الجري جري في دائرة و في محور بطريقة سليمة'],
  ],
  f_structuring: [
    ['التعرف على الوسائل واستخدامها بشكل الصحيح', 'استعمال مختلف الوسائل وتوظيفها'],
    ['أداء سليم لتسليم واستلام أداة', 'التسليم و الإستلام من الثبات والحركة بشكل سليم'],
    ['أداء رمي سليم من مختلف الوضعيات', 'الرمي الجانبي والامامي والخلفي بشكل سليم'],
    ['الحفاظ على سلامة الوسائل و الأدوات', 'توظيف الوسائل مع الأقران والمحافظة عليها'],
  ],
};

export const p1faRequirementId = (resourceGroupId: string): string =>
  resourceGroupId.replace('official-resource-group:', 'learning-requirement:');
export const p1faConceptId = (resourceGroupId: string): string =>
  resourceGroupId.replace('official-resource-group:', 'objective-concept:');

const G1_D2_REQUIREMENT_IDS =
  sourceCells
    .find((cell) => cell.gradeId === G1_D2_GRADE_ID && cell.domainId === G1_D2_DOMAIN_ID)
    ?.resourceGroups.map((group) => p1faRequirementId(group.id)) || [];
const G1_D3_REQUIREMENT_IDS =
  sourceCells
    .find((cell) => cell.gradeId === G1_D3_GRADE_ID && cell.domainId === G1_D3_DOMAIN_ID)
    ?.resourceGroups.map((group) => p1faRequirementId(group.id)) || [];
const g2RequirementIds = (domainId: P1FADomainId) =>
  sourceCells
    .find((cell) => cell.gradeId === 'lvl_p2' && cell.domainId === domainId)
    ?.resourceGroups.map((group) => p1faRequirementId(group.id)) || [];
const g2FinalCompetencyId = (domainId: P1FADomainId) => `fc_lvl_p2_${domainId}`;
const g2CriterionId = (domainId: P1FADomainId, index: number) =>
  `criterion:lvl_p2:${domainId}:final-competency:${index}`;
const g2IndicatorId = (domainId: P1FADomainId, index: number) =>
  `indicator:lvl_p2:${domainId}:criterion:${index}:1`;
const G2_DOMAINS: readonly P1FADomainId[] = ['f_fundamentals', 'f_structuring'];
const g2Criteria = G2_DOMAINS.flatMap((domainId) =>
  G2_CRITERIA[domainId].map(([label], index) =>
    node(
      g2CriterionId(domainId as P1FADomainId, index + 1),
      label,
      {
        gradeId: 'lvl_p2' as const,
        domainId,
        finalCompetencyId: g2FinalCompetencyId(domainId as P1FADomainId),
        order: index + 1,
      },
      approvedOfficial(`${G2_CRITERIA_SOURCE}:${domainId}`)
    )
  )
);
const g2Indicators = G2_DOMAINS.flatMap((domainId) =>
  G2_CRITERIA[domainId].map(([, label], index) =>
    node(
      g2IndicatorId(domainId as P1FADomainId, index + 1),
      label,
      {
        gradeId: 'lvl_p2' as const,
        domainId,
        criterionId: g2CriterionId(domainId as P1FADomainId, index + 1),
        learningRequirementIds: g2RequirementIds(domainId as P1FADomainId).length
          ? [
              g2RequirementIds(domainId as P1FADomainId)[
                Math.min(index, g2RequirementIds(domainId as P1FADomainId).length - 1)
              ],
            ]
          : [],
        order: 1,
      },
      approvedOfficial(`${G2_CRITERIA_SOURCE}:${domainId}`)
    )
  )
);
const G3_CRITERIA: Record<P1FADomainId, readonly (readonly [string, string])[]> = {
  f_fundamentals: [
    ['اختيار وتيرة الجري المناسبة للموقف', 'جري بوتيرة بطيئة متوسطة سريعة حسب الموقف'],
    ['التحكم في وضعية وتنسيق الجسم خلال الجري', 'جري منعرج بوتيرة مناسبة والتنسيق بين اطراف الجسم'],
    ['اختيار شكل الرمي المناسب للموقف', 'التنفيذ الصحيح أثناء الرمي الجانبي بيد وبيدين'],
    ['المحافظة على تسلسل عملية الرمي', 'أداء متدرج أثتاء الرمي بيد وبيدين أمام وللخلف لأبعد مسافة'],
  ],
  f_structuring: [
    ['تعديل التصرفات حسب تجدد الموقف', 'ضبط سرعة التنقل بين المعالم واللحاق'],
    ['بناء جملة من التصرفات بما يناسب الموقف', 'اجتياز الموانع وتغيير الإتجاه بما يناسب الموقف'],
    ['التنقل والرمي بطريقة صحيحة', 'التنفيذ الصحيح للرمي لأبعد مسافة وفق مجال'],
    ['الالتزام بقواعد المنافسة عند الرمي لأبعد مسافة', 'التنفيذ الصحيح للرمي لأعلى وفق مجال'],
  ],
};
const g3RequirementIds = (domainId: P1FADomainId) =>
  sourceCells
    .find((cell) => cell.gradeId === 'lvl_p3' && cell.domainId === domainId)
    ?.resourceGroups.map((group) => p1faRequirementId(group.id)) || [];
const g3Criteria = P1FA_DOMAIN_IDS.flatMap((domainId) =>
  G3_CRITERIA[domainId].map(([label], index) =>
    node(
      `criterion:lvl_p3:${domainId}:final-competency:${index + 1}`,
      label,
      {
        gradeId: 'lvl_p3' as const,
        domainId,
        finalCompetencyId: `fc_lvl_p3_${domainId}`,
        order: index + 1,
      },
      approvedOfficial(`annual-plan-reference:lvl_p3:${domainId}:evaluation-criteria`)
    )
  )
);
const g3Indicators = P1FA_DOMAIN_IDS.flatMap((domainId) =>
  G3_CRITERIA[domainId].map(([, label], index) =>
    node(
      `indicator:lvl_p3:${domainId}:criterion:${index + 1}:1`,
      label,
      {
        gradeId: 'lvl_p3' as const,
        domainId,
        criterionId: `criterion:lvl_p3:${domainId}:final-competency:${index + 1}`,
        learningRequirementIds: g3RequirementIds(domainId).length
          ? [g3RequirementIds(domainId)[Math.min(index, g3RequirementIds(domainId).length - 1)]]
          : [],
        order: 1,
      },
      approvedOfficial(`annual-plan-reference:lvl_p3:${domainId}:evaluation-criteria`)
    )
  )
);

const catalogWithoutHash = {
  release: {
    id: P1FA_RELEASE_ID,
    version: '1.3.0',
    status: 'active',
    sourceDocuments: [
      {
        id: OFFICIAL_CURRICULUM_2023.curriculumSourceId,
        title: 'Official Algerian Primary PE Curriculum source artifact 2023',
        repositoryPath: 'src/domain/pedagogicalKnowledge/source/officialCurriculum2023.ts',
        classification: 'official_source',
      },
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Official identities are reused from EPS-2023; approved reviewed derivations alone satisfy semantic coverage.',
    createdAt: '2026-09-07',
    releasedAt: '2026-09-07',
  },
  grades: OFFICIAL_CURRICULUM_2023.grades.map((grade, index) =>
    node(
      `curriculum-grade:${grade.gradeId}`,
      `السنة ${index + 1}`,
      {
        gradeId: grade.gradeId,
        order: index + 1,
      },
      approvedOfficial(grade.overallCompetency.id)
    )
  ),
  overallCompetencies: OFFICIAL_CURRICULUM_2023.grades.map((grade) =>
    node(
      grade.overallCompetency.id,
      grade.overallCompetency.text,
      {
        gradeId: grade.gradeId,
      },
      approvedOfficial(grade.overallCompetency.id)
    )
  ),
  domains: sourceCells.map((cell) =>
    node(
      `curriculum-domain:${cell.gradeId}:${cell.domainId}`,
      cell.domainLabel,
      {
        gradeId: cell.gradeId,
        domainId: cell.domainId,
      },
      approvedOfficial(cell.finalCompetency.id)
    )
  ),
  finalCompetencies: sourceCells.map((cell) =>
    node(
      cell.finalCompetency.id,
      cell.finalCompetency.text,
      {
        gradeId: cell.gradeId,
        domainId: cell.domainId,
        requirementSetStatus: 'complete' as const,
        metadata: { sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId },
      },
      approvedOfficial(cell.finalCompetency.id)
    )
  ),
  competencyComponents: sourceCells.flatMap((cell) =>
    cell.competencyComponents.map((component, index) =>
      node(
        component.id,
        component.text,
        {
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          order: index + 1,
          metadata: { sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId },
        },
        approvedOfficial(component.id)
      )
    )
  ),
  learningRequirements: sourceCells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => {
      const component = cell.competencyComponents[index % cell.competencyComponents.length];
      return node(
        p1faRequirementId(group.id),
        `إتقان ${group.label}`,
        {
          description: `مطلب تعلم مستقر مشتق بالمراجعة من مجموعة الموارد الرسمية: ${group.label}.`,
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          competencyComponentIds: [component.id],
          required: true,
          order: index + 1,
          metadata: {
            sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId,
            officialResourceGroupIds: [group.id],
            officialComponentIds: [component.id],
          },
        },
        approvedDerived(group.id)
      );
    })
  ),
  resources: [],
  criteria: [
    ...sourceCells
      .filter((cell) => cell.gradeId === G1_D2_GRADE_ID && cell.domainId === G1_D2_DOMAIN_ID)
      .flatMap(() =>
        G1_D2_CRITERIA.map(([label], index) =>
          node(
            G1_D2_CRITERION_IDS[index],
            label,
            {
              gradeId: G1_D2_GRADE_ID,
              domainId: G1_D2_DOMAIN_ID,
              finalCompetencyId: G1_D2_FINAL_COMPETENCY_ID,
              order: index + 1,
            },
            approvedOfficial(G1_D2_CRITERIA_SOURCE)
          )
        )
      ),
    ...sourceCells
      .filter((cell) => cell.gradeId === G1_D3_GRADE_ID && cell.domainId === G1_D3_DOMAIN_ID)
      .flatMap(() =>
        G1_D3_CRITERIA.map(([label], index) =>
          node(
            G1_D3_CRITERION_IDS[index],
            label,
            {
              gradeId: G1_D3_GRADE_ID,
              domainId: G1_D3_DOMAIN_ID,
              finalCompetencyId: G1_D3_FINAL_COMPETENCY_ID,
              order: index + 1,
            },
            approvedOfficial(G1_D3_CRITERIA_SOURCE)
          )
        )
      ),
    ...g2Criteria,
    ...g3Criteria,
  ],
  indicators: [
    ...sourceCells
      .filter((cell) => cell.gradeId === G1_D2_GRADE_ID && cell.domainId === G1_D2_DOMAIN_ID)
      .flatMap(() =>
        G1_D2_CRITERIA.map(([, label], index) =>
          node(
            G1_D2_INDICATOR_IDS[index],
            label,
            {
              gradeId: G1_D2_GRADE_ID,
              domainId: G1_D2_DOMAIN_ID,
              criterionId: G1_D2_CRITERION_IDS[index],
              learningRequirementIds: [
                G1_D2_REQUIREMENT_IDS[Math.min(index, G1_D2_REQUIREMENT_IDS.length - 1)],
              ],
              order: 1,
            },
            approvedOfficial(G1_D2_CRITERIA_SOURCE)
          )
        )
      ),
    ...sourceCells
      .filter((cell) => cell.gradeId === G1_D3_GRADE_ID && cell.domainId === G1_D3_DOMAIN_ID)
      .flatMap(() =>
        G1_D3_CRITERIA.map(([, label], index) =>
          node(
            G1_D3_INDICATOR_IDS[index],
            label,
            {
              gradeId: G1_D3_GRADE_ID,
              domainId: G1_D3_DOMAIN_ID,
              criterionId: G1_D3_CRITERION_IDS[index],
              learningRequirementIds: [
                G1_D3_REQUIREMENT_IDS[Math.min(index, G1_D3_REQUIREMENT_IDS.length - 1)],
              ],
              order: 1,
            },
            approvedOfficial(G1_D3_CRITERIA_SOURCE)
          )
        )
      ),
    ...g2Indicators,
    ...g3Indicators,
  ],
  objectiveConcepts: sourceCells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => {
      const component = cell.competencyComponents[index % cell.competencyComponents.length];
      const requirementId = p1faRequirementId(group.id);
      return node(
        p1faConceptId(group.id),
        `يوظف ${group.label} بإنجاز منظم وملائم للموقف.`,
        {
          gradeId: cell.gradeId,
          domainId: cell.domainId,
          finalCompetencyId: cell.finalCompetency.id,
          learningRequirementIds: [requirementId],
          competencyComponentIds: [component.id],
          order: index + 1,
          metadata: {
            sourceArtifactId: OFFICIAL_CURRICULUM_2023.curriculumSourceId,
            officialResourceGroupIds: [group.id],
            officialComponentIds: [component.id],
          },
        },
        approvedDerived(group.id)
      );
    })
  ),
  objectiveVariants: [],
  objectiveKeys: [],
  aliases: [],
  teacherPlanSourceReferenceMappings: sourceCells.flatMap((cell) =>
    cell.resourceGroups.map((group, index) => ({
      id: `teacher-plan-source-mapping:${cell.gradeId}:${cell.domainId}:${index + 1}`,
      releaseId: P1FA_RELEASE_ID,
      gradeId: cell.gradeId,
      domainId: cell.domainId,
      sourceReferenceId: `p1fa:${cell.gradeId}:${cell.domainId}:${index + 1}`,
      objectiveConceptId: p1faConceptId(group.id),
      reason: 'Read-only fixture mapping for reviewed P1F-A semantic resolution.',
      ...approvedDerived(group.id),
    }))
  ),
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const catalogWithPlaceholderHash = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P1FA_DOMAIN_TWO_AND_THREE_CATALOG: Readonly<PedagogicalKnowledgeCatalog> = deepFreeze({
  ...catalogWithPlaceholderHash,
  release: {
    ...catalogWithPlaceholderHash.release,
    catalogHash: computeCatalogHash(catalogWithPlaceholderHash),
  },
});

export const p1faCellRequirements = (gradeId: P1FAGradeId, domainId: P1FADomainId) =>
  P1FA_DOMAIN_TWO_AND_THREE_CATALOG.learningRequirements.filter(
    (item) => item.gradeId === gradeId && item.domainId === domainId
  );
export const p1faCellConcepts = (gradeId: P1FAGradeId, domainId: P1FADomainId) =>
  P1FA_DOMAIN_TWO_AND_THREE_CATALOG.objectiveConcepts.filter(
    (item) => item.gradeId === gradeId && item.domainId === domainId
  );
