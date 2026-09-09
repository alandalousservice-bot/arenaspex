import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_TWO_FIELD_ID } from './domainTwoLearningSectionReference';

export const GRADE_THREE_DOMAIN_TWO_LEVEL_ID = 'lvl_p3' as const;
export const GRADE_THREE_DOMAIN_TWO_BANK_ID = 'objective-bank:lvl_p3:f_fundamentals:v1' as const;
const rid = (slug: string) => `curriculum-resource:lvl_p3:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const tid = (slug: string) => `transversal-resource:lvl_p3:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const cid = (n: number) => `learning-section:lvl_p3:${DOMAIN_TWO_FIELD_ID}:component:${n}`;
const resource = (
  slug: string,
  label: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: rid(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p3:${DOMAIN_TWO_FIELD_ID}:${family}`,
  family,
  priority,
  selectionWeight,
});

export const GRADE_THREE_DOMAIN_TWO_RESOURCES = deepFreeze([
  resource(
    'running-rhythm',
    'الجري حسب الوتائر البطيئة والمتوسطة والسريعة',
    'speed-control',
    'core',
    105
  ),
  resource('straight-running', 'الجري على خط مستقيم', 'path-straight', 'core', 100),
  resource('curved-running', 'الجري في منعرج', 'path-circular', 'core', 90),
  resource('zigzag-running', 'الجري المتعرج', 'path-zigzag', 'core', 85),
  resource('running-with-object', 'الجري بحمل أداة', 'running', 'supporting', 70),
  resource('one-hand-throw', 'الرمي بيد واحدة', 'response', 'core', 105),
  resource('two-hand-throw', 'الرمي باليدين معا', 'response', 'core', 100),
  resource('throwing-direction', 'الرمي إلى الأمام والخلف والجانب', 'response', 'core', 95),
  resource('throwing-distance', 'الرمي إلى مسافات مختلفة', 'response', 'supporting', 80),
  resource('throwing-control', 'الرمي إلى مكان أو علو معين', 'response', 'supporting', 75),
]);
export const GRADE_THREE_DOMAIN_TWO_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: tid('attention'), label: 'الانتباه للتوجيه' },
  { id: tid('safety'), label: 'أمن وسلامة الفوج ومجال الرمي' },
  { id: tid('rule-respect'), label: 'احترام القواعد' },
  { id: tid('space-awareness'), label: 'الوعي بفضاء الممارسة' },
]);
const C = { c1: cid(1), c2: cid(2), c3: cid(3) };
const R = (slug: string) => rid(slug);
const T = (slug: string) => tid(slug);
const stage = (
  progressionStage: ReferenceLearningObjective['progressionStage'],
  sequenceWeight: number
) => ({ progressionStage, sequenceWeight });
const make = (
  n: number,
  objectiveText: string,
  components: string[],
  resources: string[],
  transversals: string[],
  learningContent: string,
  mobilizedKnowledge: string,
  executionContent: string,
  guidance: string,
  tags: string[],
  progression: ReturnType<typeof stage>
): ReferenceLearningObjective => ({
  id: `G3-D2-OBJ-${String(n).padStart(2, '0')}`,
  gradeId: GRADE_THREE_DOMAIN_TWO_LEVEL_ID,
  domainId: DOMAIN_TWO_FIELD_ID,
  objectiveText,
  competencyComponentIds: components,
  curriculumResourceIds: resources,
  transversalResourceIds: transversals,
  learningContent,
  mobilizedKnowledge,
  executionContent,
  guidance,
  tags,
  sourceReferences: ['EPS-2023:grade-3:domain-2', 'annual-plan-reference:lvl_p3:f_fundamentals'],
  ...progression,
});

export const GRADE_THREE_DOMAIN_TWO_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    make(
      1,
      'يجري بوتيرة بطيئة ومتوسطة وسريعة مع التحكم في أدائه.',
      [C.c1, C.c2],
      [R('running-rhythm')],
      [T('attention'), T('safety')],
      'وتائر الجري.',
      'الفرق بين الوتائر والتحكم في الأداء.',
      'يغير وتيرة الجري تدريجيا ويحافظ على سلامته.',
      'اختيار الوتيرة المناسبة وعدم مجاراة الآخرين.',
      ['وتيرة', 'جري'],
      stage('foundation', 10)
    ),
    make(
      2,
      'يجري على خط مستقيم مع تنسيق عمل أطرافه.',
      [C.c1, C.c2],
      [R('straight-running')],
      [T('attention'), T('space-awareness')],
      'الجري المستقيم.',
      'المسار المستقيم وتكامل الأطراف.',
      'يحافظ على المسار وينسق حركة الذراعين والرجلين.',
      'احترام المسار والمسافة بين الزملاء.',
      ['مستقيم', 'تنسيق'],
      stage('foundation', 20)
    ),
    make(
      3,
      'يجري في منعرج مع المحافظة على مساره.',
      [C.c1, C.c2],
      [R('curved-running')],
      [T('space-awareness'), T('safety')],
      'الجري في منعرج.',
      'تكييف الجسم مع المسار المنعرج.',
      'يتبع المنعرج دون الخروج عن المجال.',
      'التحكم في الوتيرة داخل المنعرج.',
      ['منعرج', 'مسار'],
      stage('path-circular', 30)
    ),
    make(
      4,
      'يجري في مسار متعرج مع التحكم في اتجاهه.',
      [C.c1, C.c2],
      [R('zigzag-running')],
      [T('space-awareness'), T('attention')],
      'الجري المتعرج.',
      'تغيير الاتجاه داخل المسار.',
      'ينتقل بين علامات المسار المتعرج بانتظام.',
      'وضوح المسار وتجنب الاصطدام.',
      ['متعرج', 'اتجاه'],
      stage('path-zigzag', 40)
    ),
    make(
      5,
      'يجري بحمل أداة مع المحافظة على تحكمه في المسار.',
      [C.c2, C.c3],
      [R('running-with-object'), R('straight-running')],
      [T('safety'), T('space-awareness')],
      'الجري بحمل أداة.',
      'تنظيم حمل الأداة والمحافظة على المسار.',
      'يجري بالأداة دون إسقاطها أو إرباك المجال.',
      'حمل الأداة بأمان واحترام المسافة.',
      ['أداة', 'جري'],
      stage('transition', 50)
    ),
    make(
      6,
      'يرمي بيد واحدة من وضعية ثابتة مع التحكم في التنفيذ.',
      [C.c1, C.c2],
      [R('one-hand-throw')],
      [T('safety'), T('attention')],
      'الرمي بيد واحدة.',
      'وضعية الثبات واتجاه الرمي.',
      'ينفذ الرمي بيد واحدة في مجال آمن.',
      'التأكد من خلو مجال الرمي قبل التنفيذ.',
      ['رمي', 'يد واحدة'],
      stage('foundation', 60)
    ),
    make(
      7,
      'يرمي باليدين معا من وضعية ثابتة بتحكم في الحركة.',
      [C.c1, C.c2],
      [R('two-hand-throw')],
      [T('safety'), T('attention')],
      'الرمي باليدين.',
      'تنسيق اليدين والجسم أثناء الرمي.',
      'ينفذ الرمي باليدين معا دون فقدان التحكم.',
      'احترام مجال الرمي وتسلسل التوجيه.',
      ['رمي', 'اليدان'],
      stage('foundation', 70)
    ),
    make(
      8,
      'يرمي في الاتجاه الأمامي أو الخلفي أو الجانبي حسب الوضعية.',
      [C.c1, C.c2],
      [R('throwing-direction'), R('one-hand-throw'), R('two-hand-throw')],
      [T('space-awareness'), T('safety')],
      'اتجاهات الرمي.',
      'اختيار اتجاه الرمي وتنظيم الجسم.',
      'يغير اتجاه الرمي حسب الوضعية المطلوبة.',
      'تحديد الاتجاه قبل التنفيذ وحماية الزملاء.',
      ['اتجاه', 'رمي'],
      stage('adaptation', 80)
    ),
    make(
      9,
      'يرمي إلى مسافة مختلفة مع المحافظة على سلامة التنفيذ.',
      [C.c2, C.c3],
      [R('throwing-distance'), R('throwing-control')],
      [T('safety'), T('space-awareness')],
      'الرمي إلى مسافات مختلفة.',
      'تكييف الرمي مع المسافة والمجال.',
      'ينفذ الرمي إلى المسافة النوعية المطلوبة دون قياس كمي مفروض.',
      'عدم تجاوز المجال واحترام ترتيب الرمي.',
      ['مسافة', 'تحكم'],
      stage('adaptation', 90)
    ),
    make(
      10,
      'يرمي أداة إلى مكان أو علو معين داخل المجال المحدد.',
      [C.c2, C.c3],
      [R('throwing-control'), R('throwing-direction')],
      [T('attention'), T('safety')],
      'الرمي إلى مكان أو علو معين.',
      'تنظيم اتجاه الرمي ومجاله.',
      'يوجه الأداة نحو المكان أو العلو المحدد.',
      'تأمين المجال قبل استرجاع الأدوات.',
      ['مكان', 'علو'],
      stage('adaptation', 100)
    ),
  ]);
