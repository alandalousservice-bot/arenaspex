import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_THREE_FIELD_ID } from './domainThreeLearningSectionReference';

export const GRADE_FOUR_DOMAIN_THREE_BANK_ID = 'objective-bank:lvl_p4:f_structuring:v1' as const;
const resourceId = (slug: string) => `curriculum-resource:lvl_p4:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:lvl_p4:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:lvl_p4:${DOMAIN_THREE_FIELD_ID}:component:${index}`;
const resource = (slug: string, label: string, weight: number): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p4:${DOMAIN_THREE_FIELD_ID}:1`,
  family: 'organization',
  priority: 'core',
  selectionWeight: weight,
});

export const GRADE_FOUR_DOMAIN_THREE_RESOURCES = deepFreeze([
  resource('movement-space-organization', 'تنظيم التنقل وفق الفضاء المتاح', 110),
  resource('peer-opponent-distribution', 'انتشار الزملاء والمنافسين', 105),
  resource('throwing-space-regulation', 'ضبط فضاء الرمي', 100),
  resource('jumping-space-regulation', 'ضبط فضاء الوثب', 100),
  resource('practice-space-constraints', 'ضوابط الممارسة في الفضاء المتاح', 95),
]);
export const GRADE_FOUR_DOMAIN_THREE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('safety'), label: 'السلامة في الفضاء' },
  { id: transversalId('respect'), label: 'احترام الآخرين وضوابط الممارسة' },
  { id: transversalId('attention'), label: 'الانتباه للفضاء والانتشار' },
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
  id: `G4-D3-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: 'lvl_p4',
  domainId: DOMAIN_THREE_FIELD_ID,
  objectiveText: text,
  competencyComponentIds: [C(component)],
  curriculumResourceIds: resources,
  transversalResourceIds: [T(transversal)],
  learningContent: learning,
  mobilizedKnowledge: knowledge,
  executionContent: execution,
  guidance,
  sourceReferences: ['EPS-2023:grade-4:domain-3', 'annual-plan-reference:lvl_p4:f_structuring'],
  tags: ['هيكلة', 'فضاء', 'تنظيم'],
  progressionStage: stage,
  sequenceWeight: weight,
});

export const GRADE_FOUR_DOMAIN_THREE_OBJECTIVE_BANK = deepFreeze([
  makeObjective(
    1,
    'يختار فضاء الممارسة المناسب وفق درجة أمانه وانتشار الآخرين.',
    [R('practice-space-constraints'), R('peer-opponent-distribution')],
    'الفضاء الآمن وانتشار الزملاء والمنافسين.',
    'الفضاء المتاح ودرجة الأمان وانتشار الآخرين.',
    'يحدد مجالاً صالحاً للتدخل ويتنقل فيه دون إعاقة الآخرين.',
    'الانتباه للفضاء ومراعاة السلامة.',
    'foundation',
    10,
    3,
    'safety'
  ),
  makeObjective(
    2,
    'يلائم تنظيم تنقله مع انتشار الزملاء والمنافسين.',
    [R('movement-space-organization'), R('peer-opponent-distribution')],
    'تنظيم التنقل والانتشار.',
    'علاقة التنقل بالفضاء المتاح ومواقع الآخرين.',
    'يعدل مساره وانتشاره وفق الفضاء المتاح ومواقع الآخرين.',
    'احترام مساحات الآخرين وضوابط الممارسة.',
    'organization',
    20,
    1,
    'attention'
  ),
  makeObjective(
    3,
    'ينظم تنقله داخل الفضاء المتاح وفق متطلبات الوضعية.',
    [R('movement-space-organization')],
    'التنقل وفق الفضاء المتاح.',
    'حدود الفضاء ومعالمه ومتطلبات الوضعية.',
    'يوزع تدخله داخل المجال المناسب وينتقل دون إعاقة الآخرين.',
    'ضبط المسار واحترام الفضاء.',
    'organization',
    30,
    2,
    'attention'
  ),
  makeObjective(
    4,
    'يوظف الرمي داخل مجال ممارسة محدد وفق أبعاده وحدوده.',
    [R('throwing-space-regulation')],
    'الرمي بضبط فضاء الممارسة.',
    'المسافات والأبعاد والمجالات.',
    'ينظم موضعه واتجاه تدخله داخل مجال الرمي المحدد.',
    'لا يحول النشاط إلى قياس تقني للرمي.',
    'adaptation',
    40,
    2,
    'safety'
  ),
  makeObjective(
    5,
    'ينظم الوثب وفق مساره والفضاء المتاح.',
    [R('jumping-space-regulation')],
    'الوثب بضبط فضاء الممارسة.',
    'مسار الوثبة وهيئة الجسم والوثبات التبادلية كمعارف داعمة.',
    'ينظم انطلاقه ومسار وثبته داخل الفضاء المطلوب.',
    'مراعاة المجال المتاح وانتشار الآخرين.',
    'adaptation',
    50,
    2,
    'attention'
  ),
]);
