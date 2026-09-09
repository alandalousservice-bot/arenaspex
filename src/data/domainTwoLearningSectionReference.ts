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

export function getDomainTwoLearningSectionReference(
  levelId: string,
  fieldId: string
): DomainOneLearningSectionReference | undefined {
  if (fieldId !== DOMAIN_TWO_FIELD_ID) return undefined;
  if (levelId === 'lvl_p1') return GRADE_ONE_DOMAIN_TWO_REFERENCE;
  if (levelId === 'lvl_p2') return GRADE_TWO_DOMAIN_TWO_REFERENCE;
  return undefined;
}
