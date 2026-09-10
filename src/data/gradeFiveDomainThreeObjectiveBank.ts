import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_THREE_FIELD_ID } from './domainThreeLearningSectionReference';

export const GRADE_FIVE_DOMAIN_THREE_BANK_ID = 'objective-bank:lvl_p5:f_structuring:v1' as const;
const resourceId = (slug: string) => `curriculum-resource:lvl_p5:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:lvl_p5:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:lvl_p5:${DOMAIN_THREE_FIELD_ID}:component:${index}`;
const resource = (slug: string, label: string, weight: number): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p5:${DOMAIN_THREE_FIELD_ID}:1`,
  family: 'organization',
  priority: 'core',
  selectionWeight: weight,
});

export const GRADE_FIVE_DOMAIN_THREE_RESOURCES = deepFreeze([
  resource('game-concepts', 'مفاهيم اللعبة', 110),
  resource('game-rules', 'قواعد اللعبة', 110),
  resource('organized-positioning', 'التوزيع المنظم على الملعب', 105),
  resource('collective-play', 'اللعب الجماعي', 105),
  resource('basic-attack-defense-principles', 'المبادئ الأولية للهجوم والدفاع', 100),
]);
export const GRADE_FIVE_DOMAIN_THREE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('communication'), label: 'التواصل والانسجام' },
  { id: transversalId('respect'), label: 'احترام القواعد والآخرين' },
  { id: transversalId('fair-play'), label: 'اللعب النزيه' },
  { id: transversalId('safety'), label: 'السلامة' },
]);
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);
const C = (index: number) => componentId(index);
const makeObjective = (
  index: number,
  text: string,
  resources: string[],
  learning: string,
  knowledge: string,
  execution: string,
  guidance: string,
  stage: ReferenceLearningObjective['progressionStage'],
  weight: number,
  component: number,
  transversal: string
): ReferenceLearningObjective => ({
  id: `G5-D3-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: 'lvl_p5',
  domainId: DOMAIN_THREE_FIELD_ID,
  objectiveText: text,
  competencyComponentIds: [C(component)],
  curriculumResourceIds: resources,
  transversalResourceIds: [T(transversal)],
  learningContent: learning,
  mobilizedKnowledge: knowledge,
  executionContent: execution,
  guidance,
  sourceReferences: ['EPS-2023:grade-5:domain-3', 'annual-plan-reference:lvl_p5:f_structuring'],
  tags: ['هيكلة', 'لعب جماعي', 'تنظيم'],
  progressionStage: stage,
  sequenceWeight: weight,
});

export const GRADE_FIVE_DOMAIN_THREE_OBJECTIVE_BANK = deepFreeze([
  makeObjective(
    1,
    'يطبق المفاهيم والقواعد الأساسية أثناء لعبة جماعية مبسطة.',
    [R('game-concepts'), R('game-rules')],
    'مفاهيم اللعبة وقواعدها.',
    'الملعب وأطواله وقواعد اللعبة والأخطاء.',
    'يطبق قاعدة أساسية ويضبط تدخله داخل الملعب أثناء اللعب.',
    'الانتباه للتعليمات واحترام القواعد.',
    'foundation',
    10,
    1,
    'respect'
  ),
  makeObjective(
    2,
    'يتموضع بصورة منظمة داخل الملعب حسب سير اللعب.',
    [R('organized-positioning')],
    'التوزيع المنظم على الملعب.',
    'الملعب والتوزيع المنظم ومواقع الزملاء.',
    'يختار تموضعاً مناسباً ويحافظ على تنظيمه أثناء اللعب.',
    'مراعاة مساحة الزملاء واحترام حدود اللعب.',
    'organization',
    20,
    2,
    'attention'
  ),
  makeObjective(
    3,
    'ينسق أداءه مع زملائه للمحافظة على اللعب الجماعي.',
    [R('collective-play')],
    'اللعب الجماعي المنظم.',
    'الانسجام والتواصل وتوزيع التدخلات.',
    'يشارك في استمرار اللعب الجماعي من خلال تدخل منظم مع الزملاء.',
    'التواصل والانسجام واللعب النزيه.',
    'organization',
    30,
    2,
    'communication'
  ),
  makeObjective(
    4,
    'يوظف مبدأ هجومياً أولياً في وضعية لعب مبسطة.',
    [R('basic-attack-defense-principles'), R('collective-play')],
    'المبادئ الأولية للهجوم.',
    'التوزيع المنظم ومبدأ الهجوم الأولي.',
    'يختار تموضعاً أو تدخلاً جماعياً بسيطاً للمحافظة على التقدم في اللعب.',
    'احترام القواعد وتجنب إعاقة الآخرين.',
    'adaptation',
    40,
    2,
    'respect'
  ),
  makeObjective(
    5,
    'يوظف مبدأ دفاعياً أولياً في وضعية لعب مبسطة.',
    [R('basic-attack-defense-principles'), R('organized-positioning')],
    'المبادئ الأولية للدفاع.',
    'التموضع المنظم ومبدأ الدفاع الأولي.',
    'يختار تموضعاً جماعياً بسيطاً للحد من تقدم المنافس وفق القواعد.',
    'السلامة واحترام المنافس واللعب النزيه.',
    'adaptation',
    50,
    3,
    'fair-play'
  ),
]);
