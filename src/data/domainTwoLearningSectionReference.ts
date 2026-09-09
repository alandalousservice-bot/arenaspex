import type { DomainOneLearningSectionReference } from './domainOneLearningSectionReference';

export const DOMAIN_TWO_FIELD_ID = 'f_fundamentals' as const;

const GRADE_ONE_DOMAIN_TWO_REFERENCE: DomainOneLearningSectionReference = Object.freeze({
  levelId: 'lvl_p1',
  fieldId: 'f_fundamentals' as never,
  finalCompetency: 'ينفّذ حركات قاعدية مبنية على تكامل وظائف جسمه.',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p1:f_fundamentals:component:1',
      title: 'يتعرف على مختلف الحركات القاعدية والتنقلات.',
    },
    {
      id: 'learning-section:lvl_p1:f_fundamentals:component:2',
      title: 'يوظف مختلف الحركات القاعدية عند التحول.',
    },
    {
      id: 'learning-section:lvl_p1:f_fundamentals:component:3',
      title: 'يحترم وتائر الحركات ومسارات التحول.',
    },
  ]) as unknown as DomainOneLearningSectionReference['components'],
  defaults: Object.freeze({
    learningContent: 'المشي والجري والوتائر والتحول بين الحركات القاعدية.',
    pedagogicalKnowledge: 'المشي والجري الفردي والجماعي، والوتائر البطيئة والمتوسطة والسريعة.',
    executionContent: 'ينفذ الحركة القاعدية بالوتيرة المناسبة ويحافظ على تكامل وظائف جسمه.',
    guidance: 'احترام القواعد، المجال، والوتيرة المناسبة أثناء التنفيذ.',
    resources: Object.freeze(['علامات أرضية', 'أقماع']) as unknown as string[],
  }),
});

const GRADE_TWO_DOMAIN_TWO_REFERENCE: DomainOneLearningSectionReference = Object.freeze({
  levelId: 'lvl_p2',
  fieldId: 'f_fundamentals' as never,
  finalCompetency: 'ينفذ حركات طبيعية بسيطة في وضعيات مختلفة.',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p2:f_fundamentals:component:1',
      title: 'يتعرف على الحركات القاعدية الملائمة وتكامل عمل الأطراف في مختلف الوضعيات.',
    },
    {
      id: 'learning-section:lvl_p2:f_fundamentals:component:2',
      title: 'يؤدي الحركات القاعدية الملائمة في مختلف الوضعيات.',
    },
    {
      id: 'learning-section:lvl_p2:f_fundamentals:component:3',
      title: 'يسهر على أداء مختلف الحركات.',
    },
  ]) as unknown as DomainOneLearningSectionReference['components'],
  defaults: Object.freeze({
    learningContent: 'الحركات القاعدية في وضعيات طبيعية، وتكامل الأطراف، والخطوات الملائمة.',
    pedagogicalKnowledge:
      'الحركات من الجثو والوقوف والجلوس والتمدد؛ الخطوات المتناسقة والمرتفعة؛ المحافظة على السرعة.',
    executionContent:
      'ينفذ الحركة القاعدية من وضعية طبيعية مع تكامل الأطراف والمحافظة على الوتيرة.',
    guidance: 'احترام الوضعية، الوتيرة، المجال، وسلامة التنفيذ.',
    resources: Object.freeze(['علامات أرضية', 'أقماع', 'حلقات']) as unknown as string[],
  }),
});

const GRADE_THREE_DOMAIN_TWO_REFERENCE: DomainOneLearningSectionReference = Object.freeze({
  levelId: 'lvl_p3',
  fieldId: 'f_fundamentals' as never,
  finalCompetency: 'ينجز حركات قاعدية متعلقة بالجري وبالرمي.',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p3:f_fundamentals:component:1',
      title: 'يتعرف على الحركات القاعدية حسب وتائرها والقواعد الأمنية.',
    },
    {
      id: 'learning-section:lvl_p3:f_fundamentals:component:2',
      title: 'ينفذ الحركات القاعدية ويلتزم بالقواعد الأمنية.',
    },
    { id: 'learning-section:lvl_p3:f_fundamentals:component:3', title: 'يحترم القواعد الأمنية.' },
  ]) as unknown as DomainOneLearningSectionReference['components'],
  defaults: Object.freeze({
    learningContent:
      'الجري بوتائر مختلفة ومسارات متنوعة، والرمي بيد واحدة وباليدين في اتجاهات ومسافات نوعية.',
    pedagogicalKnowledge:
      'الوتائر البطيئة والمتوسطة والسريعة؛ الجري المستقيم والمنعرج والمتعرج؛ الرمي بيد واحدة وباليدين مع احترام مجال الرمي.',
    executionContent:
      'ينفذ الجري والرمي بالشكل والوتيرة والاتجاه الملائم، ويحافظ على سلامة مجال الممارسة.',
    guidance: 'اختيار الوتيرة والمسار المناسبين، وتنظيم فضاء الرمي واحترام قواعد الأمن.',
    resources: Object.freeze([
      'علامات أرضية',
      'أقماع',
      'كرات',
      'أكياس رملية',
    ]) as unknown as string[],
  }),
});

const GRADE_FOUR_DOMAIN_TWO_REFERENCE: DomainOneLearningSectionReference = Object.freeze({
  levelId: 'lvl_p4',
  fieldId: 'f_fundamentals' as never,
  finalCompetency: 'يبني الحركات القاعدية التي تضمن مواجهة الموقف بما يتماشى وفضاء الممارسة.',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p4:f_fundamentals:component:1',
      title: 'يتعرف على أنماط الوثب والرمي والحركات القاعدية للجمباز وضوابطها وفضاء الممارسة.',
    },
    {
      id: 'learning-section:lvl_p4:f_fundamentals:component:2',
      title: 'يمارس أنماط الوثب والرمي والحركات القاعدية للجمباز.',
    },
    {
      id: 'learning-section:lvl_p4:f_fundamentals:component:3',
      title: 'يلتزم بأخلاقيات الممارسة.',
    },
  ]) as unknown as DomainOneLearningSectionReference['components'],
  defaults: Object.freeze({
    learningContent: 'الوثب والرمي والحركات القاعدية للجمباز والتوازن والدوران والتدحرج.',
    pedagogicalKnowledge:
      'الوثب برجل واحدة أو بالرجلين، الوثبات المتتالية، الرمي من الثبات والحركة، التوازن، الدوران، التدحرج والسقوط الآمن.',
    executionContent: 'يمارس الحركة القاعدية الملائمة ويحافظ على التحكم في الجسم وفضاء الممارسة.',
    guidance: 'احترام ضوابط الممارسة، سلامة السقوط، المجال، وأخلاقيات العمل.',
    resources: Object.freeze([
      'بساط',
      'كرات',
      'حواجز منخفضة',
      'علامات أرضية',
    ]) as unknown as string[],
  }),
});

const GRADE_FIVE_DOMAIN_TWO_REFERENCE: DomainOneLearningSectionReference = Object.freeze({
  levelId: 'lvl_p5',
  fieldId: 'f_fundamentals' as never,
  finalCompetency: 'ينجز حركات قاعدية متعلقة بالجري والوثب والرمي بطريقة سليمة.',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p5:f_fundamentals:component:1',
      title: 'يتعرف على الحركات القاعدية حسب وتائرها والقواعد الأمنية.',
    },
    {
      id: 'learning-section:lvl_p5:f_fundamentals:component:2',
      title: 'ينفذ الحركات القاعدية ويلتزم بالقواعد الأمنية.',
    },
    { id: 'learning-section:lvl_p5:f_fundamentals:component:3', title: 'يحترم القواعد الأمنية.' },
  ]) as unknown as DomainOneLearningSectionReference['components'],
  defaults: Object.freeze({
    learningContent:
      'ديناميكية الجري والوثب والرمي، والحركات القاعدية للجمباز والتوازن والدوران والتدحرج.',
    pedagogicalKnowledge:
      'تواتر الخطوات وتنسيق الأطراف؛ مراحل الوثب والرمي؛ التوازن والدوران والتدحرج؛ الربط بين الحركات.',
    executionContent: 'ينفذ الحركة القاعدية بإتقان نسبي، ويضبط مراحلها ويحافظ على سلامة الممارسة.',
    guidance: 'احترام المجال، مراحل التنفيذ، السقوط الآمن، وقواعد الممارسة.',
    resources: Object.freeze(['كرات', 'أقماع', 'حواجز', 'بساط']) as unknown as string[],
  }),
});

export function getDomainTwoLearningSectionReference(
  levelId: string,
  fieldId: string
): DomainOneLearningSectionReference | undefined {
  if (fieldId !== DOMAIN_TWO_FIELD_ID) return undefined;
  if (levelId === 'lvl_p1') return GRADE_ONE_DOMAIN_TWO_REFERENCE;
  if (levelId === 'lvl_p2') return GRADE_TWO_DOMAIN_TWO_REFERENCE;
  if (levelId === 'lvl_p3') return GRADE_THREE_DOMAIN_TWO_REFERENCE;
  if (levelId === 'lvl_p4') return GRADE_FOUR_DOMAIN_TWO_REFERENCE;
  if (levelId === 'lvl_p5') return GRADE_FIVE_DOMAIN_TWO_REFERENCE;
  return undefined;
}
