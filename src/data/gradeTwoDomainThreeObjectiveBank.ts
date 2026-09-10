import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_THREE_FIELD_ID } from './domainThreeLearningSectionReference';

export const GRADE_TWO_DOMAIN_THREE_BANK_ID = 'objective-bank:lvl_p2:f_structuring:v1' as const;
const resourceId = (slug: string) => `curriculum-resource:lvl_p2:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:lvl_p2:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:lvl_p2:${DOMAIN_THREE_FIELD_ID}:component:${index}`;
const resource = (
  slug: string,
  label: string,
  priority: ObjectiveBankResource['priority'],
  selectionWeight: number
): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p2:${DOMAIN_THREE_FIELD_ID}:1`,
  family: 'organization',
  priority,
  selectionWeight,
});

export const GRADE_TWO_DOMAIN_THREE_RESOURCES = deepFreeze([
  resource('equipment-use', 'الوسائل واستعمالها', 'core', 110),
  resource('appropriate-space', 'الفضاء المناسب لاستعمال الوسيلة', 'core', 105),
  resource('delivery-reception', 'التسليم والاستلام', 'core', 105),
  resource('tool-use-modes', 'استعمال الوسيلة في الرمي والدحرجة', 'core', 100),
  resource('equipment-preservation', 'حفظ الأدوات', 'core', 100),
]);
export const GRADE_TWO_DOMAIN_THREE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('attention'), label: 'الانتباه لضوابط استعمال الوسائل' },
  { id: transversalId('safety'), label: 'السلامة أثناء استعمال الوسائل' },
  { id: transversalId('communication'), label: 'التواصل مع الأقران أثناء التسليم والاستلام' },
]);
const R = (slug: string) => resourceId(slug);
const T = (slug: string) => transversalId(slug);
const makeObjective = (
  index: number,
  text: string,
  resources: string[],
  learning: string,
  knowledge: string,
  execution: string,
  guidance: string,
  stage: ReferenceLearningObjective['progressionStage'],
  weight: number
): ReferenceLearningObjective => ({
  id: `G2-D3-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: 'lvl_p2',
  domainId: DOMAIN_THREE_FIELD_ID,
  objectiveText: text,
  competencyComponentIds: [componentId(index === 1 ? 1 : index === 5 ? 3 : 2)],
  curriculumResourceIds: resources,
  transversalResourceIds: [T(index === 3 ? 'communication' : index === 5 ? 'safety' : 'attention')],
  learningContent: learning,
  mobilizedKnowledge: knowledge,
  executionContent: execution,
  guidance,
  sourceReferences: ['EPS-2023:grade-2:domain-3', 'annual-plan-reference:lvl_p2:f_structuring'],
  tags: ['هيكلة', 'وسائل', 'فضاء'],
  progressionStage: stage,
  sequenceWeight: weight,
});
export const GRADE_TWO_DOMAIN_THREE_OBJECTIVE_BANK = deepFreeze([
  makeObjective(
    1,
    'يتعرف على الوسائل ومجالات استعمالها.',
    [R('equipment-use')],
    'الوسائل ومجالات استعمالها.',
    'الكور والشواهد والأقماع والجلة.',
    'يميز الوسيلة المناسبة للموقف.',
    'احترام ضوابط الاستعمال.',
    'foundation',
    10
  ),
  makeObjective(
    2,
    'يختار الفضاء المناسب لاستعمال الوسيلة.',
    [R('appropriate-space')],
    'الفضاء المناسب لاستعمال الوسيلة.',
    'علاقة الوسيلة بالفضاء المتاح.',
    'يستعمل الوسيلة داخل المجال المناسب.',
    'مراعاة المجال وضوابط الممارسة.',
    'organization',
    20
  ),
  makeObjective(
    3,
    'ينجز التسليم والاستلام باستعمال الوسيلة.',
    [R('delivery-reception')],
    'التسليم والاستلام.',
    'أسلوب تنفيذ التسليم والاستلام.',
    'يسلم الوسيلة ويستلمها وفق التوجيه.',
    'التواصل والانتباه أثناء التبادل.',
    'organization',
    30
  ),
  makeObjective(
    4,
    'يوظف الوسيلة في وضعية استعمال مناسبة.',
    [R('tool-use-modes'), R('appropriate-space')],
    'استعمال الوسيلة في وضعية مناسبة.',
    'الرمي القريب والبعيد والجانبي والأمامي والخلفي والدحرجة كأمثلة استعمال.',
    'يستعمل الوسيلة بالطريقة الملائمة للموقف دون التركيز على تقنية الرمي.',
    'اختيار الوضعية والمجال المناسبين.',
    'adaptation',
    40
  ),
  makeObjective(
    5,
    'يحفظ الأدوات بعد استعمالها.',
    [R('equipment-preservation')],
    'حفظ الأدوات.',
    'الترتيب والتنظيف والتخزين.',
    'يرتب الوسائل وينظفها ويخزنها بعد النشاط.',
    'المحافظة على الوسائل واحترام التوجيه.',
    'adaptation',
    50
  ),
]);
