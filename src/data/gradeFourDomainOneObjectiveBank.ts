import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_ONE_FIELD_ID } from './domainOneLearningSectionReference';

export const GRADE_FOUR_LEVEL_ID = 'lvl_p4' as const;
export const GRADE_FOUR_DOMAIN_ONE_BANK_ID = 'objective-bank:lvl_p4:f_locomotion:v1' as const;
const resourceId = (slug: string) =>
  `curriculum-resource:${GRADE_FOUR_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:${GRADE_FOUR_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:${GRADE_FOUR_LEVEL_ID}:${DOMAIN_ONE_FIELD_ID}:component:${index}`;

const BODY = 'official-resource-group:lvl_p4:f_locomotion:body';
const PATH = 'official-resource-group:lvl_p4:f_locomotion:path';
const RHYTHM = 'official-resource-group:lvl_p4:f_locomotion:rhythm';
const GROUP = 'official-resource-group:lvl_p4:f_locomotion:group';

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

export const GRADE_FOUR_DOMAIN_ONE_RESOURCES: readonly ObjectiveBankResource[] = deepFreeze([
  resource('body-position-running', 'وضعية الجسم أثناء الجري', BODY, 'posture', 'core', 105),
  resource('stride-mechanics', 'تربية الخطوة وآليتها', BODY, 'transition', 'core', 110),
  resource(
    'limb-coordination',
    'تكامل عمل الأطراف خلال الجري',
    BODY,
    'balance-support',
    'core',
    105
  ),
  resource('high-speed-running', 'الجري بسرعة قصوى', RHYTHM, 'speed-control', 'core', 100),
  resource('axis-running', 'الجري على محور', PATH, 'path-straight', 'core', 95),
  resource('curve-running', 'الجري على منحنى', PATH, 'path-circular', 'core', 90),
  resource('zigzag-running', 'الجري على خط متعرج', PATH, 'path-zigzag', 'core', 90),
  resource('running-rhythm', 'وتيرة الجري', RHYTHM, 'speed-control', 'core', 100),
  resource('rhythm-change', 'تغيير وتيرة الجري', RHYTHM, 'adaptation', 'core', 100),
  resource('individual-execution', 'تنفيذ الحركات فرديا', BODY, 'organization', 'core', 85),
  resource('group-running', 'الجري ضمن مجموعة', GROUP, 'organization', 'core', 95),
  resource('group-rhythm-sync', 'الانسجام مع وتيرة المجموعة', GROUP, 'adaptation', 'core', 105),
  resource('movement-coherence', 'المحافظة على ترابط الحركات', GROUP, 'transition', 'core', 110),
  resource(
    'changing-running-requirements',
    'التكيف مع متطلبات الجري المتغيرة',
    RHYTHM,
    'adaptation',
    'core',
    100
  ),
]);

export const GRADE_FOUR_DOMAIN_ONE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('body-control'), label: 'التحكم في الجسم' },
  { id: transversalId('stride-awareness'), label: 'الوعي بالخطوة' },
  { id: transversalId('limb-coordination'), label: 'تنسيق عمل الأطراف' },
  { id: transversalId('path-control'), label: 'التحكم في المسار' },
  { id: transversalId('rhythm-response'), label: 'الاستجابة للوتيرة' },
  { id: transversalId('group-synchronization'), label: 'الانسجام مع المجموعة' },
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
  id: `G4-D1-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: GRADE_FOUR_LEVEL_ID,
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
    'EPS-2023:grade-4:domain-1',
    'domain-one-learning-section-reference:lvl_p4:f_locomotion',
  ],
});

export const GRADE_FOUR_DOMAIN_ONE_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    makeObjective(
      1,
      'يضبط وضعية جسمه أثناء الجري ويحافظ على توازنه.',
      [C.c1, C.c2],
      [R('body-position-running')],
      [T('body-control')],
      'وضعية الجسم أثناء الجري.',
      'وضع الجذع وعمل الأطراف والتوازن.',
      'يجري محافظا على وضعية جسم مناسبة ومتوازنة.',
      'التحكم في الحركة واحترام مجال الممارسة.',
      ['وضعية', 'جري'],
      stage('foundation', 10)
    ),
    makeObjective(
      2,
      'يوظف الخطوة المناسبة ويحافظ على انتظامها أثناء الجري.',
      [C.c1, C.c2],
      [R('stride-mechanics')],
      [T('stride-awareness')],
      'تربية الخطوة وآليتها.',
      'تتابع الخطوات وعلاقتها بسرعة الجري.',
      'ينظم خطواته ويستعملها بانتظام أثناء التنقل.',
      'تجنب التسرع ومراعاة المسار.',
      ['خطوة', 'تنظيم'],
      stage('foundation', 20)
    ),
    makeObjective(
      3,
      'ينسق عمل أطرافه مع وضعية جسمه أثناء الجري.',
      [C.c1, C.c2],
      [R('limb-coordination'), R('body-position-running')],
      [T('body-control'), T('limb-coordination')],
      'تكامل الأطراف خلال الجري.',
      'عمل الذراعين والساقين وتوازن الجسم.',
      'ينجز الجري بتكامل بين الأطراف والجذع.',
      'الحفاظ على التحكم وعدم الاصطدام.',
      ['أطراف', 'تنسيق'],
      stage('balance', 30)
    ),
    makeObjective(
      4,
      'ينفذ الجري الفردي بسرعة متزايدة مع المحافظة على ترابط حركته.',
      [C.c1, C.c2],
      [R('individual-execution'), R('high-speed-running')],
      [T('body-control'), T('rhythm-response')],
      'التنفيذ الفردي والجري السريع.',
      'العلاقة بين التقنية والسرعة.',
      'ينجز جريا فرديا متماسكا وينتقل إلى سرعة أعلى وفق التوجيه.',
      'عدم تجاوز قدراته واحترام فضاء الآخرين.',
      ['فردي', 'سرعة'],
      stage('locomotion-basic', 40)
    ),
    makeObjective(
      5,
      'يجري على محور محافظا على وضعية جسمه وانتظام خطوته.',
      [C.c1, C.c2],
      [R('axis-running'), R('body-position-running'), R('stride-mechanics')],
      [T('path-control'), T('stride-awareness')],
      'الجري على محور.',
      'المحافظة على الاتجاه والخطوة.',
      'يتبع المحور ويحافظ على ترابط الجري.',
      'وضوح المسار واحترام بدايته ونهايته.',
      ['محور', 'مسار'],
      stage('path-straight', 50)
    ),
    makeObjective(
      6,
      'يضبط جريه على منحنى مع تنسيق عمل أطرافه.',
      [C.c1, C.c2],
      [R('curve-running'), R('limb-coordination')],
      [T('path-control'), T('limb-coordination')],
      'الجري على منحنى.',
      'تغير الاتجاه وتكيف الجسم مع المسار.',
      'يتبع المنحنى ويعدل وضعية جسمه وأطرافه.',
      'التحكم في الاتجاه وتفادي الخروج من المسار.',
      ['منحنى', 'تنسيق'],
      stage('path-circular', 60)
    ),
    makeObjective(
      7,
      'ينفذ الجري على خط متعرج مع تغيير اتجاهه بانسجام.',
      [C.c1, C.c2],
      [R('zigzag-running'), R('limb-coordination')],
      [T('path-control'), T('body-control')],
      'الجري على خط متعرج.',
      'تغيير الاتجاه وتنسيق الأطراف.',
      'يغير اتجاهه عند المعالم ويحافظ على ترابط الجري.',
      'الانتباه للمسار والابتعاد عن الزملاء.',
      ['متعرج', 'اتجاه'],
      stage('path-zigzag', 70)
    ),
    makeObjective(
      8,
      'يستجيب لتغير وتيرة الجري ويحافظ على ترابط حركاته.',
      [C.c1, C.c2],
      [R('running-rhythm'), R('rhythm-change'), R('movement-coherence')],
      [T('rhythm-response'), T('body-control')],
      'وتيرة الجري وتغييرها.',
      'الاستجابة للوتيرة وربط الحركات.',
      'يغير وتيرته عند التوجيه دون فقدان ترابط الأداء.',
      'الإنصات للإشارة واحترام مجال الجري.',
      ['وتيرة', 'تغيير'],
      stage('speed-control', 80)
    ),
    makeObjective(
      9,
      'يغير وتيرة جريه بما يلائم متطلبات المسار.',
      [C.c1, C.c2],
      [R('rhythm-change'), R('changing-running-requirements')],
      [T('rhythm-response'), T('path-control')],
      'تكييف الوتيرة حسب متطلبات الجري.',
      'اختيار الوتيرة المناسبة للمسار.',
      'يسرع أو يبطئ جريه عند تغير المسار أو التوجيه.',
      'التدرج في التغيير والمحافظة على السلامة.',
      ['تكييف', 'وتيرة'],
      stage('speed-control', 90)
    ),
    makeObjective(
      10,
      'يحافظ على ترابط جملة حركية أثناء الجري في مسارات مختلفة.',
      [C.c1, C.c2],
      [R('movement-coherence'), R('axis-running'), R('curve-running')],
      [T('path-control'), T('body-control')],
      'ترابط الجري عبر المسارات.',
      'تتابع الحركات وتكيفها مع المسار.',
      'يربط مراحل الجري دون انقطاع أو فقدان التحكم.',
      'وضوح الانتقال بين المسارات واحترام التعليمات.',
      ['ترابط', 'مسارات'],
      stage('locomotion-advanced', 100)
    ),
    makeObjective(
      11,
      'ينسجم مع وتيرة الجري داخل المجموعة ويحافظ على موقعه.',
      [C.c1, C.c3],
      [R('group-running'), R('group-rhythm-sync')],
      [T('group-synchronization'), T('rhythm-response')],
      'الجري ضمن مجموعة.',
      'وتيرة المجموعة وتنظيم الموقع.',
      'يجري مع المجموعة ويعدل وتيرته للمحافظة على الانسجام.',
      'احترام المسافة وعدم عرقلة الزملاء.',
      ['مجموعة', 'انسجام'],
      stage('organization', 110)
    ),
    makeObjective(
      12,
      'ينفذ حركة الجري جماعيا مع المحافظة على ترابط المجموعة.',
      [C.c2, C.c3],
      [R('group-running'), R('movement-coherence')],
      [T('group-synchronization'), T('body-control')],
      'التنفيذ الجماعي وترابط الحركات.',
      'تزامن الأداء وترتيب المجموعة.',
      'ينفذ الجري مع زملائه ويحافظ على ترابط الحركة الجماعية.',
      'الاستجابة للوتيرة المشتركة واحترام الفضاء.',
      ['جماعي', 'ترابط'],
      stage('organization', 120)
    ),
    makeObjective(
      13,
      'يعدل وضعية جسمه وعمل أطرافه وفق تغير وتيرة المجموعة.',
      [C.c1, C.c2, C.c3],
      [R('group-rhythm-sync'), R('limb-coordination'), R('changing-running-requirements')],
      [T('group-synchronization'), T('limb-coordination')],
      'التكيف مع وتيرة المجموعة.',
      'العلاقة بين وضعية الجسم والأطراف والوتيرة.',
      'يغير أداءه ليبقى منسجما مع المجموعة.',
      'الانتباه للزملاء وعدم فرض وتيرة فردية.',
      ['تكيف', 'مجموعة', 'أطراف'],
      stage('adaptation', 130)
    ),
    makeObjective(
      14,
      'يربط بين الجري وتغيير الاتجاه والوتيرة في أداء متماسك.',
      [C.c1, C.c2],
      [R('zigzag-running'), R('rhythm-change'), R('movement-coherence')],
      [T('path-control'), T('rhythm-response')],
      'تركيب الجري وتغيير الاتجاه والوتيرة.',
      'تنسيق المسار والسرعة وترابط الحركة.',
      'ينجز تغييرا متتابعا في الاتجاه والوتيرة دون فقدان التحكم.',
      'التدرج في التركيب واحترام المجال.',
      ['تركيب', 'اتجاه', 'وتيرة'],
      stage('adaptation', 140)
    ),
    makeObjective(
      15,
      'ينفذ مختلف الحركات فرديا وجماعيا ويحافظ على ترابطها.',
      [C.c1, C.c2, C.c3],
      [R('individual-execution'), R('group-running'), R('movement-coherence')],
      [T('body-control'), T('group-synchronization')],
      'الحركات الفردية والجماعية المترابطة.',
      'التحكم الفردي والانسجام الجماعي.',
      'ينفذ الجملة الحركية فرديا ثم ضمن المجموعة بترابط.',
      'احترام قواعد التنظيم والتعاون وسلامة الزملاء.',
      ['فردي', 'جماعي', 'ترابط'],
      stage('organization', 150)
    ),
  ]);
