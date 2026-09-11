import { computeCatalogHash, deepFreeze } from '../catalog';
import type {
  CatalogNode,
  CurriculumRelease,
  KnowledgeProvenance,
  PedagogicalKnowledgeCatalog,
  ResourceKind,
  TeacherPlanSourceReferenceMapping,
} from '../types';

export const P1C_RELEASE_ID = 'knowledge-core:v1.2-domain1-grades2-5' as const;
export const P1C_GRADE_IDS = ['lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'] as const;
export type P1CGradeId = (typeof P1C_GRADE_IDS)[number];

const DOMAIN_ID = 'f_locomotion' as const;

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

interface RequirementSpec {
  slug: string;
  label: string;
  description: string;
  componentIndexes: readonly number[];
}

interface ConceptSpec {
  label: string;
  requirementIndexes: readonly number[];
  componentIndexes: readonly number[];
  safeRuntimeSessionNumber?: number;
}

interface ResourceSpec {
  label: string;
  kind: ResourceKind;
  requirementIndexes: readonly number[];
}

interface GradeSpec {
  gradeId: P1CGradeId;
  gradeLabel: string;
  overallCompetency: string;
  finalCompetency: string;
  operationalFinalCompetency: string;
  identityClassification:
    'MATCH' | 'SEMANTIC_MATCH_WORDING_DIFFERS' | 'CONFLICT' | 'ALIAS_REQUIRED' | 'UNRESOLVED';
  components: readonly string[];
  requirements: readonly RequirementSpec[];
  concepts: readonly ConceptSpec[];
  resources: readonly ResourceSpec[];
}

const specs: readonly GradeSpec[] = [
  {
    gradeId: 'lvl_p2',
    gradeLabel: 'السنة الثانية ابتدائي',
    overallCompetency:
      'ينفذ حركات طبيعية وبسيطة في وضعيات وتنقلات متنوعة، ويعدلها حسب الموقف، محددا الأسلوب المناسب للفضاء المتاح.',
    finalCompetency: 'يعدل في الوقت المناسب وضعيته وتنقلاته من موقف إلى آخر.',
    operationalFinalCompetency: 'التحكم في وضعيات الجسم والتنقلات الأساسية.',
    identityClassification: 'SEMANTIC_MATCH_WORDING_DIFFERS',
    components: [
      'يتعرف على الوضعيات والتنقلات والمواقف ومختلف التنظيمات.',
      'ينفذ الموقف بما يتماشى وإمكاناته الفردية في مختلف الوضعيات.',
      'يسهر على سلامة وأمن زملائه.',
    ],
    requirements: [
      {
        slug: 'posture-and-movement-selection',
        label: 'انتقاء الوضعية والتنقل الملائمين للموقف وتعديلهما في الوقت المناسب.',
        description:
          'يشمل الوقوف والانحناء والجثو والمشي والجري والوثب دون الارتباط بتمرين أو حصة بعينها.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'body-control-and-transition',
        label: 'تنظيم عمل الأطراف والمحافظة على التوازن أثناء التحول بين الوضعيات والتنقلات.',
        description:
          'يمثل التحكم الوظيفي في الانتقال والتسارع وخفض السرعة بما يوافق الإمكانات الفردية.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'spatial-and-organizational-adaptation',
        label: 'تكييف الاتجاه والسرعة والمسار والتنظيم مع فضاء الممارسة والموقف.',
        description:
          'يشمل المسار المستقيم والمتعرج والدائري وتنظيم الاقتراب والابتعاد وتجنب الازدحام.',
        componentIndexes: [0, 1, 2],
      },
      {
        slug: 'peer-safety-and-rules',
        label: 'احترام قواعد التنظيم والمحافظة على أمن الزملاء وسلامتهم أثناء التنفيذ.',
        description: 'يمثل البعد القيمي والاجتماعي الملازم لاختيار الوضعية والتنقل والتنظيم.',
        componentIndexes: [1, 2],
      },
    ],
    concepts: [
      {
        label: 'يؤدي وضعيات جسمية متنوعة وفق التعليمات ومتطلبات الموقف.',
        requirementIndexes: [0],
        componentIndexes: [0, 1],
        safeRuntimeSessionNumber: 2,
      },
      {
        label: 'ينتقل بين وضعيات مختلفة بطريقة منظمة وسلسة.',
        requirementIndexes: [0, 1],
        componentIndexes: [0, 1],
        safeRuntimeSessionNumber: 3,
      },
      {
        label: 'ينجز تنقلات أمامية وخلفية وجانبية مع التحكم في الجسم.',
        requirementIndexes: [1, 2],
        componentIndexes: [0, 1],
        safeRuntimeSessionNumber: 4,
      },
      {
        label: 'يتحكم في تغيير الاتجاه أثناء التنقل داخل فضاء محدد.',
        requirementIndexes: [1, 2],
        componentIndexes: [0, 1],
        safeRuntimeSessionNumber: 6,
      },
      {
        label: 'يعدل سرعة التنقل استجابة للإشارة أو الموقف.',
        requirementIndexes: [1, 2, 3],
        componentIndexes: [0, 1, 2],
        safeRuntimeSessionNumber: 7,
      },
      {
        label: 'يربط الوضعيات والتنقلات في مسار منظم وآمن.',
        requirementIndexes: [0, 1, 2, 3],
        componentIndexes: [0, 1, 2],
        safeRuntimeSessionNumber: 8,
      },
      {
        label: 'ينجز سلسلة حركية مكيفة تجمع الوضعيات والتنقلات والتنظيم.',
        requirementIndexes: [0, 1, 2, 3],
        componentIndexes: [0, 1, 2],
        safeRuntimeSessionNumber: 9,
      },
    ],
    resources: [
      {
        label: 'الوضعيات الطبيعية: الوقوف والانحناء والجثو والمشي والجري والوثب.',
        kind: 'knowledge',
        requirementIndexes: [0, 1],
      },
      {
        label: 'التسارع وخفض السرعة وعمل الأطراف أثناء التنقل.',
        kind: 'motor_sensory',
        requirementIndexes: [1, 2],
      },
      {
        label: 'المسارات المستقيمة والمتعرجة والدائرية وتنظيم فضاء التنفيذ.',
        kind: 'methodological',
        requirementIndexes: [2],
      },
      {
        label: 'سلامة الزملاء واحترام التنظيمات.',
        kind: 'value',
        requirementIndexes: [3],
      },
    ],
  },
  {
    gradeId: 'lvl_p3',
    gradeLabel: 'السنة الثالثة ابتدائي',
    overallCompetency: 'يبني جملة من التصرفات القاعدية المتعلقة بالجري والرمي وينفذها حسب الموقف.',
    finalCompetency: 'يركب جملة من العمليات وينفذها وفق ما يتطلبه الموقف.',
    operationalFinalCompetency: 'التحكم في التنقلات المختلفة واستعمال الفضاء بطريقة فعالة.',
    identityClassification: 'CONFLICT',
    components: [
      'يتعرف على كيفية الربط بين تدرج جملة من الحركات (الجري والرمي).',
      'يلتزم بالتعليمات والتوجيهات المناسبة عند الرمي والجري.',
      'يحترم التعليمات والتوجيهات المقدمة.',
    ],
    requirements: [
      {
        slug: 'progressive-running-control',
        label: 'التحكم في تدرج الجري من المشي والهرولة إلى الجري الخفيف والسريع.',
        description: 'يمثل بناء الانتقال المتدرج بين وتائر الجري وفق متطلبات الموقف.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'stationary-throwing-control',
        label: 'تنفيذ الرمي من الثبات بيد واحدة أو باليدين بطريقة منسقة.',
        description: 'يمثل صور الرمي المرجعية دون اختزالها في تمرين واحد أو مسافة واحدة.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'operation-sequencing-and-adaptation',
        label: 'تركيب عمليات الجري والرمي وترتيبها وتكييفها مع تجدد الموقف.',
        description: 'يمثل المعنى التركيبي المركزي للكفاءة الختامية وربط العمليات في جملة هادفة.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'instructions-and-safety',
        label: 'احترام التعليمات ومجال الرمي والمحافظة على أمن الفوج وسلامته.',
        description: 'يمثل الضوابط الأمنية والتنظيمية الملازمة للجري والرمي.',
        componentIndexes: [1, 2],
      },
    ],
    concepts: [
      {
        label: 'ينتقل من المشي إلى الهرولة بتحكم وتدرج.',
        requirementIndexes: [0],
        componentIndexes: [0, 1],
      },
      {
        label: 'ينتقل من الهرولة إلى الجري الخفيف وفق الموقف.',
        requirementIndexes: [0, 2],
        componentIndexes: [0, 1],
      },
      {
        label: 'يتدرج من الجري الخفيف إلى الجري السريع مع ضبط التنفيذ.',
        requirementIndexes: [0, 2],
        componentIndexes: [0, 1],
      },
      {
        label: 'ينفذ الرمي من الثبات بيد واحدة وفق مجال آمن.',
        requirementIndexes: [1, 3],
        componentIndexes: [0, 1, 2],
      },
      {
        label: 'ينفذ الرمي من الثبات باليدين مع احترام التعليمات.',
        requirementIndexes: [1, 3],
        componentIndexes: [0, 1, 2],
      },
      {
        label: 'يربط عمليات الجري والرمي في ترتيب يلائم الموقف.',
        requirementIndexes: [0, 1, 2],
        componentIndexes: [0, 1],
      },
      {
        label: 'ينجز جملة من الجري والرمي بصورة مترابطة وآمنة.',
        requirementIndexes: [0, 1, 2, 3],
        componentIndexes: [0, 1, 2],
      },
    ],
    resources: [
      {
        label: 'تدرج الجري من المشي إلى الجري السريع.',
        kind: 'motor_sensory',
        requirementIndexes: [0, 2],
      },
      {
        label: 'الرمي من الثبات بيد واحدة وباليدين.',
        kind: 'motor_sensory',
        requirementIndexes: [1, 2],
      },
      {
        label: 'ترتيب العمليات واختيارها حسب الموقف.',
        kind: 'methodological',
        requirementIndexes: [2],
      },
      {
        label: 'أمن الفوج واحترام مجال الرمي والتعليمات.',
        kind: 'value',
        requirementIndexes: [3],
      },
    ],
  },
  {
    gradeId: 'lvl_p4',
    gradeLabel: 'السنة الرابعة ابتدائي',
    overallCompetency:
      'ينجز فرديا وجماعيا حركات قاعدية تتعلق بالوثب والرمي مبنية على وضعيات، محافظا على ترابطها بما يتماشى وفضاء الممارسة.',
    finalCompetency: 'ينجز مختلف الحركات فرديا وجماعيا ويحافظ على ترابطها.',
    operationalFinalCompetency: 'إتقان التنقلات المركبة والتكيف مع مختلف الوضعيات الحركية.',
    identityClassification: 'CONFLICT',
    components: [
      'يتعرف على وضعيات الجسم وعمل الأطراف ووتيرة الجري ضمن مجموعة.',
      'يضبط جسمه وعمل أطرافه وفق مختلف وضعيات التنقل.',
      'يتعايش مع المجموعة.',
    ],
    requirements: [
      {
        slug: 'running-posture-and-step',
        label: 'ضبط وضعية الجسم وتربية الخطوة أثناء الجري.',
        description: 'يمثل الوضعية التقنية والخطوة الملائمتين للتنقل دون الارتباط بمسار واحد.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'limb-coordination-across-paths',
        label: 'تنسيق عمل الأطراف والتحكم في الجسم عبر محاور ومسارات الجري المختلفة.',
        description: 'يشمل المحور المستقيم والمنحنى والخط المتعرج عند وتائر مناسبة.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'pace-and-group-cohesion',
        label: 'تكييف وتيرة الجري والانسجام مع حركة المجموعة.',
        description: 'يمثل الانتقال من الضبط الفردي إلى المحافظة على إيقاع جماعي مترابط.',
        componentIndexes: [0, 1, 2],
      },
      {
        slug: 'linked-individual-and-collective-execution',
        label: 'ربط الحركات الفردية والجماعية والمحافظة على استمراريتها وفق الموقف.',
        description: 'يمثل البناء المركب للكفاءة مع الثقة والتعايش واحترام ضوابط المجموعة.',
        componentIndexes: [0, 1, 2],
      },
    ],
    concepts: [
      {
        label: 'يضبط وضعية الجسم وآلية الخطوة أثناء الجري.',
        requirementIndexes: [0],
        componentIndexes: [0, 1],
      },
      {
        label: 'ينسق عمل الأطراف أثناء الجري بسرعة متزايدة.',
        requirementIndexes: [0, 1],
        componentIndexes: [0, 1],
      },
      {
        label: 'يجري على محور مستقيم مع المحافظة على ترابط الحركة.',
        requirementIndexes: [0, 1],
        componentIndexes: [0, 1],
      },
      {
        label: 'يضبط جسمه وأطرافه أثناء الجري على منحنى.',
        requirementIndexes: [1],
        componentIndexes: [0, 1],
      },
      {
        label: 'ينجز جريا على خط متعرج مع التحكم في تغيير الاتجاه.',
        requirementIndexes: [1, 3],
        componentIndexes: [0, 1],
      },
      {
        label: 'يكيف وتيرة جريه وينسجم مع المجموعة.',
        requirementIndexes: [2, 3],
        componentIndexes: [0, 1, 2],
      },
      {
        label: 'يربط حركات الجري فرديا وجماعيا ويحافظ على ترابطها.',
        requirementIndexes: [0, 1, 2, 3],
        componentIndexes: [0, 1, 2],
      },
    ],
    resources: [
      {
        label: 'وضعية الجسم وتربية الخطوة وآليتها أثناء الجري.',
        kind: 'knowledge',
        requirementIndexes: [0],
      },
      {
        label: 'عمل الأطراف في الجري على محور ومنحنى وخط متعرج.',
        kind: 'motor_sensory',
        requirementIndexes: [1],
      },
      {
        label: 'وتيرة الجري والانسجام ضمن المجموعة.',
        kind: 'transversal',
        requirementIndexes: [2, 3],
      },
      {
        label: 'الثقة بالنفس والتعايش مع المجموعة.',
        kind: 'value',
        requirementIndexes: [2, 3],
      },
    ],
  },
  {
    gradeId: 'lvl_p5',
    gradeLabel: 'السنة الخامسة ابتدائي',
    overallCompetency:
      'ينجز عمليات فرديا وجماعيا مبنية على حركات قاعدية ويحافظ على ترابطها، ويلائم وضعية جسمه بما يتوافق والوضعية المطروحة، ويمارس بعض الرياضات.',
    finalCompetency:
      'ينجز مختلف الوضعيات والتنقلات في الرياضات الفردية والألعاب الجماعية محافظا على ترابطها، ويلائم وضعية جسمه حسب الموقف.',
    operationalFinalCompetency:
      'توظيف الوضعيات والتنقلات المركبة في مواقف إدماجية مع التحكم في الجسم.',
    identityClassification: 'CONFLICT',
    components: [
      'يتعرف على الوضعيات الملائمة للجسم في الجري والوثب والرمي وكيفيات تعديلها.',
      'يلائم وضعيات جسمه حسب مختلف المواقف.',
      'يتقيد بمختلف الوضعيات المناسبة حسب الموقف.',
    ],
    requirements: [
      {
        slug: 'sport-specific-body-positioning',
        label: 'انتقاء وضعية الجسم الملائمة وتعديلها أثناء الجري والوثب والرمي.',
        description: 'يمثل ملاءمة الهيأة مع نوع العملية الرياضية والموقف المتجدد.',
        componentIndexes: [0, 1, 2],
      },
      {
        slug: 'coordination-balance-and-flow',
        label: 'المحافظة على التنسيق والتوازن والانسيابية خلال الوضعيات والتنقلات.',
        description: 'يشمل تنسيق الأطراف والخطوات الديناميكية والتوازن والسقوط السليم.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'propulsion-sequence-and-transition',
        label: 'تحقيق تسلسل الدفع والانتقال المناسب بين الجري والوثب والرمي.',
        description: 'يمثل ترتيب القوى ومراحل الانتقال والربط بين العمليات حسب الموقف.',
        componentIndexes: [0, 1],
      },
      {
        slug: 'coherent-individual-and-team-adaptation',
        label: 'ربط الوضعيات والتنقلات وتكييفها في الرياضات الفردية والألعاب الجماعية.',
        description: 'يمثل التوظيف الشامل المتماسك مع مراعاة الذات والآخرين وضوابط الموقف.',
        componentIndexes: [0, 1, 2],
      },
    ],
    concepts: [
      {
        label: 'يضبط وضعية الجسم وتنسيق الأطراف أثناء الجري.',
        requirementIndexes: [0, 1],
        componentIndexes: [0, 1],
      },
      {
        label: 'يكيف خطواته الديناميكية مع وتيرة الجري ويحافظ على الانسيابية.',
        requirementIndexes: [0, 1],
        componentIndexes: [0, 1],
      },
      {
        label: 'يتخذ وضعية متوازنة أثناء الوثب وينجز سقوطا سليما.',
        requirementIndexes: [0, 1, 2],
        componentIndexes: [0, 1, 2],
      },
      {
        label: 'يضبط وضعية الرمي والإحساس بالأداة وترتيب القوى عند الدفع.',
        requirementIndexes: [0, 2],
        componentIndexes: [0, 1],
      },
      {
        label: 'ينتقل بصورة مناسبة بين أساليب الجري والوثب والرمي.',
        requirementIndexes: [0, 1, 2],
        componentIndexes: [0, 1],
      },
      {
        label: 'يوظف الوضعيات والتنقلات بصورة مترابطة في نشاط فردي أو جماعي.',
        requirementIndexes: [0, 1, 2, 3],
        componentIndexes: [0, 1, 2],
      },
      {
        label: 'ينجز تسلسلا حركيا ملائما للموقف ويحافظ على ترابطه مع الآخرين.',
        requirementIndexes: [0, 1, 2, 3],
        componentIndexes: [0, 1, 2],
      },
    ],
    resources: [
      {
        label: 'وضعية الجسم أثناء الجري والوثب والرمي.',
        kind: 'knowledge',
        requirementIndexes: [0],
      },
      {
        label: 'تنسيق الأطراف والتوازن والانسيابية والخطوات الديناميكية.',
        kind: 'motor_sensory',
        requirementIndexes: [1],
      },
      {
        label: 'تسلسل الدفع والانتقال المناسب لأسلوب الوثب أو الرمي.',
        kind: 'methodological',
        requirementIndexes: [2],
      },
      {
        label: 'ملاءمة الوضعية للذات والآخرين في النشاط الفردي والجماعي.',
        kind: 'transversal',
        requirementIndexes: [3],
      },
    ],
  },
] as const;

const node = <T extends object>(
  id: string,
  label: string,
  extra: T,
  provenance: KnowledgeProvenance
) => ({ id, releaseId: P1C_RELEASE_ID, label, ...extra, ...provenance }) satisfies CatalogNode & T;

const componentId = (gradeId: P1CGradeId, index: number) =>
  `learning-section:${gradeId}:${DOMAIN_ID}:component:${index + 1}`;
const requirementId = (gradeId: P1CGradeId, slug: string) =>
  `learning-requirement:${gradeId}:${DOMAIN_ID}:${slug}`;
const conceptId = (gradeId: P1CGradeId, index: number) =>
  `objective-concept:${gradeId}:${DOMAIN_ID}:${index + 1}`;

const sourceMappings: TeacherPlanSourceReferenceMapping[] = specs.flatMap((spec) =>
  spec.concepts.flatMap((concept, index) =>
    concept.safeRuntimeSessionNumber
      ? [
          {
            releaseId: P1C_RELEASE_ID,
            gradeId: spec.gradeId,
            domainId: DOMAIN_ID,
            sourceReferenceId: `${DOMAIN_ID}__${concept.safeRuntimeSessionNumber}`,
            objectiveConceptId: conceptId(spec.gradeId, index),
            reason:
              'Reviewed as semantically compatible with the current Teacher Learning Plan source objective.',
            ...approvedDerived(
              `algerian-curriculum:${spec.gradeId}:${DOMAIN_ID}:session:${concept.safeRuntimeSessionNumber}`
            ),
          },
        ]
      : []
  )
);

const catalogWithoutHash = {
  release: {
    id: P1C_RELEASE_ID,
    version: '1.2.0',
    status: 'active',
    effectiveAcademicYears: ['2026-2027', '2027-2028'],
    sourceDocuments: [
      {
        id: 'pedagogical-knowledge-core-reference',
        title: 'ArenaSPEX Pedagogical Knowledge Core reference v1.0',
        classification: 'platform_reference',
      },
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
    ],
    hashStrategy: 'fnv1a32-stable-json-v1',
    provenancePolicy:
      'Only approved official_source, platform_decision, or reviewed_derived records may satisfy authoritative coverage.',
    createdAt: '2026-09-07',
    releasedAt: '2026-09-07',
  },
  grades: specs.map((spec, index) =>
    node(
      `curriculum-grade:${spec.gradeId}`,
      spec.gradeLabel,
      { gradeId: spec.gradeId, order: index + 2 },
      approvedOfficial(`annual-plan-reference:${spec.gradeId}`)
    )
  ),
  overallCompetencies: specs.map((spec) =>
    node(
      `overall-competency:${spec.gradeId}`,
      spec.overallCompetency,
      { gradeId: spec.gradeId },
      approvedOfficial(`annual-plan-reference:${spec.gradeId}:overall-competency`)
    )
  ),
  domains: specs.map((spec) =>
    node(
      `curriculum-domain:${spec.gradeId}:${DOMAIN_ID}`,
      'الوضعيات والتنقلات',
      { gradeId: spec.gradeId, domainId: DOMAIN_ID },
      approvedOfficial(`annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}`)
    )
  ),
  finalCompetencies: specs.map((spec) =>
    node(
      `fc_${spec.gradeId}_${DOMAIN_ID}`,
      spec.finalCompetency,
      {
        gradeId: spec.gradeId,
        domainId: DOMAIN_ID,
        requirementSetStatus: 'complete' as const,
        metadata: {
          operationalRepresentation: spec.operationalFinalCompetency,
          identityClassification: spec.identityClassification,
        },
      },
      approvedOfficial(`annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}:final-competency`)
    )
  ),
  competencyComponents: specs.flatMap((spec) =>
    spec.components.map((label, index) =>
      node(
        componentId(spec.gradeId, index),
        label,
        {
          gradeId: spec.gradeId,
          domainId: DOMAIN_ID,
          finalCompetencyId: `fc_${spec.gradeId}_${DOMAIN_ID}`,
          order: index + 1,
        },
        approvedDerived(
          `domain-one-learning-section-reference:${spec.gradeId}:${DOMAIN_ID}:component:${index + 1}`
        )
      )
    )
  ),
  learningRequirements: specs.flatMap((spec) =>
    spec.requirements.map((requirement, index) =>
      node(
        requirementId(spec.gradeId, requirement.slug),
        requirement.label,
        {
          description: requirement.description,
          gradeId: spec.gradeId,
          domainId: DOMAIN_ID,
          finalCompetencyId: `fc_${spec.gradeId}_${DOMAIN_ID}`,
          competencyComponentIds: requirement.componentIndexes.map((componentIndex) =>
            componentId(spec.gradeId, componentIndex)
          ),
          required: true,
          order: index + 1,
        },
        approvedDerived(`annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}:components+resources`)
      )
    )
  ),
  resources: specs.flatMap((spec) =>
    spec.resources.map((resource, index) =>
      node(
        `resource:${spec.gradeId}:${DOMAIN_ID}:${index + 1}`,
        resource.label,
        {
          gradeId: spec.gradeId,
          domainId: DOMAIN_ID,
          kind: resource.kind,
          learningRequirementIds: resource.requirementIndexes.map((requirementIndex) =>
            requirementId(spec.gradeId, spec.requirements[requirementIndex].slug)
          ),
          order: index + 1,
        },
        approvedOfficial(`annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}:resources`)
      )
    )
  ),
  criteria: [
    ...specs.flatMap((spec) =>
      spec.gradeId === 'lvl_p2'
        ? [
            ['المحافظة على التوازن خلال عملية التحول', 1],
            ['استثمار الإرتكازات بطريقة سليمة لضمان عملية التحول', 2],
            ['استعمال الحركات المناسبة لعملية التحول', 3],
            ['حسن اختيار أسلوب أو مدة أو مسافة التحول', 4],
          ].map(([label, index]) =>
            node(
              `criterion:lvl_p2:f_locomotion:final-competency:${index}`,
              String(label),
              {
                gradeId: 'lvl_p2',
                domainId: DOMAIN_ID,
                finalCompetencyId: 'fc_lvl_p2_f_locomotion',
                order: Number(index),
              },
              approvedOfficial('annual-plan-reference:lvl_p2:f_locomotion:evaluation-criteria')
            )
          )
        : []
    ),
    ...specs
      .filter((spec) => spec.gradeId === 'lvl_p3')
      .flatMap(() =>
        [
          ['انتقاء تصرفات مناسبة للموقف', 1],
          ['ضبط و تنفيذ سليم للحركات المختارة', 2],
          ['تكييف جملة التصرفات تجدد الموقف', 3],
          ['التنفيذ باريحية وسلامة', 4],
        ].map(([label, index]) =>
          node(
            `criterion:lvl_p3:f_locomotion:final-competency:${index}`,
            String(label),
            {
              gradeId: 'lvl_p3',
              domainId: DOMAIN_ID,
              finalCompetencyId: 'fc_lvl_p3_f_locomotion',
              order: Number(index),
            },
            approvedOfficial('annual-plan-reference:lvl_p3:f_locomotion:evaluation-criteria')
          )
        )
      ),
    ...specs
      .filter((spec) => spec.gradeId === 'lvl_p4')
      .flatMap(() =>
        [
          ['اختيار التنقلات المناسبة للموقف', 1],
          ['التحكم في الجسم خلال التنقل فرديا وجماعيا', 2],
          ['التنسيق بين أطراف الجسم خلال التنقل', 3],
          ['التحكم في تغيير وتيرة تجدد الموقف', 4],
        ].map(([label, index]) =>
          node(
            `criterion:lvl_p4:f_locomotion:final-competency:${index}`,
            String(label),
            {
              gradeId: 'lvl_p4',
              domainId: DOMAIN_ID,
              finalCompetencyId: 'fc_lvl_p4_f_locomotion',
              order: Number(index),
            },
            approvedOfficial('annual-plan-reference:lvl_p4:f_locomotion:evaluation-criteria')
          )
        )
      ),
    ...[
      ['اختيار الوضعيات والتنقلات المناسبة للموقف', 1],
      ['التنفيذ السليم للوضعيات والتنقلات المختارة', 2],
      ['الإنتقال السلس من حركة لأخرى وفي الوقت المناسب', 3],
      ['تنسيق جملة من الحركات يتطلبها الموقف', 4],
    ].map(([label, index]) =>
      node(
        `criterion:lvl_p5:f_locomotion:final-competency:${index}`,
        String(label),
        {
          gradeId: 'lvl_p5',
          domainId: DOMAIN_ID,
          finalCompetencyId: 'fc_lvl_p5_f_locomotion',
          order: Number(index),
        },
        approvedOfficial('annual-plan-reference:lvl_p5:f_locomotion:evaluation-criteria')
      )
    ),
  ],
  indicators: [
    ...specs.flatMap((spec) =>
      spec.gradeId === 'lvl_p2'
        ? [
            ['تنفيذ حركات المشي والهرولة المختلفة بشكل سليم', 1],
            ['تكامل عمل الأطراف جثو - وثب', 2],
            ['التنفيذ الصحيح– يوظف تكامل أطرافه في الجري المتعرج', 3],
            ['تنفيذ الجري جري في دائرة و في محور بطريقة سليمة', 4],
          ].map(([label, index]) =>
            node(
              `indicator:lvl_p2:f_locomotion:criterion:${index}:1`,
              String(label),
              {
                gradeId: 'lvl_p2',
                domainId: DOMAIN_ID,
                criterionId: `criterion:lvl_p2:f_locomotion:final-competency:${index}`,
                learningRequirementIds: [],
                order: 1,
              },
              approvedOfficial('annual-plan-reference:lvl_p2:f_locomotion:evaluation-criteria')
            )
          )
        : []
    ),
    ...specs
      .filter((spec) => spec.gradeId === 'lvl_p3')
      .flatMap(() =>
        [
          ['المشي والهرولة بشكل سليم حسب الموقف', 1],
          ['تكامل عمل الأطراف أثناء الجري الخفيف - السريع', 2],
          ['التنفيذ الصحيح اثناء الرمي بيد واحدة من الثبات', 3],
          ['تنفيذ الرمي بيدين معا من الثبات بشكل سليم و متسلسل', 4],
        ].map(([label, index]) =>
          node(
            `indicator:lvl_p3:f_locomotion:criterion:${index}:1`,
            String(label),
            {
              gradeId: 'lvl_p3',
              domainId: DOMAIN_ID,
              criterionId: `criterion:lvl_p3:f_locomotion:final-competency:${index}`,
              learningRequirementIds: [],
              order: 1,
            },
            approvedOfficial('annual-plan-reference:lvl_p3:f_locomotion:evaluation-criteria')
          )
        )
      ),
    ...specs
      .filter((spec) => spec.gradeId === 'lvl_p4')
      .flatMap(() =>
        [
          ['تنفيذ مختلف وضعيات الإنطلاق تربيةالخطوة الخطوة', 1],
          ['تكامل عمل الأطراف أثناء الجري المتعرج', 2],
          ['تكامل عمل الأطراف أثناء الجري على منحنى', 3],
          ['الجري السريع على محور بعدة وتائر', 4],
        ].map(([label, index]) =>
          node(
            `indicator:lvl_p4:f_locomotion:criterion:${index}:1`,
            String(label),
            {
              gradeId: 'lvl_p4',
              domainId: DOMAIN_ID,
              criterionId: `criterion:lvl_p4:f_locomotion:final-competency:${index}`,
              learningRequirementIds: [],
              order: 1,
            },
            approvedOfficial('annual-plan-reference:lvl_p4:f_locomotion:evaluation-criteria')
          )
        )
      ),
    ...[
      ['تنفيذ حركات الوثب برجلين معا- قفز برجل واحدة', 1],
      ['التنفيذ السليم في الجري متعرج', 2],
      ['التنفيذ المتسلسل من الجري للقفز', 3],
      ['أداء متدرج أثناء رمي الكرة', 4],
    ].map(([label, index]) =>
      node(
        `indicator:lvl_p5:f_locomotion:criterion:${index}:1`,
        String(label),
        {
          gradeId: 'lvl_p5',
          domainId: DOMAIN_ID,
          criterionId: `criterion:lvl_p5:f_locomotion:final-competency:${index}`,
          learningRequirementIds: [],
          order: 1,
        },
        approvedOfficial('annual-plan-reference:lvl_p5:f_locomotion:evaluation-criteria')
      )
    ),
  ],
  objectiveConcepts: specs.flatMap((spec) =>
    spec.concepts.map((concept, index) =>
      node(
        conceptId(spec.gradeId, index),
        concept.label,
        {
          gradeId: spec.gradeId,
          domainId: DOMAIN_ID,
          finalCompetencyId: `fc_${spec.gradeId}_${DOMAIN_ID}`,
          learningRequirementIds: concept.requirementIndexes.map((requirementIndex) =>
            requirementId(spec.gradeId, spec.requirements[requirementIndex].slug)
          ),
          competencyComponentIds: concept.componentIndexes.map((componentIndex) =>
            componentId(spec.gradeId, componentIndex)
          ),
          order: index + 1,
        },
        approvedDerived(`annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}:objective-concept`)
      )
    )
  ),
  objectiveVariants: specs.flatMap((spec) =>
    spec.concepts.map((concept, index) =>
      node(
        `objective-variant:${spec.gradeId}:${DOMAIN_ID}:${index + 1}:ar`,
        concept.label,
        {
          objectiveConceptId: conceptId(spec.gradeId, index),
          wording: concept.label,
          locale: 'ar-DZ',
          order: index + 1,
        },
        approvedDerived(`annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}:objective-variant`)
      )
    )
  ),
  objectiveKeys: [],
  aliases: specs.flatMap((spec) => [
    {
      legacyId: `source:annual-plan-reference:${spec.gradeId}:${DOMAIN_ID}:final-competency`,
      canonicalId: `fc_${spec.gradeId}_${DOMAIN_ID}`,
      reason:
        'Resolve the official Annual Plan source slot to the grade-scoped canonical identity.',
    },
    {
      legacyId: `source:domain-one-learning-section-reference:${spec.gradeId}:${DOMAIN_ID}:final-competency`,
      canonicalId: `fc_${spec.gradeId}_${DOMAIN_ID}`,
      reason: 'Resolve the reviewed Learning Section representation to the canonical identity.',
    },
  ]),
  teacherPlanSourceReferenceMappings: sourceMappings,
} satisfies Omit<PedagogicalKnowledgeCatalog, 'release'> & {
  release: Omit<CurriculumRelease, 'catalogHash'>;
};

const catalogWithPlaceholderHash = {
  ...catalogWithoutHash,
  release: { ...catalogWithoutHash.release, catalogHash: '' },
} satisfies PedagogicalKnowledgeCatalog;

export const P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG: Readonly<PedagogicalKnowledgeCatalog> =
  deepFreeze({
    ...catalogWithPlaceholderHash,
    release: {
      ...catalogWithPlaceholderHash.release,
      catalogHash: computeCatalogHash(catalogWithPlaceholderHash),
    },
  });

export const p1cFinalCompetencyId = (gradeId: P1CGradeId): string => `fc_${gradeId}_${DOMAIN_ID}`;

export const p1cRequirementIds = (gradeId: P1CGradeId): readonly string[] =>
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.learningRequirements
    .filter((item) => item.gradeId === gradeId)
    .map((item) => item.id);

export const p1cObjectiveConceptIds = (gradeId: P1CGradeId): readonly string[] =>
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG.objectiveConcepts
    .filter((item) => item.gradeId === gradeId)
    .map((item) => item.id);
