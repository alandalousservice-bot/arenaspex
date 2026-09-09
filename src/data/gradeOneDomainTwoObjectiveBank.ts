import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_TWO_FIELD_ID } from './domainTwoLearningSectionReference';

export const GRADE_ONE_DOMAIN_TWO_LEVEL_ID = 'lvl_p1' as const;
export const GRADE_ONE_DOMAIN_TWO_BANK_ID = 'objective-bank:lvl_p1:f_fundamentals:v1' as const;

const resourceId = (slug: string) =>
  `curriculum-resource:${GRADE_ONE_DOMAIN_TWO_LEVEL_ID}:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:${GRADE_ONE_DOMAIN_TWO_LEVEL_ID}:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:${GRADE_ONE_DOMAIN_TWO_LEVEL_ID}:${DOMAIN_TWO_FIELD_ID}:component:${index}`;

const resource = (
  slug: string,
  label: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p1:f_fundamentals:${family}`,
  family,
  priority,
  selectionWeight,
});

export const GRADE_ONE_DOMAIN_TWO_RESOURCES: readonly ObjectiveBankResource[] = deepFreeze([
  resource('walking-execution', 'تنفيذ المشي', 'walking', 'core', 100),
  resource('running-execution', 'تنفيذ الجري', 'running', 'core', 105),
  resource(
    'slow-medium-fast-rhythm',
    'الوتائر البطيئة والمتوسطة والسريعة',
    'speed-control',
    'core',
    105
  ),
  resource('walking-running-transition', 'التحول بين المشي والجري', 'transition', 'core', 100),
  resource('lateral-steps', 'الخطوات الجانبية', 'path-straight', 'supporting', 75),
  resource('backward-walking', 'المشي خلفاً', 'adaptation', 'supporting', 70),
]);

export const GRADE_ONE_DOMAIN_TWO_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('attention'), label: 'الانتباه والاستجابة للتوجيه' },
  { id: transversalId('rule-respect'), label: 'احترام القواعد والوتيرة' },
  { id: transversalId('safety'), label: 'السلامة في فضاء الممارسة' },
  { id: transversalId('cooperation'), label: 'التعاون مع الزملاء' },
]);

const C = {
  c1: componentId(1),
  c2: componentId(2),
  c3: componentId(3),
};
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);
const progression = (
  progressionStage: ReferenceLearningObjective['progressionStage'],
  sequenceWeight: number
) => ({ progressionStage, sequenceWeight });

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
  id: `G1-D2-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: GRADE_ONE_DOMAIN_TWO_LEVEL_ID,
  domainId: DOMAIN_TWO_FIELD_ID,
  objectiveText,
  competencyComponentIds,
  curriculumResourceIds,
  transversalResourceIds,
  learningContent,
  mobilizedKnowledge,
  executionContent,
  guidance,
  sourceReferences: ['EPS-2023:grade-1:domain-2', 'annual-plan-reference:lvl_p1:f_fundamentals'],
  tags,
  ...stage,
});

export const GRADE_ONE_DOMAIN_TWO_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze([
    makeObjective(
      1,
      'ينفذ المشي الفردي بتكامل وظائف جسمه.',
      [C.c1],
      [R('walking-execution')],
      [T('attention')],
      'المشي الفردي.',
      'تنسيق عمل الأطراف أثناء المشي.',
      'يمشي بتناسق ويحافظ على تنفيذ الحركة.',
      'الانتباه للمجال واحترام التوجيه.',
      ['مشي', 'تنفيذ'],
      progression('foundation', 10)
    ),
    makeObjective(
      2,
      'ينفذ الجري الفردي بتكامل وظائف جسمه.',
      [C.c1],
      [R('running-execution')],
      [T('attention'), T('safety')],
      'الجري الفردي.',
      'تكامل الأطراف أثناء الجري.',
      'يجري بتناسق ويحافظ على سلامة التنفيذ.',
      'احترام المجال وتفادي الاصطدام.',
      ['جري', 'تنسيق'],
      progression('foundation', 20)
    ),
    makeObjective(
      3,
      'ينفذ الحركة بوتيرة بطيئة أو متوسطة حسب التوجيه.',
      [C.c3],
      [R('slow-medium-fast-rhythm')],
      [T('attention'), T('rule-respect')],
      'الوتائر البطيئة والمتوسطة.',
      'الفرق بين الوتائر البطيئة والمتوسطة.',
      'ينفذ الحركة بالوتيرة المطلوبة.',
      'الاستجابة للإشارة دون تجاوز المجال.',
      ['وتيرة', 'تحكم'],
      progression('speed-control', 30)
    ),
    makeObjective(
      4,
      'ينفذ الجري بوتيرة سريعة مع المحافظة على تكامل الحركة.',
      [C.c1, C.c3],
      [R('running-execution'), R('slow-medium-fast-rhythm')],
      [T('rule-respect'), T('safety')],
      'الجري السريع.',
      'علاقة الوتيرة بتكامل الأطراف.',
      'يحافظ على الجري السريع دون فقدان التحكم.',
      'التدرج وعدم مجاوزة الإمكانات.',
      ['جري', 'وتيرة'],
      progression('speed-control', 40)
    ),
    makeObjective(
      5,
      'ينتقل من المشي إلى الجري تدريجيا وفق التوجيه.',
      [C.c2],
      [R('walking-running-transition')],
      [T('attention'), T('rule-respect')],
      'التحول من المشي إلى الجري.',
      'تدرج الحركة وتوقيت التحول.',
      'يبدأ الجري بعد المشي بسلاسة.',
      'الاستجابة للإشارة والمحافظة على المسافة.',
      ['تحول', 'مشي', 'جري'],
      progression('transition', 50)
    ),
    makeObjective(
      6,
      'ينتقل من الجري إلى المشي تدريجيا وفق التوجيه.',
      [C.c2],
      [R('walking-running-transition')],
      [T('attention'), T('safety')],
      'التحول من الجري إلى المشي.',
      'خفض الوتيرة تدريجيا.',
      'يخفض سرعته وينتقل إلى المشي دون توقف فوضوي.',
      'احترام المجال ومراعاة الزملاء.',
      ['تحول', 'خفض السرعة'],
      progression('transition', 60)
    ),
    makeObjective(
      7,
      'ينفذ خطوات جانبية متناسقة في المسار المحدد.',
      [C.c1, C.c2],
      [R('lateral-steps')],
      [T('safety'), T('cooperation')],
      'الخطوات الجانبية.',
      'تنسيق القدمين وتحديد المسار.',
      'يتحرك جانبيا مع المحافظة على التوازن.',
      'الانتباه للزملاء وحدود المسار.',
      ['خطوات جانبية'],
      progression('locomotion-basic', 70)
    ),
    makeObjective(
      8,
      'ينفذ المشي خلفا مع التحكم في حركته.',
      [C.c1, C.c2],
      [R('backward-walking')],
      [T('attention'), T('safety')],
      'المشي خلفا.',
      'التحكم في الاتجاه والمسافة.',
      'يمشي خلفا ببطء ويتوقف عند الإشارة.',
      'التأكد من خلو المجال واحترام السلامة.',
      ['مشي خلفي'],
      progression('adaptation', 80)
    ),
  ]);
