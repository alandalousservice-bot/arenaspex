import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_THREE_FIELD_ID } from './domainThreeLearningSectionReference';

export const GRADE_ONE_DOMAIN_THREE_LEVEL_ID = 'lvl_p1' as const;
export const GRADE_ONE_DOMAIN_THREE_BANK_ID = 'objective-bank:lvl_p1:f_structuring:v1' as const;

const resourceId = (slug: string) => `curriculum-resource:lvl_p1:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:lvl_p1:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:lvl_p1:${DOMAIN_THREE_FIELD_ID}:component:${index}`;

const resource = (slug: string, label: string, selectionWeight: number): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p1:${DOMAIN_THREE_FIELD_ID}:1`,
  family: 'organization',
  priority: 'core',
  selectionWeight,
});

export const GRADE_ONE_DOMAIN_THREE_RESOURCES = deepFreeze([
  resource('practice-space', 'فضاء الممارسة', 110),
  resource('space-boundaries', 'حدود فضاء الممارسة', 105),
  resource('space-landmarks', 'معالم فضاء الممارسة', 105),
  resource('space-sharing', 'مشاركة فضاء الممارسة', 100),
  resource('formations', 'التشكيلات والتنقلات المنتظمة', 110),
  resource('rows-and-counts', 'الأعداد والصفوف', 100),
  resource('peers', 'الأقران', 90),
]);

export const GRADE_ONE_DOMAIN_THREE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('space-awareness'), label: 'اكتشاف طبيعة فضاء الممارسة وإدراك أهمية ضبطه' },
  { id: transversalId('formation-integration'), label: 'الاندماج في التشكيلات والتنقلات المنتظمة' },
  { id: transversalId('peer-interaction'), label: 'التفاعل مع الأقران ومشاركة فضاءات الممارسة' },
]);

const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);
const C = (index: number) => componentId(index);

const makeObjective = (
  index: number,
  objectiveText: string,
  resources: string[],
  content: string,
  knowledge: string,
  execution: string,
  guidance: string,
  stage: ReferenceLearningObjective['progressionStage'],
  weight: number
): ReferenceLearningObjective => ({
  id: `G1-D3-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: 'lvl_p1',
  domainId: DOMAIN_THREE_FIELD_ID,
  objectiveText,
  competencyComponentIds: [C(index <= 2 ? 1 : index <= 4 ? 2 : 3)],
  curriculumResourceIds: resources,
  transversalResourceIds: [
    T(index <= 2 ? 'space-awareness' : index <= 4 ? 'formation-integration' : 'peer-interaction'),
  ],
  learningContent: content,
  mobilizedKnowledge: knowledge,
  executionContent: execution,
  guidance,
  sourceReferences: ['EPS-2023:grade-1:domain-3', 'annual-plan-reference:lvl_p1:f_structuring'],
  tags: ['هيكلة', 'فضاء', 'تنظيم'],
  progressionStage: stage,
  sequenceWeight: weight,
});

export const GRADE_ONE_DOMAIN_THREE_OBJECTIVE_BANK = deepFreeze([
  makeObjective(
    1,
    'يتعرف على فضاء الممارسة ومعالمه الأساسية.',
    [R('practice-space'), R('space-boundaries')],
    'فضاء الممارسة ومعالمه.',
    'الفناء والساحة والملعب والرواق وحدود الميدان.',
    'يميز الفضاء وحدوده قبل النشاط.',
    'الانتباه إلى المعالم وعدم تجاوزها.',
    'foundation',
    10
  ),
  makeObjective(
    2,
    'يتنقل داخل فضاء محدد مع احترام حدوده.',
    [R('space-boundaries'), R('space-landmarks'), R('space-sharing')],
    'التنقل في فضاء محدد.',
    'الحدود ومشاركة فضاء الممارسة.',
    'يتنقل بانتظام داخل المجال المتاح.',
    'ترك مسافة مناسبة عن الأقران.',
    'foundation',
    20
  ),
  makeObjective(
    3,
    'ينتظم في صف وفق العدد والتوجيه.',
    [R('formations'), R('rows-and-counts')],
    'الأعداد والصفوف.',
    'التشكيل والانتظام في الصف.',
    'يلتحق بمكانه ويحافظ على ترتيب الصف.',
    'اتباع الإشارة واحترام الترتيب.',
    'organization',
    30
  ),
  makeObjective(
    4,
    'يندمج في تشكيل جماعي ويتنقل بانتظام.',
    [R('formations'), R('peers')],
    'التشكيلات والتنقلات المنتظمة.',
    'التنقل المنتظم ومشاركة الفضاء.',
    'يتحرك مع التشكيل ويحافظ على انتظامه.',
    'مراعاة حركة الأقران ومعالم المجال.',
    'organization',
    40
  ),
  makeObjective(
    5,
    'يشارك الأقران فضاء الممارسة بطريقة منظمة.',
    [R('space-sharing'), R('peers')],
    'مشاركة فضاء الممارسة.',
    'مشاركة الفضاء واحترام مجال الأقران.',
    'يستعمل المكان المناسب دون إعاقة الآخرين.',
    'المحافظة على تنظيم الفضاء.',
    'adaptation',
    50
  ),
  makeObjective(
    6,
    'يحافظ على تنظيم فضاء الممارسة أثناء النشاط.',
    [R('practice-space'), R('space-boundaries'), R('space-landmarks'), R('formations')],
    'المحافظة على فضاء الممارسة.',
    'المعالم والتشكيلات والتنقل المنتظم.',
    'يحافظ على مكانه وانتظام المجموعة.',
    'احترام القواعد والمعالم حتى نهاية النشاط.',
    'adaptation',
    60
  ),
]);
