import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_ONE_FIELD_ID } from './domainOneLearningSectionReference';

export const GRADE_FIVE_LEVEL_ID = 'lvl_p5' as const;
export const GRADE_FIVE_DOMAIN_ONE_BANK_ID = 'objective-bank:lvl_p5:f_locomotion:v1' as const;
const resourceId = (slug: string) =>
  `curriculum-resource:${GRADE_FIVE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:${GRADE_FIVE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:${GRADE_FIVE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:component:${index}`;
const BODY = 'official-resource-group:lvl_p5:f_locomotion:body';
const TRANSITION = 'official-resource-group:lvl_p5:f_locomotion:transition';
const SEQUENCE = 'official-resource-group:lvl_p5:f_locomotion:sequence';
const SAFETY = 'official-resource-group:lvl_p5:f_locomotion:safety';

const resource = (
  slug: string,
  label: string,
  group: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: group,
  family,
  priority,
  selectionWeight,
});

export const GRADE_FIVE_DOMAIN_ONE_RESOURCES: readonly ObjectiveBankResource[] = deepFreeze([
  resource(
    'running-coordination',
    'التنسيق بين الأطراف أثناء الجري',
    BODY,
    'support-balance',
    'core',
    105
  ),
  resource('running-balance', 'التوازن أثناء الجري', BODY, 'support-balance', 'core', 100),
  resource('running-fluidity', 'انسيابية الجري', BODY, 'transition', 'core', 95),
  resource(
    'dynamic-steps',
    'الخطوات الديناميكية المناسبة للوتيرة',
    BODY,
    'speed-control',
    'core',
    105
  ),
  resource('jump-balance', 'التوازن أثناء الوثب', BODY, 'support-balance', 'core', 100),
  resource('safe-landing', 'السقوط السليم', BODY, 'support-balance', 'supporting', 100),
  resource(
    'throw-object-awareness',
    'الإحساس بالأداة والتحكم فيها أثناء الرمي',
    BODY,
    'response',
    'supporting',
    100
  ),
  resource(
    'push-force-sequence',
    'تسلسل القوى عند الدفع',
    SEQUENCE,
    'transition',
    'supporting',
    110
  ),
  resource('throwing-field-awareness', 'تحديد مجال الرمي', SAFETY, 'organization', 'core', 95),
  resource(
    'transition-to-jump',
    'الانتقال المناسب إلى الوثب',
    TRANSITION,
    'transition',
    'core',
    105
  ),
  resource(
    'transition-to-throw',
    'الانتقال المناسب إلى الرمي',
    TRANSITION,
    'transition',
    'core',
    105
  ),
  resource(
    'combined-movement-sequence',
    'ربط الجري والوثب والرمي',
    SEQUENCE,
    'adaptation',
    'core',
    115
  ),
  resource(
    'body-position-adaptation',
    'تعديل وضعية الجسم حسب الموقف',
    BODY,
    'adaptation',
    'core',
    110
  ),
  resource(
    'movement-coherence',
    'المحافظة على ترابط الحركات',
    SEQUENCE,
    'organization',
    'core',
    110
  ),
  resource(
    'safe-execution-space',
    'اختيار الوضعية ومجال التنفيذ الآمن',
    SAFETY,
    'organization',
    'core',
    95
  ),
  resource(
    'individual-execution',
    'التنفيذ الفردي للحركات المترابطة',
    SEQUENCE,
    'organization',
    'core',
    90
  ),
]);

export const GRADE_FIVE_DOMAIN_ONE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('body-control'), label: 'التحكم في وضعية الجسم' },
  { id: transversalId('movement-coordination'), label: 'تنسيق الحركات' },
  { id: transversalId('balance-fluidity'), label: 'التوازن والانسيابية' },
  { id: transversalId('movement-adaptation'), label: 'التكيف مع الموقف' },
  { id: transversalId('execution-space'), label: 'الوعي بمجال التنفيذ' },
  { id: transversalId('self-peer-safety'), label: 'سلامة الذات والزملاء' },
]);

const C = { c1: componentId(1), c2: componentId(2), c3: componentId(3) };
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);
const stage = (
  progressionStage: ReferenceLearningObjective['progressionStage'],
  sequenceWeight: number
) => ({ progressionStage, sequenceWeight });
const makeObjective = (
  index: number,
  objectiveText: string,
  components: string[],
  resources: string[],
  transversals: string[],
  learningContent: string,
  mobilizedKnowledge: string,
  executionContent: string,
  guidance: string,
  tags: string[],
  progression: Pick<ReferenceLearningObjective, 'progressionStage' | 'sequenceWeight'>
): ReferenceLearningObjective => ({
  id: `G5-D1-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: GRADE_FIVE_LEVEL_ID,
  domainId: DOMAIN_ONE_FIELD_ID,
  objectiveText,
  competencyComponentIds: components,
  curriculumResourceIds: resources,
  transversalResourceIds: transversals,
  learningContent,
  mobilizedKnowledge,
  executionContent,
  guidance,
  tags,
  ...progression,
  sourceReferences: [
    'EPS-2023:grade-5:domain-1',
    'domain-one-learning-section-reference:lvl_p5:f_locomotion',
  ],
});

export const GRADE_FIVE_DOMAIN_ONE_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    makeObjective(
      1,
      'ينسق عمل أطرافه ويحافظ على توازنه وانسيابية جريه.',
      [C.c1, C.c2],
      [R('running-coordination'), R('running-balance'), R('running-fluidity')],
      [T('body-control'), T('balance-fluidity')],
      'التنسيق والتوازن والانسيابية أثناء الجري.',
      'عمل الأطراف ووضعية الجسم خلال الجري.',
      'ينجز الجري بتنسيق بين الأطراف مع المحافظة على التوازن.',
      'اختيار الوضعية الملائمة واحترام مجال التنفيذ.',
      ['جري', 'تنسيق', 'توازن'],
      stage('foundation', 10)
    ),
    makeObjective(
      2,
      'يوظف خطوات ديناميكية مناسبة لوتيرة الجري.',
      [C.c1, C.c2],
      [R('dynamic-steps')],
      [T('movement-coordination'), T('balance-fluidity')],
      'الخطوات الديناميكية وعلاقتها بالوتيرة.',
      'سعة الخطوة وتتابعها وتكيفها مع الوتيرة.',
      'يعدل خطواته ويحافظ على انسيابية الجري.',
      'تجنب المبالغة ومراعاة الإمكانات الفردية.',
      ['خطوات', 'وتيرة'],
      stage('foundation', 20)
    ),
    makeObjective(
      3,
      'يحافظ على توازنه أثناء الوثب ويهبط بطريقة سليمة.',
      [C.c1, C.c2],
      [R('jump-balance'), R('safe-landing')],
      [T('balance-fluidity'), T('body-control')],
      'التوازن أثناء الوثب والسقوط السليم.',
      'وضع الجسم قبل الوثب وأثناء الهبوط.',
      'ينفذ الوثب ويحافظ على توازنه عند الهبوط.',
      'التحكم في الهبوط واحترام فضاء الزملاء.',
      ['وثب', 'توازن', 'هبوط'],
      stage('balance', 30)
    ),
    makeObjective(
      4,
      'يتخذ وضعية جسم مناسبة عند الانتقال إلى الوثب.',
      [C.c1, C.c2],
      [R('transition-to-jump'), R('jump-balance')],
      [T('body-control'), T('movement-adaptation')],
      'الانتقال المناسب إلى الوثب.',
      'توقيت الانتقال ووضعية الجسم.',
      'ينتقل من الحركة إلى الوثب بوضعية ملائمة للموقف.',
      'وضوح الانتقال وتفادي فقدان التوازن.',
      ['انتقال', 'وثب'],
      stage('transition', 40)
    ),
    makeObjective(
      5,
      'يتحكم في الأداة ويحافظ على وضعية جسمه أثناء الرمي.',
      [C.c1, C.c2],
      [R('throw-object-awareness')],
      [T('body-control'), T('execution-space')],
      'الإحساس بالأداة والتحكم فيها.',
      'وضعية الجسم وعلاقة الأطراف بالأداة.',
      'يتخذ الوضعية الملائمة ويسيطر على الأداة أثناء الرمي.',
      'الانتباه للأداة وعدم الرمي خارج المجال الآمن.',
      ['رمي', 'أداة', 'وضعية'],
      stage('locomotion-basic', 50)
    ),
    makeObjective(
      6,
      'يرتب قوى الدفع وينفذ الرمي في تسلسل متماسك.',
      [C.c1, C.c2],
      [R('push-force-sequence')],
      [T('movement-coordination'), T('body-control')],
      'تسلسل القوى عند الدفع.',
      'ترتيب مراحل الدفع وتكامل عمل الأطراف.',
      'يرتب مراحل الدفع وينفذ الرمي دون قطع التسلسل.',
      'احترام التوجيه وعدم استعمال قوة غير ملائمة.',
      ['دفع', 'رمي', 'تسلسل'],
      stage('transition', 60)
    ),
    makeObjective(
      7,
      'ينتقل إلى الرمي بوضعية مناسبة للموقف.',
      [C.c1, C.c2],
      [R('transition-to-throw'), R('throw-object-awareness')],
      [T('body-control'), T('movement-adaptation')],
      'الانتقال المناسب إلى الرمي.',
      'توقيت الانتقال ووضعية الجسم ومجال التنفيذ.',
      'يربط الحركة بالانتقال إلى الرمي ويحافظ على التحكم.',
      'التأكد من خلو المجال وانتظار الإشارة.',
      ['انتقال', 'رمي'],
      stage('transition', 70)
    ),
    makeObjective(
      8,
      'يحترم مجال الرمي ويختار وضعية تنفيذ آمنة.',
      [C.c2, C.c3],
      [R('throwing-field-awareness'), R('safe-execution-space')],
      [T('execution-space'), T('self-peer-safety')],
      'تحديد مجال الرمي وأمن التنفيذ.',
      'حدود المجال وترتيب الأدوار.',
      'ينفذ داخل المجال المخصص ويغادره بعد الأداء.',
      'لا يرمي قبل الإشارة ويحافظ على سلامة الزملاء.',
      ['مجال', 'أمن', 'رمي'],
      stage('organization', 80)
    ),
    makeObjective(
      9,
      'يربط بين الجري والوثب في انتقال حركي متماسك.',
      [C.c1, C.c2],
      [R('combined-movement-sequence'), R('transition-to-jump')],
      [T('movement-coordination'), T('movement-adaptation')],
      'الربط بين الجري والوثب.',
      'تسلسل الجري والانتقال والوثب.',
      'ينتقل من الجري إلى الوثب دون فقدان ترابط الحركة.',
      'التدرج في الانتقال واحترام مجال الممارسة.',
      ['جري', 'وثب', 'ربط'],
      stage('locomotion-advanced', 90)
    ),
    makeObjective(
      10,
      'يربط بين الجري والوثب والرمي في جملة حركية منظمة.',
      [C.c1, C.c2, C.c3],
      [R('combined-movement-sequence')],
      [T('movement-coordination'), T('body-control')],
      'تسلسل الجري والوثب والرمي.',
      'ترتيب مراحل الأداء وربطها.',
      'ينجز الجملة الحركية بانتقالات واضحة ومترابطة.',
      'احترام ترتيب المراحل وقواعد السلامة.',
      ['جري', 'وثب', 'رمي', 'تركيب'],
      stage('locomotion-advanced', 100)
    ),
    makeObjective(
      11,
      'يعدل وضعية جسمه وتسلسل حركاته حسب الموقف.',
      [C.c1, C.c2],
      [R('body-position-adaptation'), R('combined-movement-sequence')],
      [T('body-control'), T('movement-adaptation')],
      'تعديل الوضعية وتسلسل الحركة.',
      'اختيار الوضعية الملائمة وتكييف الجملة.',
      'يغير وضعية جسمه أو ترتيب حركاته عندما يتغير الموقف.',
      'الاستجابة للتوجيه وتجنب الحركة العشوائية.',
      ['تعديل', 'موقف', 'تسلسل'],
      stage('adaptation', 110)
    ),
    makeObjective(
      12,
      'يحافظ على ترابط الحركات أثناء تنفيذ جملة مركبة.',
      [C.c1, C.c2, C.c3],
      [R('movement-coherence'), R('combined-movement-sequence')],
      [T('movement-coordination'), T('balance-fluidity')],
      'ترابط الحركات المركبة.',
      'تتابع مراحل التنفيذ والانتقال بينها.',
      'ينفذ الجملة دون انقطاع ويحافظ على انسجام الأداء.',
      'وضوح البداية والنهاية واحترام التوجيهات.',
      ['ترابط', 'جملة مركبة'],
      stage('adaptation', 120)
    ),
    makeObjective(
      13,
      'يلائم وضعية جسمه عند الانتقال بين حركتين حسب متطلبات الموقف.',
      [C.c1, C.c2],
      [R('body-position-adaptation'), R('transition-to-jump')],
      [T('body-control'), T('movement-adaptation')],
      'ملاءمة وضعية الجسم لمختلف الحركات.',
      'الفروق بين الوضعيات ومتطلبات الموقف.',
      'يختار ويعدل وضعية جسمه قبل وأثناء التنفيذ.',
      'مراعاة سلامة الذات والآخرين وعدم المجازفة.',
      ['وضعية', 'تكييف'],
      stage('adaptation', 130)
    ),
    makeObjective(
      14,
      'ينفذ جملة حركية فرديا محافظا على ترابط مراحلها.',
      [C.c1, C.c2],
      [R('individual-execution'), R('movement-coherence')],
      [T('body-control'), T('movement-coordination')],
      'التنفيذ الفردي للجملة الحركية.',
      'التحكم في مراحل الأداء وترابطها.',
      'ينجز الجملة فرديا بانتقالات واضحة ومتحكم فيها.',
      'الاستقلالية واحترام قواعد الممارسة.',
      ['فردي', 'ترابط'],
      stage('organization', 140)
    ),
    makeObjective(
      15,
      'ينفذ جملة حركية جماعيا ويلائم أداءه مع المجموعة.',
      [C.c2, C.c3],
      [R('movement-coherence'), R('safe-execution-space')],
      [T('movement-adaptation'), T('self-peer-safety')],
      'التنفيذ الجماعي والانسجام.',
      'تنظيم الأدوار ومراعاة حركات الآخرين.',
      'ينسجم مع المجموعة ويحافظ على ترابط الأداء الجماعي.',
      'التواصل واحترام مجال الزملاء وقواعد السلامة.',
      ['جماعي', 'انسجام', 'أمن'],
      stage('organization', 150)
    ),
  ]);
