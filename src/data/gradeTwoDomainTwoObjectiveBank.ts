import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_TWO_FIELD_ID } from './domainTwoLearningSectionReference';

export const GRADE_TWO_DOMAIN_TWO_LEVEL_ID = 'lvl_p2' as const;
export const GRADE_TWO_DOMAIN_TWO_BANK_ID = 'objective-bank:lvl_p2:f_fundamentals:v1' as const;
const rid = (s: string) => `curriculum-resource:lvl_p2:${DOMAIN_TWO_FIELD_ID}:${s}`;
const tid = (s: string) => `transversal-resource:lvl_p2:${DOMAIN_TWO_FIELD_ID}:${s}`;
const cid = (n: number) => `learning-section:lvl_p2:${DOMAIN_TWO_FIELD_ID}:component:${n}`;
const resource = (
  slug: string,
  label: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  weight: number
): ObjectiveBankResource => ({
  id: rid(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p2:${DOMAIN_TWO_FIELD_ID}:${family}`,
  family,
  priority,
  selectionWeight: weight,
});

export const GRADE_TWO_DOMAIN_TWO_RESOURCES = deepFreeze([
  resource('natural-position-execution', 'تنفيذ الحركة من وضعيات طبيعية', 'posture', 'core', 100),
  resource('limb-integration', 'تكامل عمل الأطراف', 'support-balance', 'core', 105),
  resource('coordinated-steps', 'خطوات متناسقة', 'walking', 'core', 100),
  resource('elevated-steps', 'خطوات مرتفعة', 'walking', 'supporting', 80),
  resource('speed-maintenance', 'المحافظة على السرعة', 'speed-control', 'core', 105),
  resource('kneeling-execution', 'التنفيذ من الجثو', 'posture', 'supporting', 75),
  resource('sitting-execution', 'التنفيذ من الجلوس', 'posture', 'supporting', 75),
  resource('extended-execution', 'التنفيذ من التمدد', 'posture', 'supporting', 70),
]);
export const GRADE_TWO_DOMAIN_TWO_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: tid('attention'), label: 'الانتباه للتوجيه' },
  { id: tid('safety'), label: 'سلامة التنفيذ' },
  { id: tid('rule-respect'), label: 'احترام القواعد والوتيرة' },
  { id: tid('cooperation'), label: 'التنسيق مع الزملاء' },
]);
const C = { c1: cid(1), c2: cid(2), c3: cid(3) };
const R = (s: string) => rid(s);
const T = (s: string) => tid(s);
const stage = (
  progressionStage: ReferenceLearningObjective['progressionStage'],
  sequenceWeight: number
) => ({ progressionStage, sequenceWeight });
const make = (
  n: number,
  text: string,
  components: string[],
  resources: string[],
  transversals: string[],
  learningContent: string,
  knowledge: string,
  execution: string,
  guidance: string,
  tags: string[],
  progression: ReturnType<typeof stage>
): ReferenceLearningObjective => ({
  id: `G2-D2-OBJ-${String(n).padStart(2, '0')}`,
  gradeId: GRADE_TWO_DOMAIN_TWO_LEVEL_ID,
  domainId: DOMAIN_TWO_FIELD_ID,
  objectiveText: text,
  competencyComponentIds: components,
  curriculumResourceIds: resources,
  transversalResourceIds: transversals,
  learningContent,
  mobilizedKnowledge: knowledge,
  executionContent: execution,
  guidance,
  tags,
  sourceReferences: ['EPS-2023:grade-2:domain-2', 'annual-plan-reference:lvl_p2:f_fundamentals'],
  ...progression,
});
export const GRADE_TWO_DOMAIN_TWO_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    make(
      1,
      'ينفذ الحركة القاعدية من وضعية الوقوف بتكامل أطرافه.',
      [C.c1, C.c2],
      [R('natural-position-execution'), R('limb-integration')],
      [T('attention'), T('safety')],
      'الحركة من الوقوف.',
      'وضعية الجسم وتكامل الأطراف.',
      'ينفذ الحركة ويحافظ على تنسيق أطرافه.',
      'احترام الوضعية والمجال.',
      ['وقوف', 'تنسيق'],
      stage('foundation', 10)
    ),
    make(
      2,
      'ينفذ الحركة القاعدية من وضعية الجثو بتكامل أطرافه.',
      [C.c1, C.c2],
      [R('kneeling-execution'), R('limb-integration')],
      [T('attention'), T('safety')],
      'الحركة من الجثو.',
      'الارتكاز وتكامل الأطراف.',
      'ينفذ الحركة من الجثو دون فقدان التحكم.',
      'السلامة أثناء الارتكاز.',
      ['جثو', 'تنسيق'],
      stage('foundation', 20)
    ),
    make(
      3,
      'ينفذ الحركة القاعدية من وضعية الجلوس بتكامل أطرافه.',
      [C.c1, C.c2],
      [R('sitting-execution'), R('limb-integration')],
      [T('attention'), T('safety')],
      'الحركة من الجلوس.',
      'تنظيم الجذع والأطراف.',
      'ينفذ الحركة من الجلوس بتناسق.',
      'احترام المجال والتوجيه.',
      ['جلوس', 'تنسيق'],
      stage('foundation', 30)
    ),
    make(
      4,
      'ينفذ الحركة القاعدية من وضعية التمدد مع التحكم في جسمه.',
      [C.c1, C.c2],
      [R('extended-execution'), R('limb-integration')],
      [T('attention'), T('safety')],
      'الحركة من التمدد.',
      'التحكم في الجسم عند الانطلاق.',
      'ينفذ الحركة ويحافظ على التحكم.',
      'التدرج وعدم المجازفة.',
      ['تمدد', 'تحكم'],
      stage('balance', 40)
    ),
    make(
      5,
      'يمشي بخطوات متناسقة مع تكامل عمل أطرافه.',
      [C.c1, C.c2],
      [R('coordinated-steps'), R('limb-integration')],
      [T('rule-respect'), T('cooperation')],
      'الخطوات المتناسقة.',
      'تتابع القدمين والذراعين.',
      'يمشي بتناسق ويحافظ على الوتيرة.',
      'احترام المسار والزملاء.',
      ['مشي', 'خطوات'],
      stage('locomotion-basic', 50)
    ),
    make(
      6,
      'ينفذ خطوات مرتفعة مع المحافظة على توازن جسمه.',
      [C.c1, C.c2],
      [R('elevated-steps'), R('limb-integration')],
      [T('attention'), T('safety')],
      'الخطوات المرتفعة.',
      'رفع الركبتين وتوازن الجسم.',
      'ينفذ الخطوات دون فقدان التوازن.',
      'التحكم في الارتفاع والمجال.',
      ['خطوات', 'توازن'],
      stage('locomotion-basic', 60)
    ),
    make(
      7,
      'يحافظ على سرعة حركته أثناء تنفيذ الحركة القاعدية.',
      [C.c2, C.c3],
      [R('speed-maintenance')],
      [T('rule-respect'), T('self-regulation')],
      'المحافظة على السرعة.',
      'العلاقة بين السرعة والتحكم.',
      'يحافظ على الوتيرة المطلوبة.',
      'مراعاة الإمكانات الفردية.',
      ['سرعة', 'وتيرة'],
      stage('speed-control', 70)
    ),
    make(
      8,
      'ينسق بين خطواته وعمل أطرافه أثناء الحركة.',
      [C.c1, C.c2],
      [R('coordinated-steps'), R('limb-integration')],
      [T('cooperation'), T('rule-respect')],
      'تنسيق الخطوات والأطراف.',
      'التكامل بين الأطراف.',
      'ينفذ الحركة بانسجام.',
      'الاستجابة للتوجيه.',
      ['تنسيق', 'أطراف'],
      stage('transition', 80)
    ),
    make(
      9,
      'يغير وتيرة حركته مع المحافظة على تكامل أطرافه.',
      [C.c2, C.c3],
      [R('speed-maintenance'), R('limb-integration')],
      [T('attention'), T('self-regulation')],
      'تغيير الوتيرة.',
      'التدرج بين الوتائر.',
      'يغير سرعته ويحافظ على التحكم.',
      'التدرج واحترام المجال.',
      ['وتيرة', 'تكييف'],
      stage('adaptation', 90)
    ),
    make(
      10,
      'يربط بين حركة قاعدية وخطوات متناسقة في تنفيذ منظم.',
      [C.c2, C.c3],
      [R('coordinated-steps'), R('speed-maintenance')],
      [T('cooperation'), T('safety')],
      'ربط الحركة والخطوات.',
      'تتابع الحركة والوتيرة.',
      'ينجز التسلسل دون انقطاع.',
      'احترام ترتيب التنفيذ.',
      ['ربط', 'تنظيم'],
      stage('adaptation', 100)
    ),
  ]);
