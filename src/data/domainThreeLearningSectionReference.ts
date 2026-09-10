import type {
  DomainOneLearningSectionReference,
  OfficialLearningSectionComponent,
} from './domainOneLearningSectionReference';

export const DOMAIN_THREE_FIELD_ID = 'f_structuring' as const;

const reference = (
  finalCompetency: string,
  componentTitles: string[],
  defaults: DomainOneLearningSectionReference['defaults']
): DomainOneLearningSectionReference =>
  Object.freeze({
    levelId: 'lvl_p1',
    fieldId: DOMAIN_THREE_FIELD_ID as never,
    finalCompetency,
    components: Object.freeze(
      componentTitles.map((title, index) =>
        Object.freeze({
          id: `learning-section:lvl_p1:${DOMAIN_THREE_FIELD_ID}:component:${index + 1}`,
          title,
        })
      )
    ) as unknown as OfficialLearningSectionComponent[],
    defaults: Object.freeze({
      ...defaults,
      resources: Object.freeze([...defaults.resources]) as unknown as string[],
    }),
  });

export const GRADE_ONE_DOMAIN_THREE_LEARNING_SECTION_REFERENCE = reference(
  'يستغل فضاء الممارسة ومعالمه للتّشكّل والتّنقّل المنتظم.',
  [
    'يتعرف على فضاءات الممارسة وضوابطها ومختلف التشكيلات والتنقلات المنتظمة.',
    'يوظف فضاءات الممارسة وفق معالمها وقواعدها.',
    'يحافظ على فضاءات الممارسة.',
  ],
  {
    learningContent: 'فضاءات الممارسة، حدودها، والتشكيلات والتنقلات المنتظمة.',
    pedagogicalKnowledge:
      'الفناء والساحة والملعب والرواق؛ الحدود؛ الأعداد والصفوف والوسائل والأقران.',
    executionContent: 'يتشكل ويتنقل بانتظام داخل فضاء محدد ويحافظ على تنظيمه.',
    guidance: 'احترام معالم فضاء الممارسة، والتنظيم، ومساحة الأقران.',
    resources: ['الفناء', 'الساحة', 'الملعب', 'الرواق', 'علامات تحديد الفضاء'],
  }
);
