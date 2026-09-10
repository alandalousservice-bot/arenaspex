import { deepFreeze } from '../domain/pedagogicalKnowledge/catalog';
import type {
  ObjectiveBankResource,
  ReferenceLearningObjective,
} from './gradeOneDomainOneObjectiveBank';
import { DOMAIN_THREE_FIELD_ID } from './domainThreeLearningSectionReference';

export const GRADE_THREE_DOMAIN_THREE_BANK_ID = 'objective-bank:lvl_p3:f_structuring:v1' as const;
const resourceId = (slug: string) => `curriculum-resource:lvl_p3:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const transversalId = (slug: string) =>
  `transversal-resource:lvl_p3:${DOMAIN_THREE_FIELD_ID}:${slug}`;
const componentId = (index: number) =>
  `learning-section:lvl_p3:${DOMAIN_THREE_FIELD_ID}:component:${index}`;
const resource = (slug: string, label: string, weight: number): ObjectiveBankResource => ({
  id: resourceId(slug),
  label,
  officialResourceGroupId: `official-resource-group:lvl_p3:${DOMAIN_THREE_FIELD_ID}:1`,
  family: 'organization',
  priority: 'core',
  selectionWeight: weight,
});
export const GRADE_THREE_DOMAIN_THREE_RESOURCES = deepFreeze([
  resource('appropriate-action', 'التصرف المناسب للموقف', 110),
  resource('landmark-navigation', 'التنقل بين المعالم', 110),
  resource('obstacle-organization', 'اجتياز الموانع ضمن تنظيم', 105),
  resource('bounded-space-use', 'استعمال المجال المحدد', 100),
  resource('tool-use-in-defined-space', 'استعمال الأداة داخل فضاء محدد', 100),
  resource('competition-rules', 'قواعد المنافسة', 105),
]);
export const GRADE_THREE_DOMAIN_THREE_TRANSVERSAL_RESOURCES = deepFreeze([
  { id: transversalId('safety'), label: 'أمن وسلامة الآخرين' },
  { id: transversalId('attention'), label: 'الانتباه للمعالم والقواعد' },
  { id: transversalId('respect'), label: 'احترام المنافس' },
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
  weight: number
): ReferenceLearningObjective => ({
  id: `G3-D3-OBJ-${String(index).padStart(2, '0')}`,
  gradeId: 'lvl_p3',
  domainId: DOMAIN_THREE_FIELD_ID,
  objectiveText: text,
  competencyComponentIds: [C(index === 1 ? 1 : index === 6 ? 3 : 2)],
  curriculumResourceIds: resources,
  transversalResourceIds: [T(index === 6 ? 'safety' : 'attention')],
  learningContent: learning,
  mobilizedKnowledge: knowledge,
  executionContent: execution,
  guidance,
  sourceReferences: ['EPS-2023:grade-3:domain-3', 'annual-plan-reference:lvl_p3:f_structuring'],
  tags: ['هيكلة', 'تصرفات', 'تنظيم'],
  progressionStage: stage,
  sequenceWeight: weight,
});
export const GRADE_THREE_DOMAIN_THREE_OBJECTIVE_BANK = deepFreeze([
  makeObjective(
    1,
    'يختار التصرف المناسب للموقف لتنظيم تدخله.',
    [R('appropriate-action')],
    'التصرف المناسب للموقف.',
    'متطلبات الموقف والتصرفات القاعدية.',
    'ينظم تدخله وفق ما يقتضيه الموقف.',
    'الانتباه للموقف والمعالم.',
    'foundation',
    10
  ),
  makeObjective(
    2,
    'يتنقل بين المعالم وفق تنظيم المسار.',
    [R('landmark-navigation')],
    'التنقل بين المعالم.',
    'المعالم وقواعد الانتقال بينها.',
    'ينتقل بين المعالم بطريقة منظمة.',
    'احترام المجال وعدم إعاقة الآخرين.',
    'organization',
    20
  ),
  makeObjective(
    3,
    'يجتاز الموانع بوسيلة داخل مسار منظم.',
    [R('obstacle-organization'), R('landmark-navigation')],
    'اجتياز الموانع.',
    'الموانع والمعالم والمسار.',
    'يجتاز المانع داخل التنظيم المحدد.',
    'مراعاة السلامة وقواعد الموقف.',
    'organization',
    30
  ),
  makeObjective(
    4,
    'ينظم تدخله داخل فضاء محدد وفق الموقف.',
    [R('bounded-space-use'), R('appropriate-action')],
    'استعمال المجال المحدد.',
    'حدود المجال ومقتضيات الموقف.',
    'يوزع تدخله داخل المجال المناسب.',
    'الالتزام بالحدود والمعالم.',
    'adaptation',
    40
  ),
  makeObjective(
    5,
    'يوظف أداة داخل فضاء محدد وفق قيود المهمة.',
    [R('tool-use-in-defined-space'), R('bounded-space-use')],
    'استعمال أداة داخل مجال محدد.',
    'المكان والبعد والعلو المحددون دون قيم رقمية.',
    'يستعمل الأداة داخل المجال المطلوب ضمن التنظيم.',
    'لا يحول النشاط إلى قياس تقني للرمي.',
    'adaptation',
    50
  ),
  makeObjective(
    6,
    'يلتزم بقواعد المنافسة أثناء تنظيم تدخله.',
    [R('competition-rules')],
    'قواعد المنافسة.',
    'قواعد المنافسة وأمن وسلامة الآخرين.',
    'يطبق القواعد أثناء التدخل المنظم.',
    'احترام المنافس والمحافظة على السلامة.',
    'adaptation',
    60
  ),
]);
