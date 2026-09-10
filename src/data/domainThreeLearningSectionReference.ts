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

export const GRADE_TWO_DOMAIN_THREE_LEARNING_SECTION_REFERENCE = Object.freeze({
  levelId: 'lvl_p2',
  fieldId: DOMAIN_THREE_FIELD_ID as never,
  finalCompetency: 'يحدد الأسلوب والفضاء المناسبين لاستعمال أداة',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p2:f_structuring:component:1',
      title: 'يتعرف على الوسائل وكيفيات توظيفها وحفظها ومجالات استعمالها.',
    },
    {
      id: 'learning-section:lvl_p2:f_structuring:component:2',
      title: 'يستخدم مختلف الوسائل بالكيفيات المناسبة ويحفظها.',
    },
    { id: 'learning-section:lvl_p2:f_structuring:component:3', title: 'يصون الوسائل ويحفظها.' },
  ]),
  defaults: Object.freeze({
    learningContent: 'الوسائل وأساليب استعمالها وحفظها.',
    pedagogicalKnowledge:
      'الكور والشواهد والأقماع والجلة؛ التسليم والاستلام؛ الرمي والدحرجة؛ الترتيب والتنظيف والتخزين.',
    executionContent: 'يختار الوسيلة والفضاء المناسبين ويستعملها ويحفظها.',
    guidance: 'احترام ضوابط الاستعمال والمحافظة على الوسائل.',
    resources: Object.freeze([
      'وسائل الممارسة',
      'الفضاء المناسب',
      'التسليم والاستلام',
      'استعمال الوسيلة',
      'حفظ الأدوات',
    ]),
  }),
});

export const GRADE_THREE_DOMAIN_THREE_LEARNING_SECTION_REFERENCE = Object.freeze({
  levelId: 'lvl_p3',
  fieldId: DOMAIN_THREE_FIELD_ID as never,
  finalCompetency: 'يبني تصرفاته القاعدية لتنظيم تدخلاته حسب الموقف',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p3:f_structuring:component:1',
      title:
        'يتعرف على التصرفات القاعدية، وطرق التنقل بين المعالم، وعلى الرمي وقواعد المنافسة المناسبة.',
    },
    {
      id: 'learning-section:lvl_p3:f_structuring:component:2',
      title: 'يتنقل بين المعالم وفق قواعد المنافسة المناسبة.',
    },
    { id: 'learning-section:lvl_p3:f_structuring:component:3', title: 'يلتزم بقواعد المنافسة.' },
  ]),
  defaults: Object.freeze({
    learningContent:
      'التصرفات المناسبة للموقف، والتنقل بين المعالم، واجتياز الموانع، وقواعد المنافسة.',
    pedagogicalKnowledge:
      'التصرف المناسب، تغيير الاتجاه، الإفلات، اجتياز مانع بوسيلة، واستعمال أداة داخل مجال محدد.',
    executionContent: 'ينظم تدخله بين المعالم وداخل المجال المحدد وفق الموقف والقواعد.',
    guidance: 'أمن وسلامة الآخرين والالتزام بقواعد المنافسة.',
    resources: Object.freeze([
      'التصرف المناسب',
      'التنقل بين المعالم',
      'اجتياز الموانع',
      'المجال المحدد',
      'قواعد المنافسة',
    ]),
  }),
});

export const GRADE_FOUR_DOMAIN_THREE_LEARNING_SECTION_REFERENCE = Object.freeze({
  levelId: 'lvl_p4',
  fieldId: DOMAIN_THREE_FIELD_ID as never,
  finalCompetency: 'يبني الحركات القاعدية التي تضمن مواجهة الموقف بما يتماشى وفضاء الممارسة.',
  components: Object.freeze([
    {
      id: 'learning-section:lvl_p4:f_structuring:component:1',
      title: 'يجند معارفه وقدرات جسمه للتنقل والرمي والوثب بما يتناسب وفضاء الممارسة.',
    },
    {
      id: 'learning-section:lvl_p4:f_structuring:component:2',
      title: 'يستغل الفضاء المتاح للتنقل والرمي والوثب.',
    },
    {
      id: 'learning-section:lvl_p4:f_structuring:component:3',
      title: 'يحترم ضوابط الممارسة في الفضاء المتاح.',
    },
  ]),
  defaults: Object.freeze({
    learningContent: 'تنظيم التنقل والرمي والوثب وفق الفضاء المتاح وانتشار الآخرين.',
    pedagogicalKnowledge:
      'علاقة التنقل بالفضاء المتاح؛ المسافات والأبعاد والمجالات؛ مسار الوثبة وهيئة الجسم والوثبات التبادلية.',
    executionContent: 'ينظم أفعاله الحركية ويضبطها داخل الفضاء المتاح وفق متطلبات الوضعية.',
    guidance: 'مراعاة أمان الفضاء وانتشار الزملاء والمنافسين واحترام ضوابط الممارسة.',
    resources: Object.freeze([
      'علاقة التنقل بالفضاء المتاح',
      'انتشار الزملاء والمنافسين',
      'ضبط فضاء الرمي',
      'ضبط فضاء الوثب',
    ]),
  }),
});
