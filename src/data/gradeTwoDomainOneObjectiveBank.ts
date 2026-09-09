import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_ONE_FIELD_ID } from './domainOneLearningSectionReference';

export const GRADE_TWO_LEVEL_ID = 'lvl_p2' as const;
export const GRADE_TWO_DOMAIN_ONE_BANK_ID = 'objective-bank:lvl_p2:f_locomotion:v1' as const;

const resourceId = (slug: string) =>
  `curriculum-resource:${GRADE_TWO_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:${GRADE_TWO_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:${GRADE_TWO_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:component:${index}`;

const POSTURE = 'official-resource-group:lvl_p2:f_locomotion:posture';
const LOCOMOTION = 'official-resource-group:lvl_p2:f_locomotion:locomotion';
const CONTROL = 'official-resource-group:lvl_p2:f_locomotion:control';
const SPEED = 'official-resource-group:lvl_p2:f_locomotion:speed';
const PATH = 'official-resource-group:lvl_p2:f_locomotion:path';
const ORGANIZATION = 'official-resource-group:lvl_p2:f_locomotion:organization';

const resource = (
  slug: string,
  label: string,
  officialResourceGroupId: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId,
  family,
  priority,
  selectionWeight,
});

export const GRADE_TWO_DOMAIN_ONE_RESOURCES: readonly ObjectiveBankResource[] = deepFreeze([
  resource('standing-context', 'الوقوف المناسب حسب الموقف', POSTURE, 'posture', 'core', 100),
  resource('bending', 'الانحناء', POSTURE, 'posture', 'core', 90),
  resource('kneeling', 'الجثو', POSTURE, 'balance-support', 'core', 90),
  resource('posture-sequence', 'ربط وتتابع الوضعيات', POSTURE, 'transition', 'core', 100),
  resource('posture-adjustment', 'تعديل الوضعية حسب الموقف', POSTURE, 'adaptation', 'core', 100),
  resource('walking', 'المشي', LOCOMOTION, 'walking', 'core', 100),
  resource('fast-walking', 'المشي السريع', LOCOMOTION, 'walking', 'core', 90),
  resource('jogging', 'الهرولة', LOCOMOTION, 'jogging', 'core', 90),
  resource('running', 'الجري', LOCOMOTION, 'running', 'core', 100),
  resource('sprint', 'الجري السريع', LOCOMOTION, 'running', 'supporting', 70),
  resource('limb-control', 'عمل الأطراف', CONTROL, 'balance-support', 'core', 80),
  resource('limb-integration', 'تكامل الأطراف', CONTROL, 'transition', 'core', 90),
  resource('support-use', 'استثمار الارتكازات', CONTROL, 'balance-support', 'core', 85),
  resource('balance-transition', 'التوازن أثناء التحول', CONTROL, 'balance-support', 'core', 90),
  resource('acceleration', 'التسارع', SPEED, 'speed-control', 'core', 90),
  resource('deceleration', 'خفض السرعة', SPEED, 'speed-control', 'core', 85),
  resource(
    'locomotion-transition',
    'الانتقال بين أنماط التنقل',
    SPEED,
    'speed-control',
    'core',
    100
  ),
  resource('speed-situation', 'تعديل التنقل حسب تغير الموقف', SPEED, 'adaptation', 'core', 100),
  resource('straight-path', 'المسار المستقيم', PATH, 'path-straight', 'core', 90),
  resource('zigzag-path', 'المسار المتعرج', PATH, 'path-zigzag', 'core', 85),
  resource('circular-path', 'الدائرة المغلقة', PATH, 'path-circular', 'core', 85),
  resource(
    'distance-organization',
    'الابتعاد والاقتراب وتنظيم المسافات',
    ORGANIZATION,
    'organization',
    'core',
    90
  ),
  resource(
    'crowding-organization',
    'التنظيم في وضعية الازدحام',
    ORGANIZATION,
    'organization',
    'supporting',
    70
  ),
  resource(
    'situational-organization',
    'اختيار التنظيم المناسب والتكيف مع الموقف',
    ORGANIZATION,
    'adaptation',
    'core',
    100
  ),
  resource('peer-safety', 'أمن وسلامة الزملاء', ORGANIZATION, 'organization', 'core', 95),
]);

export const GRADE_TWO_DOMAIN_ONE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('body-awareness'), label: 'الوعي بوضعية الجسم' },
  { id: transversalId('limb-coordination'), label: 'تنسيق عمل الأطراف' },
  { id: transversalId('space-orientation'), label: 'التوجه في الفضاء' },
  { id: transversalId('speed-adaptation'), label: 'التكيف مع تغير السرعة' },
  { id: transversalId('path-control'), label: 'التحكم في المسار' },
  { id: transversalId('organization-safety'), label: 'التنظيم والسلامة' },
]);

type G2Stage = ReferenceLearningObjective['progressionStage'];
const progression = (
  progressionStage: G2Stage,
  sequenceWeight: number
): Pick<ReferenceLearningObjective, 'progressionStage' | 'sequenceWeight'> => ({
  progressionStage,
  sequenceWeight,
});

const components = {
  c1: componentId(1),
  c2: componentId(2),
  c3: componentId(3),
};
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);

const makeObjective = (
  index: number,
  objectiveText: string,
  competencyComponentIds: string[],
  curriculumResourceIds: string[],
  transversalResourceIds: string[],
  learningContent: string,
  mobilizedKnowledge: string,
  executionContent: string,
  guidance: string,
  tags: string[],
  stage: Pick<ReferenceLearningObjective, 'progressionStage' | 'sequenceWeight'>
): ReferenceLearningObjective => ({
  id: `G2-D1-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: GRADE_TWO_LEVEL_ID,
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
    'EPS-2023:grade-2:domain-1',
    'domain-one-learning-section-reference:lvl_p2:f_locomotion',
  ],
  tags,
  ...stage,
});

export const GRADE_TWO_DOMAIN_ONE_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    makeObjective(
      1,
      'يؤدي وضعية الوقوف المناسبة حسب الموقف.',
      [components.c1, components.c2],
      [R('standing-context')],
      [T('body-awareness')],
      'الوقوف وتغيير الوضعية بما يلائم الموقف.',
      'وضع الجسم وعمل الأطراف في الوقوف.',
      'اختيار الوقوف المناسب وتنفيذه وفق الموقف.',
      'وضوح التعليمات واحترام فضاء الزملاء.',
      ['وقوف', 'وضعية', 'موقف'],
      progression('foundation', 10)
    ),
    makeObjective(
      2,
      'يؤدي الانحناء بصورة منظمة محافظًا على توازن جسمه.',
      [components.c1, components.c2],
      [R('bending'), R('limb-control')],
      [T('body-awareness'), T('limb-coordination')],
      'الانحناء ضمن وضعيات الجسم.',
      'تنظيم الجذع والأطراف والمحافظة على التوازن.',
      'ينجز الانحناء والعودة منه بطريقة متحكم فيها.',
      'مراعاة سلامة الحركة وعدم الاصطدام بالزملاء.',
      ['انحناء', 'توازن'],
      progression('foundation', 20)
    ),
    makeObjective(
      3,
      'يؤدي وضعية الجثو مستثمرًا ارتكازاته بصورة سليمة.',
      [components.c1, components.c2],
      [R('kneeling'), R('support-use'), R('balance-transition')],
      [T('body-awareness'), T('limb-coordination')],
      'الجثو واستعمال نقاط الارتكاز.',
      'توزيع ثقل الجسم واستثمار الارتكازات.',
      'يتخذ الجثو ويحافظ على التوازن أثناء التحول منه وإليه.',
      'استعمال فضاء آمن واحترام قدرات المتعلم.',
      ['جثو', 'ارتكاز', 'توازن'],
      progression('balance', 30)
    ),
    makeObjective(
      4,
      'يربط بين مجموعة من الوضعيات في تتابع حركي منظم.',
      [components.c1, components.c2],
      [R('posture-sequence'), R('limb-integration')],
      [T('limb-coordination')],
      'تتابع الوضعيات وربطها.',
      'تسلسل الحركة وتكامل الأطراف.',
      'ينجز تتابعًا يربط وضعيتين أو أكثر بسلاسة.',
      'التدرج في التتابع والمحافظة على وضوح التنظيم.',
      ['تتابع', 'وضعيات'],
      progression('transition', 40)
    ),
    makeObjective(
      5,
      'ينتقل بين وضعيات الجسم مستثمرًا الارتكازات ومحافظًا على التوازن.',
      [components.c1, components.c2],
      [R('support-use'), R('balance-transition'), R('limb-integration')],
      [T('limb-coordination'), T('body-awareness')],
      'التحول بين الوضعيات واستثمار الارتكازات.',
      'التوازن وتكامل عمل الأطراف أثناء التحول.',
      'ينتقل بين الوضعيات بطريقة منظمة ومتحكم فيها.',
      'ضبط سرعة التحول ومراعاة سلامة الزملاء.',
      ['تحول', 'ارتكاز', 'توازن'],
      progression('transition', 50)
    ),
    makeObjective(
      6,
      'يمشي بوتيرة مناسبة محافظًا على تنظيم تنقله.',
      [components.c1, components.c2],
      [R('walking'), R('limb-control')],
      [T('space-orientation')],
      'المشي وتنظيم التنقل.',
      'وتيرة المشي واتجاه الحركة.',
      'يمشي وفق الموقف ويحافظ على مساره وتنظيمه.',
      'احترام المسافات وعدم عرقلة الزملاء.',
      ['مشي', 'تنظيم'],
      progression('locomotion-basic', 60)
    ),
    makeObjective(
      7,
      'يمشي بسرعة مناسبة للموقف محافظًا على التحكم في جسمه.',
      [components.c2, components.c3],
      [R('fast-walking'), R('speed-situation')],
      [T('speed-adaptation'), T('space-orientation')],
      'المشي السريع وتعديل التنقل.',
      'الوتيرة والتحكم في الجسم.',
      'ينجز المشي السريع ويعدله حسب الموقف.',
      'التدرج في السرعة واحترام فضاء الممارسة.',
      ['مشي سريع', 'تعديل'],
      progression('locomotion-basic', 70)
    ),
    makeObjective(
      8,
      'يهرول بوتيرة منتظمة محافظًا على مسار تنقله.',
      [components.c2, components.c3],
      [R('jogging'), R('limb-control')],
      [T('space-orientation')],
      'الهرولة وتنظيم المسار.',
      'وتيرة الهرولة وتناسق الأطراف.',
      'ينجز الهرولة ضمن مسار واضح وبوتيرة مناسبة.',
      'احترام مسافة الأمان وتنظيم الانطلاق.',
      ['هرولة', 'مسار'],
      progression('locomotion-basic', 80)
    ),
    makeObjective(
      9,
      'يجري بوتيرة متدرجة محافظًا على التحكم في تنقله.',
      [components.c2, components.c3],
      [R('running'), R('limb-integration')],
      [T('limb-coordination'), T('speed-adaptation')],
      'الجري والتحكم في الوتيرة.',
      'تنسيق الأطراف وتدرج السرعة.',
      'ينجز الجري مع الحفاظ على تنظيم التنقل.',
      'تنظيم الفضاء ومراعاة سلامة الزملاء.',
      ['جري', 'وتيرة'],
      progression('locomotion-basic', 90)
    ),
    makeObjective(
      10,
      'ينتقل بين المشي والهرولة وفق متطلبات الموقف.',
      [components.c2, components.c3],
      [R('walking'), R('jogging'), R('locomotion-transition')],
      [T('speed-adaptation')],
      'الانتقال بين أنماط التنقل.',
      'خصائص المشي والهرولة وتوقيت الانتقال.',
      'يبدل بين المشي والهرولة استجابة للموقف.',
      'تدرج الإشارة ووضوحها واحترام المسافة.',
      ['انتقال', 'مشي', 'هرولة'],
      progression('speed-control', 100)
    ),
    makeObjective(
      11,
      'يعدل سرعته بالتسارع وخفض السرعة حسب الموقف.',
      [components.c2, components.c3],
      [R('acceleration'), R('deceleration'), R('speed-situation')],
      [T('speed-adaptation')],
      'التسارع وخفض السرعة.',
      'تغير السرعة والتحكم في الحركة.',
      'يعدل سرعته وفق تغير الموقف أو الإشارة.',
      'تجنب الاندفاع والمحافظة على فضاء آمن.',
      ['تسارع', 'خفض السرعة'],
      progression('speed-control', 110)
    ),
    makeObjective(
      12,
      'يجري في مسار مستقيم محافظًا على اتجاهه.',
      [components.c2, components.c3],
      [R('running'), R('straight-path')],
      [T('path-control'), T('space-orientation')],
      'التنقل في مسار مستقيم.',
      'الاتجاه والمحافظة على المسار.',
      'ينجز الجري داخل مسار مستقيم دون الخروج عنه.',
      'وضوح حدود المسار واحترام مسافة الزملاء.',
      ['مسار مستقيم', 'جري'],
      progression('path-straight', 120)
    ),
    makeObjective(
      13,
      'يتنقل في مسار متعرج مغيرًا اتجاهه بطريقة منظمة.',
      [components.c2, components.c3],
      [R('zigzag-path'), R('locomotion-transition')],
      [T('path-control'), T('space-orientation')],
      'التنقل في مسار متعرج.',
      'تغيير الاتجاه والتحكم في التنقل.',
      'ينجز مسارًا متعرجًا مع ضبط اتجاهه.',
      'احترام المعالم وتنظيم المرور داخل المسار.',
      ['مسار متعرج', 'اتجاه'],
      progression('path-zigzag', 130)
    ),
    makeObjective(
      14,
      'يتنقل في دائرة مغلقة محافظًا على تنظيمه ومسافته.',
      [components.c2, components.c3],
      [R('circular-path'), R('distance-organization')],
      [T('path-control'), T('organization-safety')],
      'التنقل في دائرة مغلقة.',
      'الاتجاه والمسافة والتنظيم.',
      'يحافظ على مساره ومسافته أثناء التنقل الدائري.',
      'تنظيم الاتجاه ومنع الازدحام داخل الدائرة.',
      ['دائرة', 'تنظيم'],
      progression('path-circular', 140)
    ),
    makeObjective(
      15,
      'يعدل وضعيته وتنقله حسب تغير الموقف.',
      [components.c1, components.c2, components.c3],
      [R('posture-adjustment'), R('speed-situation'), R('locomotion-transition')],
      [T('body-awareness'), T('speed-adaptation')],
      'تعديل الوضعية والتنقل حسب الموقف.',
      'اختيار الاستجابة الحركية الملائمة.',
      'يغير وضعيته وطريقة تنقله وفق تغير الموقف.',
      'تنويع المواقف مع الحفاظ على وضوح التعليمات والسلامة.',
      ['تكيف', 'موقف'],
      progression('adaptation', 150)
    ),
    makeObjective(
      16,
      'ينظم ابتعاده واقترابه ويحافظ على مسافة مناسبة أثناء التنقل.',
      [components.c2, components.c3],
      [R('distance-organization'), R('crowding-organization')],
      [T('organization-safety'), T('space-orientation')],
      'الابتعاد والاقتراب وتنظيم المسافات.',
      'المسافة والاقتراب والابتعاد داخل الفضاء.',
      'يختار تنظيمه ويحافظ على المسافة المناسبة من الزملاء.',
      'تجنب الازدحام ومراعاة أمن الزملاء.',
      ['مسافة', 'اقتراب', 'ابتعاد'],
      progression('adaptation', 160)
    ),
    makeObjective(
      17,
      'يختار التنظيم المناسب ويتكيف مع الموقف محافظًا على أمن زملائه.',
      [components.c1, components.c2, components.c3],
      [R('situational-organization'), R('peer-safety')],
      [T('organization-safety')],
      'اختيار التنظيم والتكيف مع الموقف.',
      'التنظيم المناسب وقواعد الأمن.',
      'يتكيف مع التنظيم المطلوب ويحافظ على سلامة زملائه.',
      'تثبيت قواعد الأمن قبل التنفيذ وأثناءه.',
      ['تنظيم', 'تكيف', 'سلامة'],
      progression('adaptation', 170)
    ),
  ]);

export function getGradeTwoDomainOneObjectiveBankResource(id: string) {
  return GRADE_TWO_DOMAIN_ONE_RESOURCES.find((resource) => resource.id === id);
}
