import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_TWO_FIELD_ID } from './domainTwoLearningSectionReference';

export const GRADE_FOUR_DOMAIN_TWO_LEVEL_ID = 'lvl_p4' as const;
export const GRADE_FOUR_DOMAIN_TWO_BANK_ID = 'objective-bank:lvl_p4:f_fundamentals:v1' as const;
const rid = (slug: string) => `curriculum-resource:lvl_p4:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const tid = (slug: string) => `transversal-resource:lvl_p4:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const cid = (n: number) => `learning-section:lvl_p4:${DOMAIN_TWO_FIELD_ID}:component:${n}`;
const resource = (
  slug: string,
  label: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: rid(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p4:${DOMAIN_TWO_FIELD_ID}:${family}`,
  family,
  priority,
  selectionWeight,
});

export const GRADE_FOUR_DOMAIN_TWO_RESOURCES = deepFreeze([
  resource('single-leg-jump', 'الوثب برجل واحدة', 'posture', 'core', 105),
  resource('two-leg-jump', 'الوثب بالرجلين', 'posture', 'core', 100),
  resource('repeated-jumps', 'الوثبات المتتالية', 'transition', 'core', 95),
  resource('stationary-throw', 'الرمي من الثبات', 'response', 'core', 105),
  resource('moving-throw', 'الرمي من الحركة', 'response', 'core', 90),
  resource('gymnastics-basic', 'الحركات القاعدية للجمباز', 'organization', 'core', 100),
  resource('balance', 'حركات التوازن', 'balance-support', 'core', 95),
  resource('rotation', 'حركات الدوران', 'transition', 'core', 85),
  resource('rolling', 'التدحرج', 'transition', 'core', 90),
  resource('safe-fall', 'السقوط الآمن', 'support-balance', 'supporting', 80),
  resource('jump-throw-link', 'الربط بين الوثب والرمي', 'transition', 'supporting', 70),
  resource('movement-space', 'فضاء الممارسة وضوابطه', 'organization', 'supporting', 75),
]);
export const GRADE_FOUR_DOMAIN_TWO_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: tid('safety'), label: 'السلامة والسقوط الآمن' },
  { id: tid('attention'), label: 'الانتباه للتوجيه' },
  { id: tid('ethics'), label: 'أخلاقيات الممارسة واللعب النزيه' },
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
  id: `G4-D2-OBJ-${String(n).padStart(2, '0')}`,
  gradeId: GRADE_FOUR_DOMAIN_TWO_LEVEL_ID,
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
  sourceReferences: ['EPS-2023:grade-4:domain-2', 'annual-plan-reference:lvl_p4:f_fundamentals'],
  ...progression,
});

export const GRADE_FOUR_DOMAIN_TWO_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    make(
      1,
      'ينفذ الوثب برجل واحدة مع التحكم في الارتقاء والهبوط.',
      [C.c1, C.c2],
      [R('single-leg-jump')],
      [T('safety'), T('attention')],
      'الوثب برجل واحدة.',
      'الارتقاء والهبوط والتحكم في الجسم.',
      'ينفذ الوثب ويحافظ على توازنه عند الهبوط.',
      'تهيئة المجال واحترام سلامة الهبوط.',
      ['وثب', 'رجل واحدة'],
      stage('foundation', 10)
    ),
    make(
      2,
      'ينفذ الوثب بالرجلين مع المحافظة على توازن جسمه.',
      [C.c1, C.c2],
      [R('two-leg-jump')],
      [T('safety'), T('attention')],
      'الوثب بالرجلين.',
      'الارتقاء والهبوط بالرجلين.',
      'ينفذ الوثب بالرجلين دون فقدان التوازن.',
      'الهبوط الآمن والمحافظة على المجال.',
      ['وثب', 'رجلان'],
      stage('foundation', 20)
    ),
    make(
      3,
      'ينجز وثبات متتالية مع التحكم في تسلسل الأداء.',
      [C.c1, C.c2],
      [R('repeated-jumps')],
      [T('safety'), T('self-regulation')],
      'الوثبات المتتالية.',
      'تتابع الارتقاء والهبوط.',
      'يحافظ على تسلسل الوثبات دون انقطاع.',
      'التدرج واحترام الإمكانات الفردية.',
      ['وثبات', 'تسلسل'],
      stage('transition', 30)
    ),
    make(
      4,
      'يرمي من الثبات مع التحكم في اتجاه الحركة.',
      [C.c1, C.c2],
      [R('stationary-throw')],
      [T('safety'), T('attention')],
      'الرمي من الثبات.',
      'تنظيم الجسم واتجاه الرمي.',
      'ينفذ الرمي من الثبات داخل المجال الآمن.',
      'تأمين المجال قبل التنفيذ.',
      ['رمي', 'ثبات'],
      stage('foundation', 40)
    ),
    make(
      5,
      'يرمي من الحركة مع المحافظة على التحكم في الأداء.',
      [C.c2, C.c3],
      [R('moving-throw')],
      [T('safety'), T('space-awareness')],
      'الرمي من الحركة.',
      'الانتقال من الحركة إلى الرمي.',
      'ينفذ الرمي أثناء الحركة دون إرباك المجال.',
      'اختيار مسار آمن وتجنب الاصطدام.',
      ['رمي', 'حركة'],
      stage('transition', 50)
    ),
    make(
      6,
      'ينفذ حركة قاعدية بسيطة من حركات الجمباز بتحكم في جسمه.',
      [C.c1, C.c2],
      [R('gymnastics-basic')],
      [T('safety'), T('attention')],
      'الحركات القاعدية للجمباز.',
      'دعم الجسم وتنظيم الحركة.',
      'ينفذ الحركة القاعدية وفق التوجيه.',
      'استعمال المجال والوسيلة بأمان.',
      ['جمباز', 'تحكم'],
      stage('foundation', 60)
    ),
    make(
      7,
      'يحافظ على توازن جسمه في وضعية توازن بسيطة.',
      [C.c2, C.c3],
      [R('balance')],
      [T('attention'), T('self-regulation')],
      'التوازن.',
      'توزيع الثقل والتحكم في الجسم.',
      'يثبت وضعية التوازن ويحافظ عليها.',
      'التدرج وعدم المجازفة.',
      ['توازن'],
      stage('balance', 70)
    ),
    make(
      8,
      'ينفذ حركة دوران بسيطة مع التحكم في اتجاه جسمه.',
      [C.c1, C.c2],
      [R('rotation')],
      [T('safety'), T('space-awareness')],
      'الدوران.',
      'اتجاه الجسم أثناء الدوران.',
      'ينفذ الدوران داخل المجال المحدد.',
      'تأمين المجال والعودة إلى وضعية مستقرة.',
      ['دوران'],
      stage('transition', 80)
    ),
    make(
      9,
      'ينفذ تدحرجا بسيطا مع احترام مراحل الحركة.',
      [C.c1, C.c2],
      [R('rolling')],
      [T('safety'), T('attention')],
      'التدحرج.',
      'تتابع مراحل التدحرج وحماية الجسم.',
      'ينفذ التدحرج على سطح مناسب وبشكل متسلسل.',
      'استعمال البساط والسقوط الآمن.',
      ['تدحرج'],
      stage('transition', 90)
    ),
    make(
      10,
      'ينفذ سقوطا آمنا بعد حركة قاعدية بسيطة.',
      [C.c2, C.c3],
      [R('safe-fall')],
      [T('safety'), T('self-regulation')],
      'السقوط الآمن.',
      'حماية الجسم عند فقدان التوازن.',
      'ينزل إلى الأرض بطريقة آمنة ومتحكم فيها.',
      'عدم المجازفة واحترام التوجيه.',
      ['سقوط', 'سلامة'],
      stage('balance', 100)
    ),
    make(
      11,
      'يربط الوثب بالهبوط في أداء حركي منظم.',
      [C.c2, C.c3],
      [R('single-leg-jump'), R('two-leg-jump')],
      [T('safety'), T('space-awareness')],
      'الربط بين الوثب والهبوط.',
      'تتابع الارتقاء والهبوط.',
      'ينجز الوثب وينهيه بهبوط متحكم فيه.',
      'اختيار مساحة آمنة للهبوط.',
      ['وثب', 'ربط'],
      stage('adaptation', 110)
    ),
    make(
      12,
      'ينظم حركة قاعدية داخل فضاء ممارسة محدد.',
      [C.c1, C.c3],
      [R('movement-space'), R('gymnastics-basic')],
      [T('space-awareness'), T('ethics')],
      'ضبط الحركة في الفضاء.',
      'حدود المجال وضوابط الممارسة.',
      'ينفذ الحركة دون تجاوز المجال أو إعاقة الآخرين.',
      'احترام الأدوار وأخلاقيات الممارسة.',
      ['فضاء', 'تنظيم'],
      stage('organization', 120)
    ),
  ]);
