export const DOMAIN_ONE_FIELD_ID = 'f_locomotion' as const;

export interface OfficialLearningSectionComponent {
  id: string;
  title: string;
}

export interface DomainOnePedagogicalDefaults {
  learningContent: string;
  pedagogicalKnowledge: string;
  executionContent: string;
  guidance: string;
  resources: string[];
}

export interface DomainOneLearningSectionReference {
  levelId: string;
  fieldId: typeof DOMAIN_ONE_FIELD_ID;
  finalCompetency: string;
  components: OfficialLearningSectionComponent[];
  defaults: DomainOnePedagogicalDefaults;
}

const reference = (
  levelId: string,
  finalCompetency: string,
  componentTitles: string[],
  defaults: DomainOnePedagogicalDefaults
): DomainOneLearningSectionReference => ({
  levelId,
  fieldId: DOMAIN_ONE_FIELD_ID,
  finalCompetency,
  components: componentTitles.map((title, index) => ({
    id: `learning-section:${levelId}:${DOMAIN_ONE_FIELD_ID}:component:${index + 1}`,
    title,
  })),
  defaults,
});

/**
 * Official Domain 1 reference transcribed from the primary-school PE curriculum.
 * It is deliberately separate from Annual Plan data: this phase enriches Learning
 * Sections only and leaves Domains 2/3 without invented reference content.
 */
export const DOMAIN_ONE_LEARNING_SECTION_REFERENCE: Readonly<
  Record<string, DomainOneLearningSectionReference>
> = Object.freeze({
  lvl_p1: reference(
    'lvl_p1',
    'يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر.',
    [
      'يتعرف على مختلف الوضعيات الطبيعية المألوفة وغير المألوفة في محيطه المباشر.',
      'يوظف تكامل أطرافه ويستثمرها في الوضعيات المألوفة وغير المألوفة حسب الموقف.',
      'يحترم القواعد العامة عند أخذ مختلف الوضعيات.',
    ],
    {
      learningContent: 'الوضعيات الطبيعية المألوفة وغير المألوفة، والتنقل العادي والتحولات.',
      pedagogicalKnowledge:
        'الوقوف والجلوس والاستلقاء والانبطاح؛ المشي والهرولة؛ التحول بين الوضعيات ومسارات التنقل.',
      executionContent:
        'اتخاذ وضعيات جسمية مختلفة، والتحول بينها، والتنقل في فضاء محدد وفق الإشارة والموقف.',
      guidance: 'احترام التعليمات، وضبط فضاء الممارسة، والمحافظة على السلامة أثناء التنقل.',
      resources: ['أقماع', 'حلقات', 'حبال', 'بساط', 'كرات خفيفة'],
    }
  ),
  lvl_p2: reference(
    'lvl_p2',
    'يعدل في الوقت المناسب وضعيته وتنقلاته من موقف إلى آخر.',
    [
      'يتعرف على الوضعيات والتنقلات والمواقف ومختلف التنظيمات.',
      'ينفذ الموقف بما يتماشى وإمكاناته الفردية في مختلف الوضعيات.',
      'يسهر على سلامة وأمن زملائه.',
    ],
    {
      learningContent: 'الوضعيات المناسبة والتنقل السليم ومواقف التنفيذ والتنظيمات الحركية.',
      pedagogicalKnowledge:
        'الوقوف والانحناء والجثو والمشي والجري والوثب، والتنقل في مسار مستقيم أو متعرج أو دائري.',
      executionContent:
        'اختيار الوضعية والتنظيم المناسبين، وتغيير الاتجاه والسرعة، وتنفيذ التنقل الملائم للموقف.',
      guidance: 'مراعاة سلامة الزملاء، وحفظ الأدوات، واحترام تنظيم الفضاء ومراحل التنفيذ.',
      resources: ['أقماع', 'حلقات', 'حبال', 'بساط', 'علامات أرضية'],
    }
  ),
  lvl_p3: reference(
    'lvl_p3',
    'يركب جملة من العمليات وينفذها وفق ما يتطلبه الموقف.',
    [
      'يتعرف على كيفية الربط بين تدرج جملة من الحركات (الجري والرمي).',
      'يلتزم بالتعليمات والتوجيهات المناسبة عند الرمي والجري.',
      'يحترم التعليمات والتوجيهات المقدمة.',
    ],
    {
      learningContent: 'التدرج في الجري والرمي والربط بين الحركات وفق متطلبات الموقف.',
      pedagogicalKnowledge:
        'الجري من الهرولة إلى الجري الخفيف والسريع؛ الرمي من الثبات وبيد واحدة أو باليدين؛ قواعد الأمن.',
      executionContent:
        'إنجاز الجري والرمي في وضعيات متدرجة، والانتقال بين المعالم، وتطبيق قواعد المنافسة المناسبة.',
      guidance: 'التقيد بالتعليمات، واحترام قواعد الأمن والسلامة، والمحافظة على سلامة الزملاء.',
      resources: ['أقماع', 'شواخص', 'كرات خفيفة', 'علامات أرضية'],
    }
  ),
  lvl_p4: reference(
    'lvl_p4',
    'ينجز مختلف الحركات فرديا وجماعيا ويحافظ على ترابطها.',
    [
      'يتعرف على وضعيات الجسم وعمل الأطراف ووتيرة الجري ضمن مجموعة.',
      'يضبط جسمه وعمل أطرافه وفق مختلف وضعيات التنقل.',
      'يتعايش مع المجموعة.',
    ],
    {
      learningContent: 'تقنيات التنقل ووضعية الجسم وعمل الأطراف ووتيرة الجري ضمن مجموعة.',
      pedagogicalKnowledge:
        'أشكال التنقل؛ تربية الخطوة؛ الجري بسرعة قصوى على مسار مستقيم أو منحنى أو متعرج؛ وتيرة الجري.',
      executionContent:
        'استعمال تقنيات التنقل المناسبة وضبط الجسم والأطراف والانسجام مع وتيرة المجموعة.',
      guidance: 'الاستجابة لوتيرة الجري، واحترام فضاء الممارسة، والتقيد بضوابط النشاط الجماعي.',
      resources: ['أقماع', 'حواجز منخفضة', 'علامات مسار', 'صدريات'],
    }
  ),
  lvl_p5: reference(
    'lvl_p5',
    'ينجز مختلف الوضعيات والتنقلات في الرياضات الفردية والألعاب الجماعية محافظا على ترابطها، ويلائم وضعية جسمه حسب الموقف.',
    [
      'يتعرف على الوضعيات الملائمة للجسم في الجري والوثب والرمي وكيفيات تعديلها.',
      'يلائم وضعيات جسمه حسب مختلف المواقف.',
      'يتقيد بمختلف الوضعيات المناسبة حسب الموقف.',
    ],
    {
      learningContent: 'الوضعيات الملائمة للجسم والانتقال المناسب أثناء الجري والوثب والرمي.',
      pedagogicalKnowledge:
        'التنسيق والتوازن والخطوات الديناميكية؛ مراحل الوثب والرمي؛ تسلسل الدفع والانتقال الملائم للموقف.',
      executionContent:
        'تعديل وضعية الجسم وتحقيق تسلسل الدفع والربط بين الجري والوثب والرمي في وضعيات مختلفة.',
      guidance: 'اختيار الوضعية والديناميكية المناسبة، والتواصل مع الزملاء، ومراعاة قواعد النشاط.',
      resources: ['أقماع', 'حواجز', 'حلقات', 'حبال', 'كرات خفيفة'],
    }
  ),
});

export function getDomainOneLearningSectionReference(
  levelId: string,
  fieldId: string
): DomainOneLearningSectionReference | undefined {
  if (fieldId !== DOMAIN_ONE_FIELD_ID) return undefined;
  return DOMAIN_ONE_LEARNING_SECTION_REFERENCE[levelId];
}

export function getLearningSectionComponents(levelId: string, fieldId: string) {
  return getDomainOneLearningSectionReference(levelId, fieldId)?.components || [];
}
