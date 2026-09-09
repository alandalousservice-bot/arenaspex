import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_TWO_FIELD_ID } from './domainTwoLearningSectionReference';

export const GRADE_FIVE_DOMAIN_TWO_LEVEL_ID = 'lvl_p5' as const;
export const GRADE_FIVE_DOMAIN_TWO_BANK_ID = 'objective-bank:lvl_p5:f_fundamentals:v1' as const;
const rid = (slug: string) => `curriculum-resource:lvl_p5:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const tid = (slug: string) => `transversal-resource:lvl_p5:${DOMAIN_TWO_FIELD_ID}:${slug}`;
const cid = (n: number) => `learning-section:lvl_p5:${DOMAIN_TWO_FIELD_ID}:component:${n}`;
const resource = (
  slug: string,
  label: string,
  family: ObjectiveBankResource['family'],
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: rid(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p5:${DOMAIN_TWO_FIELD_ID}:${family}`,
  family,
  priority,
  selectionWeight,
});
export const GRADE_FIVE_DOMAIN_TWO_RESOURCES = deepFreeze([
  resource('fast-running', 'الجري السريع وتواتر الخطوات', 'speed-control', 'core', 105),
  resource('running-coordination', 'تنسيق الأطراف أثناء الجري', 'support-balance', 'core', 100),
  resource('jump-takeoff', 'الارتقاء في الوثب', 'posture', 'core', 105),
  resource('jump-landing', 'الهبوط في الوثب', 'support-balance', 'core', 100),
  resource('jump-control', 'التحكم في مراحل الوثب', 'transition', 'core', 95),
  resource('throwing-phases', 'مراحل الرمي', 'response', 'core', 105),
  resource('throwing-direction-control', 'اتجاه الرمي والتحكم فيه', 'response', 'core', 100),
  resource('throwing-force', 'القوة المناسبة في الرمي', 'response', 'supporting', 75),
  resource('throwing-accuracy', 'الدقة في توجيه الرمي', 'response', 'supporting', 75),
  resource('gymnastics-basic', 'الحركات القاعدية للجمباز', 'organization', 'core', 100),
  resource('gymnastics-balance', 'التوازن في الجمباز', 'balance-support', 'core', 95),
  resource('gymnastics-rotation', 'الدوران في الجمباز', 'transition', 'core', 85),
  resource('gymnastics-rolling', 'التدحرج في الجمباز', 'transition', 'core', 90),
  resource('safe-fall', 'السقوط الآمن', 'support-balance', 'supporting', 80),
  resource('object-control', 'الإحساس بالأداة والتحكم فيها', 'response', 'supporting', 70),
]);
export const GRADE_FIVE_DOMAIN_TWO_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: tid('safety'), label: 'السلامة ومجال الممارسة' },
  { id: tid('attention'), label: 'الانتباه للتوجيه' },
  { id: tid('ethics'), label: 'أخلاقيات الممارسة' },
  { id: tid('self-regulation'), label: 'التنظيم الذاتي' },
]);
const C = { c1: cid(1), c2: cid(2), c3: cid(3) };
const R = (slug: string) => rid(slug);
const T = (slug: string) => tid(slug);
const stage = (
  progressionStage: ReferenceLearningObjective['progressionStage'],
  sequenceWeight: number
) => ({ progressionStage, sequenceWeight });
type Spec = [
  string,
  string[],
  string[],
  string[],
  ReferenceLearningObjective['progressionStage'],
  number,
];
const specs: Spec[] = [
  [
    'ينجز الجري السريع مع تواتر خطوات وتنسيق مناسبين.',
    [C.c1, C.c2],
    ['fast-running', 'running-coordination'],
    ['attention', 'safety'],
    'foundation',
    10,
  ],
  [
    'يحافظ على تواتر خطواته أثناء الجري السريع.',
    [C.c1, C.c2],
    ['fast-running'],
    ['attention', 'self-regulation'],
    'foundation',
    20,
  ],
  [
    'ينفذ الارتقاء في الوثب وفق الحركة المطلوبة.',
    [C.c1, C.c2],
    ['jump-takeoff'],
    ['attention', 'safety'],
    'foundation',
    30,
  ],
  [
    'ينفذ الهبوط في الوثب مع حماية جسمه.',
    [C.c2, C.c3],
    ['jump-landing', 'safe-fall'],
    ['safety', 'self-regulation'],
    'foundation',
    40,
  ],
  [
    'يتحكم في مراحل الوثب من الارتقاء إلى الهبوط.',
    [C.c1, C.c2],
    ['jump-control', 'jump-takeoff', 'jump-landing'],
    ['safety', 'attention'],
    'transition',
    50,
  ],
  [
    'ينفذ مراحل الرمي من وضعية مناسبة.',
    [C.c1, C.c2],
    ['throwing-phases'],
    ['attention', 'safety'],
    'foundation',
    60,
  ],
  [
    'يوجه الرمي مع التحكم في اتجاه الأداة.',
    [C.c2, C.c3],
    ['throwing-direction-control'],
    ['safety', 'attention'],
    'transition',
    70,
  ],
  [
    'يستعمل القوة المناسبة أثناء الرمي.',
    [C.c2, C.c3],
    ['throwing-force'],
    ['self-regulation', 'safety'],
    'transition',
    80,
  ],
  [
    'يحسن دقة توجيه الرمي داخل المجال المحدد.',
    [C.c2, C.c3],
    ['throwing-accuracy', 'throwing-direction-control'],
    ['attention', 'safety'],
    'adaptation',
    90,
  ],
  [
    'ينفذ حركة قاعدية من حركات الجمباز بتحكم.',
    [C.c1, C.c2],
    ['gymnastics-basic'],
    ['safety', 'attention'],
    'foundation',
    100,
  ],
  [
    'يحافظ على توازنه في حركة جمبازية بسيطة.',
    [C.c2, C.c3],
    ['gymnastics-balance'],
    ['safety', 'self-regulation'],
    'balance',
    110,
  ],
  [
    'ينفذ دورانا بسيطا مع التحكم في جسمه.',
    [C.c2, C.c3],
    ['gymnastics-rotation'],
    ['safety', 'attention'],
    'transition',
    120,
  ],
  [
    'ينفذ تدحرجا بسيطا وفق مراحل الحركة.',
    [C.c2, C.c3],
    ['gymnastics-rolling'],
    ['safety', 'attention'],
    'transition',
    130,
  ],
  [
    'يتحكم في الأداة أثناء تنفيذ حركة قاعدية.',
    [C.c2, C.c3],
    ['object-control'],
    ['attention', 'self-regulation'],
    'adaptation',
    140,
  ],
  [
    'ينظم أداءه الحركي داخل فضاء الممارسة.',
    [C.c1, C.c3],
    ['gymnastics-basic', 'object-control'],
    ['ethics', 'safety'],
    'organization',
    150,
  ],
];
const make = (n: number, spec: Spec): ReferenceLearningObjective => {
  const [text, components, resourceSlugs, transversalSlugs, progressionStage, sequenceWeight] =
    spec;
  return {
    id: `G5-D2-OBJ-${String(n).padStart(2, '0')}`,
    gradeId: GRADE_FIVE_DOMAIN_TWO_LEVEL_ID,
    domainId: DOMAIN_TWO_FIELD_ID,
    objectiveText: text,
    competencyComponentIds: components,
    curriculumResourceIds: resourceSlugs.map(R),
    transversalResourceIds: transversalSlugs.map(T),
    learningContent: text,
    mobilizedKnowledge: 'المعارف المرتبطة بتنفيذ الحركة القاعدية وضبطها.',
    executionContent: text,
    guidance: 'احترام المجال، التوجيه، والسلامة أثناء التنفيذ.',
    tags: resourceSlugs,
    sourceReferences: ['EPS-2023:grade-5:domain-2', 'annual-plan-reference:lvl_p5:f_fundamentals'],
    ...stage(progressionStage, sequenceWeight),
  };
};
export const GRADE_FIVE_DOMAIN_TWO_OBJECTIVE_BANK: readonly ReferenceLearningObjective[] =
  deepFreeze(specs.map((spec, index) => make(index + 1, spec)));
