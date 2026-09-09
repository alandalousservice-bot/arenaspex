import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_ONE_FIELD_ID } from './domainOneLearningSectionReference';

export const GRADE_THREE_LEVEL_ID = 'lvl_p3' as const;
export const GRADE_THREE_DOMAIN_ONE_BANK_ID = 'objective-bank:lvl_p3:f_locomotion:v1' as const;

const resourceId = (slug: string) =>
  `curriculum-resource:${GRADE_THREE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:${GRADE_THREE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:${GRADE_THREE_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:component:${index}`;

const RUNNING = 'official-resource-group:lvl_p3:f_locomotion:running';
const THROWING = 'official-resource-group:lvl_p3:f_locomotion:throwing';
const GUIDANCE = 'official-resource-group:lvl_p3:f_locomotion:guidance';

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

export const GRADE_THREE_DOMAIN_ONE_RESOURCES: readonly ObjectiveBankResource[] = deepFreeze([
  resource('walk-to-jog', 'الانتقال من المشي إلى الهرولة', RUNNING, 'transition', 'core', 100),
  resource(
    'jog-to-light-run',
    'الانتقال من الهرولة إلى الجري الخفيف',
    RUNNING,
    'jogging',
    'core',
    100
  ),
  resource(
    'light-to-fast-run',
    'الانتقال من الجري الخفيف إلى الجري السريع',
    RUNNING,
    'speed-control',
    'core',
    105
  ),
  resource('running-rhythm', 'وتيرة الجري', RUNNING, 'speed-control', 'core', 95),
  resource(
    'running-body-control',
    'ضبط الجسم وعمل الأطراف أثناء الجري',
    RUNNING,
    'support-balance',
    'core',
    100
  ),
  resource('one-hand-throw-static', 'الرمي بيد واحدة من الثبات', THROWING, 'response', 'core', 105),
  resource('two-hand-throw-static', 'الرمي باليدين من الثبات', THROWING, 'response', 'core', 100),
  resource('running-throw-chain', 'الربط بين الجري والرمي', THROWING, 'transition', 'core', 110),
  resource(
    'instruction-following',
    'التعليمات والتوجيهات أثناء الأداء',
    GUIDANCE,
    'organization',
    'core',
    95
  ),
  resource(
    'throwing-space-safety',
    'أمن وسلامة الفوج ومجال الرمي',
    GUIDANCE,
    'organization',
    'core',
    105
  ),
  resource('progressive-action', 'تدرج جملة الحركات', RUNNING, 'adaptation', 'core', 100),
]);

export const GRADE_THREE_DOMAIN_ONE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('body-control'), label: 'التحكم في الجسم وعمل الأطراف' },
  { id: transversalId('rhythm-adaptation'), label: 'التدرج والتكيف مع وتيرة الجري' },
  { id: transversalId('movement-chaining'), label: 'ربط الحركات في جملة متدرجة' },
  { id: transversalId('instruction-response'), label: 'الاستجابة للتعليمات والتوجيهات' },
  { id: transversalId('space-safety'), label: 'احترام مجال الممارسة وأمن الفوج' },
  { id: transversalId('self-peer-regulation'), label: 'المحافظة على سلامة الذات والزملاء' },
]);

const components = {
  c1: componentId(1),
  c2: componentId(2),
  c3: componentId(3),
};
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);
const progression = (
  progressionStage: ReferenceLearningObjective['progressionStage'],
  sequenceWeight: number
): Pick<ReferenceLearningObjective, 'progressionStage' | 'sequenceWeight'> => ({
  progressionStage,
  sequenceWeight,
});

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
  id: `G3-D1-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: GRADE_THREE_LEVEL_ID,
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
    'EPS-2023:grade-3:domain-1',
    'domain-one-learning-section-reference:lvl_p3:f_locomotion',
  ],
  tags,
  ...stage,
});

export const GRADE_THREE_DOMAIN_ONE_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    makeObjective(
      1,
      'ينتقل من المشي إلى الهرولة وفق تدرج الحركة.',
      [components.c1, components.c2],
      [R('walk-to-jog'), R('progressive-action')],
      [T('rhythm-adaptation')],
      'التدرج من المشي إلى الهرولة.',
      'وتيرة الجري وتدرج الانتقال بين الحركات.',
      'ينتقل تدريجيا من المشي إلى الهرولة وفق التعليمات.',
      'احترام المسافة بين الزملاء والمحافظة على وتيرة مناسبة.',
      ['مشي', 'هرولة', 'تدرج'],
      progression('foundation', 10)
    ),
    makeObjective(
      2,
      'ينتقل من الهرولة إلى الجري الخفيف مع ضبط جسمه.',
      [components.c1, components.c2],
      [R('jog-to-light-run'), R('running-body-control')],
      [T('body-control'), T('rhythm-adaptation')],
      'الانتقال من الهرولة إلى الجري الخفيف.',
      'وضعية الجسم وعمل الأطراف أثناء الجري.',
      'يربط الهرولة بالجري الخفيف ويحافظ على توازن جسمه.',
      'الاستجابة للإشارة وتفادي الاصطدام.',
      ['هرولة', 'جري خفيف', 'تحكم'],
      progression('transition', 20)
    ),
    makeObjective(
      3,
      'ينتقل من الجري الخفيف إلى الجري السريع حسب الموقف.',
      [components.c1, components.c2],
      [R('light-to-fast-run'), R('progressive-action')],
      [T('rhythm-adaptation'), T('instruction-response')],
      'التدرج من الجري الخفيف إلى الجري السريع.',
      'اختلاف وتائر الجري ومتطلبات الموقف.',
      'يغير وتيرة جريه من الخفيف إلى السريع عند الحاجة.',
      'التقيد بالتعليمات واحترام مجال الجري.',
      ['جري', 'سرعة', 'موقف'],
      progression('speed-control', 30)
    ),
    makeObjective(
      4,
      'يضبط وتيرة جريه ويحافظ على انتظامها أثناء التنقل.',
      [components.c1, components.c2],
      [R('running-rhythm')],
      [T('rhythm-adaptation'), T('body-control')],
      'وتيرة الجري المنتظمة والمتغيرة.',
      'العلاقة بين السرعة والتنفس ووضعية الجسم.',
      'يحافظ على وتيرة جري ملائمة ويعدلها وفق التوجيه.',
      'عدم تجاوز حدود الفضاء ومراعاة قدرات الزملاء.',
      ['وتيرة', 'جري', 'تنظيم'],
      progression('speed-control', 40)
    ),
    makeObjective(
      5,
      'ينسق عمل أطرافه ويحافظ على وضعية جسمه أثناء الجري.',
      [components.c1, components.c2],
      [R('running-body-control')],
      [T('body-control')],
      'تنسيق الأطراف ووضعية الجسم في الجري.',
      'عمل الذراعين والساقين والتوازن أثناء الجري.',
      'ينجز الجري بتكامل بين عمل الأطراف ووضعية الجسم.',
      'التحكم في الحركة والالتزام بمسار آمن.',
      ['تنسيق', 'أطراف', 'جري'],
      progression('balance', 50)
    ),
    makeObjective(
      6,
      'يرمي بيد واحدة من الثبات وفق التوجيه المناسب.',
      [components.c1, components.c2],
      [R('one-hand-throw-static')],
      [T('instruction-response'), T('space-safety')],
      'الرمي بيد واحدة من الثبات.',
      'وضعية الرمي واتجاهه ومجاله.',
      'يتخذ وضعية الثبات ويرمي بيد واحدة في المجال المحدد.',
      'ينتظر الإشارة ويتأكد من خلو مجال الرمي.',
      ['رمي', 'ثبات', 'يد واحدة'],
      progression('locomotion-basic', 60)
    ),
    makeObjective(
      7,
      'يرمي باليدين معا من الثبات محافظا على سلامة الأداء.',
      [components.c1, components.c2],
      [R('two-hand-throw-static')],
      [T('body-control'), T('space-safety')],
      'الرمي باليدين من الثبات.',
      'تنظيم الجذع والذراعين واتجاه الرمي.',
      'ينفذ الرمي باليدين معا من الثبات بطريقة متسلسلة.',
      'احترام التعليمات ومجال الرمي والمحافظة على سلامة الفوج.',
      ['رمي', 'ثبات', 'يدين'],
      progression('locomotion-basic', 70)
    ),
    makeObjective(
      8,
      'يربط بين الجري والرمي في جملة حركية متدرجة.',
      [components.c1, components.c2],
      [R('running-throw-chain'), R('progressive-action')],
      [T('movement-chaining'), T('space-safety')],
      'الربط بين الجري والرمي.',
      'تدرج الحركات وتسلسلها قبل الرمي.',
      'ينجز جريا متدرجا ثم يطبق الرمي في التسلسل المناسب.',
      'يفصل بين مسار الجري ومجال الرمي ويحترم الإشارة.',
      ['جري', 'رمي', 'ربط'],
      progression('transition', 80)
    ),
    makeObjective(
      9,
      'يغير وتيرة جريه قبل تنفيذ الرمي حسب متطلبات الموقف.',
      [components.c1, components.c2],
      [R('light-to-fast-run'), R('running-throw-chain')],
      [T('rhythm-adaptation'), T('movement-chaining')],
      'تغيير وتيرة الجري قبل الرمي.',
      'اختيار الوتيرة المناسبة وتسلسل الجري والرمي.',
      'يعدل سرعته ثم يربط الجري بالرمي في الوضعية المطلوبة.',
      'ينفذ التغيير عند التوجيه ويحافظ على مجال آمن.',
      ['وتيرة', 'جري', 'رمي'],
      progression('adaptation', 90)
    ),
    makeObjective(
      10,
      'يعدل جملة حركاته وفق تجدد الموقف الحركي.',
      [components.c1, components.c2],
      [R('progressive-action'), R('running-throw-chain')],
      [T('movement-chaining'), T('instruction-response')],
      'تعديل جملة الجري والرمي حسب الموقف.',
      'اختيار التصرف الحركي وتكييف تسلسله.',
      'يغير ترتيب أو وتيرة أدائه عند تغير التعليمات أو الموقف.',
      'يستمع للتوجيهات ويتجنب الحركة العشوائية.',
      ['تكييف', 'جملة حركية'],
      progression('adaptation', 100)
    ),
    makeObjective(
      11,
      'يستجيب للتعليمات عند الانتقال بين الجري والرمي.',
      [components.c2, components.c3],
      [R('instruction-following'), R('running-throw-chain')],
      [T('instruction-response'), T('space-safety')],
      'التعليمات المصاحبة للجري والرمي.',
      'الإشارة، التوجيه، وقواعد الانتقال بين مراحل الأداء.',
      'يغير حركته أو يتوقف أو يبدأ وفقا للتعليمات.',
      'الانتباه للإشارة واحترام دور الزملاء.',
      ['تعليمات', 'استجابة', 'أمن'],
      progression('adaptation', 110)
    ),
    makeObjective(
      12,
      'يحترم مجال الرمي ويحافظ على أمن أفراد الفوج.',
      [components.c2, components.c3],
      [R('throwing-space-safety')],
      [T('space-safety'), T('self-peer-regulation')],
      'تنظيم مجال الرمي وأمن الفوج.',
      'حدود مجال الرمي وترتيب الأدوار.',
      'ينتظر دوره ويؤدي داخل المجال المخصص ويبتعد عنه بعد الأداء.',
      'لا يرمي قبل الإشارة ويحافظ على سلامة زملائه.',
      ['مجال الرمي', 'أمن', 'فوج'],
      progression('organization', 120)
    ),
    makeObjective(
      13,
      'ينفذ جملة الجري والرمي بتسلسل صحيح وآمن.',
      [components.c1, components.c2, components.c3],
      [R('running-throw-chain'), R('instruction-following'), R('throwing-space-safety')],
      [T('movement-chaining'), T('space-safety')],
      'تسلسل جملة الجري والرمي.',
      'ترتيب مراحل الأداء وقواعد الأمن.',
      'ينجز مراحل الجملة بترابط من الجري إلى الرمي ثم الخروج من المجال.',
      'وضوح البداية والنهاية واحترام مسار الزملاء.',
      ['تسلسل', 'جري', 'رمي', 'أمن'],
      progression('organization', 130)
    ),
    makeObjective(
      14,
      'يعدل أداءه في الجري والرمي بما يلائم إمكاناته والموقف.',
      [components.c1, components.c2],
      [R('running-rhythm'), R('progressive-action'), R('one-hand-throw-static')],
      [T('body-control'), T('rhythm-adaptation')],
      'ملاءمة الأداء لقدرات المتعلم ومتطلبات الموقف.',
      'اختيار الوتيرة والوضعية المناسبتين.',
      'يضبط سرعة الجري وشكل الرمي بما يناسب الموقف.',
      'عدم المجازفة ومراعاة سلامة الذات والزملاء.',
      ['تعديل', 'إمكانات', 'موقف'],
      progression('adaptation', 140)
    ),
    makeObjective(
      15,
      'يتعاون مع أفراد الفوج في تنظيم جملة الجري والرمي.',
      [components.c2, components.c3],
      [R('instruction-following'), R('throwing-space-safety')],
      [T('instruction-response'), T('self-peer-regulation')],
      'تنظيم الأداء داخل الفوج.',
      'توزيع الأدوار واحترام ترتيب التنفيذ.',
      'يتبادل الأدوار وينظم دخوله وخروجه من مجال الأداء.',
      'التواصل الهادئ واحترام أدوار الزملاء.',
      ['فوج', 'تنظيم', 'تعاون'],
      progression('organization', 150)
    ),
  ]);
