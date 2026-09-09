import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type { TeacherLearningObjective } from '../types/spex';
import { DOMAIN_ONE_FIELD_ID } from './domainOneLearningSectionReference';

export const GRADE_ONE_LEVEL_ID = 'lvl_p1' as const;
export const GRADE_ONE_DOMAIN_ONE_BANK_ID = 'objective-bank:lvl_p1:f_locomotion:v1' as const;

export interface ObjectiveBankResource {
  readonly id: string;
  readonly label: string;
  readonly officialResourceGroupId: string;
}

export interface ObjectiveBankTransversalResource {
  readonly id: string;
  readonly label: string;
}

export interface ReferenceLearningObjective {
  readonly id: string;
  readonly gradeId: typeof GRADE_ONE_LEVEL_ID;
  readonly domainId: typeof DOMAIN_ONE_FIELD_ID;
  readonly objectiveText: string;
  readonly competencyComponentIds: readonly string[];
  readonly curriculumResourceIds: readonly string[];
  readonly transversalResourceIds: readonly string[];
  readonly learningContent: string;
  readonly mobilizedKnowledge: string;
  readonly executionContent: string;
  readonly guidance: string;
  readonly sourceReferences: readonly string[];
  readonly tags: readonly string[];
}

const componentId = (index: number) =>
  `learning-section:${GRADE_ONE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:component:${index}`;
const resourceId = (slug: string) =>
  `curriculum-resource:${GRADE_ONE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:${GRADE_ONE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;

const POSTURES_GROUP = 'official-resource-group:lvl_p1:f_locomotion:1';
const LOCOMOTION_GROUP = 'official-resource-group:lvl_p1:f_locomotion:4';

export const GRADE_ONE_DOMAIN_ONE_RESOURCES: readonly ObjectiveBankResource[] = deepFreeze([
  { id: resourceId('standing'), label: 'وضعيات الوقوف', officialResourceGroupId: POSTURES_GROUP },
  { id: resourceId('sitting'), label: 'وضعيات الجلوس', officialResourceGroupId: POSTURES_GROUP },
  {
    id: resourceId('standing-sitting-transition'),
    label: 'التحول بين الوقوف والجلوس',
    officialResourceGroupId: POSTURES_GROUP,
  },
  { id: resourceId('prone'), label: 'الانبطاح', officialResourceGroupId: POSTURES_GROUP },
  {
    id: resourceId('all-fours'),
    label: 'الانتصاب على أربع',
    officialResourceGroupId: POSTURES_GROUP,
  },
  {
    id: resourceId('reverse-all-fours'),
    label: 'الانتصاب على أربع المعكوس',
    officialResourceGroupId: POSTURES_GROUP,
  },
  {
    id: resourceId('single-leg-stance'),
    label: 'الوقوف على رجل واحدة',
    officialResourceGroupId: POSTURES_GROUP,
  },
  {
    id: resourceId('kneeling'),
    label: 'الارتكاز على الركبتين',
    officialResourceGroupId: POSTURES_GROUP,
  },
  {
    id: resourceId('individual-walking'),
    label: 'المشي الفردي',
    officialResourceGroupId: LOCOMOTION_GROUP,
  },
  {
    id: resourceId('active-walking'),
    label: 'المشي النشيط',
    officialResourceGroupId: LOCOMOTION_GROUP,
  },
  {
    id: resourceId('paired-walking'),
    label: 'المشي الثنائي',
    officialResourceGroupId: LOCOMOTION_GROUP,
  },
  {
    id: resourceId('individual-jogging'),
    label: 'الهرولة الفردية',
    officialResourceGroupId: LOCOMOTION_GROUP,
  },
  {
    id: resourceId('paired-jogging'),
    label: 'الهرولة الثنائية',
    officialResourceGroupId: LOCOMOTION_GROUP,
  },
  {
    id: resourceId('posture-response'),
    label: 'الانتقال والاستجابة حسب الموقف',
    officialResourceGroupId: POSTURES_GROUP,
  },
]);

export const GRADE_ONE_DOMAIN_ONE_TRANSVERSAL_RESOURCES: readonly ObjectiveBankTransversalResource[] =
  deepFreeze([
    { id: transversalId('limb-integration'), label: 'وظائف الأطراف وتكاملها' },
    { id: transversalId('effective-limb-use'), label: 'استخدام الأطراف بفعالية' },
    { id: transversalId('posture-by-situation'), label: 'أخذ الوضعية حسب الموقف' },
    { id: transversalId('locomotion-pattern'), label: 'الالتزام بنمط التنقل وصفاته' },
    { id: transversalId('situation-response'), label: 'الاستجابة لمتطلبات الوضعية' },
    { id: transversalId('situation-adaptation'), label: 'التكيف حسب الوضعية والموقف' },
  ]);

const objective = (
  index: number,
  objectiveText: string,
  competencyComponentIds: readonly string[],
  curriculumResourceIds: readonly string[],
  transversalResourceIds: readonly string[],
  learningContent: string,
  mobilizedKnowledge: string,
  executionContent: string,
  guidance: string,
  tags: readonly string[]
): ReferenceLearningObjective => {
  const officialResourceGroupIds = curriculumResourceIds
    .map(
      (id) =>
        GRADE_ONE_DOMAIN_ONE_RESOURCES.find((resource) => resource.id === id)
          ?.officialResourceGroupId
    )
    .filter((id): id is string => Boolean(id));
  return {
    id: `G1-D1-OBJ-${String(index).padStart(2, '0')}`,
    gradeId: GRADE_ONE_LEVEL_ID,
    domainId: DOMAIN_ONE_FIELD_ID,
    objectiveText,
    competencyComponentIds,
    curriculumResourceIds,
    transversalResourceIds,
    learningContent,
    mobilizedKnowledge,
    executionContent,
    guidance,
    sourceReferences: [
      'EPS-2023:grade-1:domain-1',
      ...new Set(officialResourceGroupIds),
      'domain-one-learning-section-reference:lvl_p1:f_locomotion',
    ],
    tags,
  };
};

const C1 = componentId(1);
const C2 = componentId(2);
const C3 = componentId(3);
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);

export const GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    objective(
      1,
      'يتخذ وضعيات الوقوف المختلفة بصورة سليمة حسب الموقف.',
      [C1, C2],
      [R('standing')],
      [T('posture-by-situation'), T('situation-adaptation')],
      'الوقوف العادي والوقوف ضمًا وفتحًا وأمامًا وخلفًا.',
      'أشكال الوقوف ووضع الأطراف والتوازن المناسب لكل وضعية.',
      'اتخاذ وضعيات الوقوف المطلوبة والانتقال بينها حسب الإشارة.',
      'تدرج التعليمات ومراعاة ثبات الجسم وسلامة فضاء الأداء.',
      ['وضعيات', 'وقوف', 'توازن']
    ),
    objective(
      2,
      'يتخذ وضعيات الجلوس المختلفة بصورة سليمة حسب الموقف.',
      [C1, C2],
      [R('sitting')],
      [T('posture-by-situation'), T('effective-limb-use')],
      'الجلوس العادي والتربع والجلوس على شيء والجلوس ضمًا والقرفصاء.',
      'أشكال الجلوس وتوزيع الارتكاز ووضع الأطراف.',
      'اتخاذ وضعية الجلوس المطلوبة بصورة مستقرة حسب الموقف.',
      'مراعاة ملاءمة سطح الجلوس والمحافظة على وضعية جسم سليمة.',
      ['وضعيات', 'جلوس', 'قرفصاء']
    ),
    objective(
      3,
      'ينتقل بين وضعيتي الوقوف والجلوس محافظًا على توازنه.',
      [C2],
      [R('standing'), R('sitting'), R('standing-sitting-transition')],
      [T('limb-integration'), T('situation-response')],
      'التحول من الوقوف إلى الجلوس ومن الجلوس إلى الوقوف.',
      'تسلسل الحركة وتكامل عمل الأطراف والمحافظة على التوازن.',
      'تنفيذ التحول بين الوضعيتين بسلاسة استجابة للإشارة.',
      'التركيز على التحكم في الحركة وتجنب السقوط أو الاندفاع.',
      ['تحول', 'وقوف', 'جلوس', 'توازن']
    ),
    objective(
      4,
      'يؤدي وضعية الانبطاح موظفًا أطراف جسمه بصورة متكاملة.',
      [C1, C2],
      [R('prone')],
      [T('limb-integration'), T('effective-limb-use')],
      'وضعية الانبطاح ضمن الوضعيات الجسمية غير المألوفة.',
      'تموضع الجذع والأطراف ونقاط ملامسة الجسم للأرض.',
      'اتخاذ وضعية الانبطاح والعودة منها باستعمال الأطراف بصورة منسقة.',
      'تنفيذ الوضعية فوق سطح آمن مع احترام المجال الشخصي.',
      ['وضعيات غير مألوفة', 'انبطاح', 'تكامل الأطراف']
    ),
    objective(
      5,
      'يؤدي الانتصاب على أربع موظفًا ارتكازاته بصورة سليمة.',
      [C1, C2],
      [R('all-fours')],
      [T('limb-integration'), T('effective-limb-use')],
      'الانتصاب على أربع وتوظيف نقاط الارتكاز.',
      'توزيع ثقل الجسم وتكامل عمل اليدين والركبتين أو القدمين.',
      'اتخاذ وضعية الانتصاب على أربع والمحافظة على استقرارها.',
      'ضبط تباعد الارتكازات ومراعاة سلامة الرسغين والركبتين.',
      ['وضعيات غير مألوفة', 'انتصاب على أربع', 'ارتكاز']
    ),
    objective(
      6,
      'يؤدي الانتصاب على أربع المعكوس محافظًا على توازن جسمه.',
      [C1, C2],
      [R('reverse-all-fours')],
      [T('limb-integration'), T('situation-adaptation')],
      'الانتصاب على أربع المعكوس ضمن الوضعيات غير المألوفة.',
      'نقاط الارتكاز وتوزيع ثقل الجسم والتوازن في الوضعية المعكوسة.',
      'اتخاذ الوضعية المعكوسة والمحافظة على استقرار الجسم.',
      'التدرج في اتخاذ الوضعية واستعمال سطح آمن وخالٍ من العوائق.',
      ['وضعيات غير مألوفة', 'انتصاب معكوس', 'توازن']
    ),
    objective(
      7,
      'يحافظ على توازنه أثناء الوقوف على رجل واحدة.',
      [C1, C2],
      [R('single-leg-stance')],
      [T('effective-limb-use'), T('situation-response')],
      'الوقوف على رجل واحدة ضمن الوضعيات الجسمية غير المألوفة.',
      'قاعدة الارتكاز ووضع الأطراف ودورها في حفظ التوازن.',
      'اتخاذ وضعية الوقوف على رجل واحدة والمحافظة على استقرار الجسم.',
      'تغيير رجل الارتكاز عند الحاجة وتوفير مسافة أمان بين المتعلمين.',
      ['وقوف', 'رجل واحدة', 'توازن']
    ),
    objective(
      8,
      'يتخذ وضعية الارتكاز على الركبتين محافظًا على توازنه.',
      [C1, C2],
      [R('kneeling')],
      [T('posture-by-situation'), T('effective-limb-use')],
      'وضعية الارتكاز على الركبتين.',
      'قاعدة الارتكاز ووضع الجذع والأطراف أثناء الجثو.',
      'اتخاذ وضعية الارتكاز على الركبتين والمحافظة على استقرارها.',
      'استعمال سطح مناسب وتجنب الضغط المؤلم على الركبتين.',
      ['ارتكاز', 'ركبتان', 'توازن']
    ),
    objective(
      9,
      'يمشي فرديًا بوتيرة منتظمة محافظًا على مسار تنقله.',
      [C2, C3],
      [R('individual-walking')],
      [T('locomotion-pattern'), T('situation-response')],
      'المشي العادي في تنظيم فردي.',
      'وتيرة المشي واتجاه الحركة ومسار التنقل.',
      'المشي الفردي ضمن مسار محدد بوتيرة منتظمة.',
      'احترام حدود المسار والمسافة الآمنة مع الآخرين.',
      ['مشي', 'فردي', 'مسار']
    ),
    objective(
      10,
      'يمشي بوتيرة نشيطة محافظًا على انتظام حركته ومسار تنقله.',
      [C2, C3],
      [R('active-walking')],
      [T('locomotion-pattern'), T('situation-adaptation')],
      'المشي النشيط مع المحافظة على انتظام التنقل.',
      'خصائص وتيرة المشي النشيط وتنظيم حركة الأطراف.',
      'المشي النشيط داخل مسار محدد مع ضبط الوتيرة والاتجاه.',
      'التدرج من المشي العادي إلى النشيط دون فقدان التحكم.',
      ['مشي', 'نشيط', 'وتيرة']
    ),
    objective(
      11,
      'يمشي ثنائيًا منسجمًا مع حركة زميله ووتيرة تنقله.',
      [C2, C3],
      [R('paired-walking')],
      [T('limb-integration'), T('situation-adaptation')],
      'المشي في تنظيم ثنائي.',
      'التوافق مع الزميل والوتيرة المشتركة واتجاه التنقل.',
      'المشي مع زميل ضمن مسار مشترك مع المحافظة على الانسجام.',
      'تكوين ثنائيات متقاربة في القدرة واحترام مجال حركة الزميل.',
      ['مشي', 'ثنائي', 'انسجام']
    ),
    objective(
      12,
      'يهرول فرديًا بوتيرة منتظمة محافظًا على مسار تنقله.',
      [C2, C3],
      [R('individual-jogging')],
      [T('locomotion-pattern'), T('situation-response')],
      'الهرولة في تنظيم فردي.',
      'وتيرة الهرولة وتناسق الأطراف واتجاه التنقل.',
      'الهرولة الفردية ضمن مسار محدد بوتيرة منتظمة.',
      'تنظيم الانطلاقات والمحافظة على مسافة الأمان داخل المسار.',
      ['هرولة', 'فردي', 'وتيرة']
    ),
    objective(
      13,
      'يهرول ثنائيًا منسجمًا مع حركة زميله ووتيرة تنقله.',
      [C2, C3],
      [R('paired-jogging')],
      [T('limb-integration'), T('situation-adaptation')],
      'الهرولة في تنظيم ثنائي.',
      'التوافق الحركي والوتيرة المشتركة ومسار التنقل.',
      'الهرولة مع زميل ضمن مسار مشترك مع المحافظة على الانسجام.',
      'ضبط سرعة الثنائي واحترام المسافة مع الثنائيات الأخرى.',
      ['هرولة', 'ثنائي', 'انسجام']
    ),
    objective(
      14,
      'ينتقل بين وضعيات جسمية مختلفة مستجيبًا للإشارة ومتطلبات الموقف.',
      [C2, C3],
      [R('posture-response')],
      [T('posture-by-situation'), T('situation-response'), T('situation-adaptation')],
      'الانتقال بين الوضعيات الجسمية المألوفة وغير المألوفة.',
      'اختيار الوضعية المناسبة وفهم الإشارة وتنظيم الاستجابة الحركية.',
      'تغيير الوضعية أو طريقة التنقل وفق الإشارة والموقف المعروض.',
      'تنويع الإشارات تدريجيًا والمحافظة على وضوح التعليمات والسلامة.',
      ['استجابة', 'تحول', 'تكيف']
    ),
  ]);

export function getLearningObjectiveBank(
  gradeId: string,
  domainId: string
): readonly ReferenceLearningObjective[] {
  return gradeId === GRADE_ONE_LEVEL_ID && domainId === DOMAIN_ONE_FIELD_ID
    ? GRADE_ONE_DOMAIN_ONE_OBJECTIVE_BANK
    : [];
}

export function getLearningObjectiveBankItem(
  gradeId: string,
  domainId: string,
  objectiveId: string
): ReferenceLearningObjective | undefined {
  return getLearningObjectiveBank(gradeId, domainId).find((item) => item.id === objectiveId);
}

export interface ObjectiveBankCoverage {
  readonly total: number;
  readonly covered: readonly ObjectiveBankResource[];
  readonly missing: readonly ObjectiveBankResource[];
}

export function calculateObjectiveBankCoverage(
  gradeId: string,
  domainId: string,
  objectives: readonly Pick<TeacherLearningObjective, 'curriculumResourceIds'>[]
): ObjectiveBankCoverage {
  const resources =
    gradeId === GRADE_ONE_LEVEL_ID && domainId === DOMAIN_ONE_FIELD_ID
      ? GRADE_ONE_DOMAIN_ONE_RESOURCES
      : [];
  const coveredIds = new Set(
    objectives
      .flatMap((item) => item.curriculumResourceIds || [])
      .filter((id) => resources.some((resource) => resource.id === id))
  );
  return {
    total: resources.length,
    covered: resources.filter((resource) => coveredIds.has(resource.id)),
    missing: resources.filter((resource) => !coveredIds.has(resource.id)),
  };
}
