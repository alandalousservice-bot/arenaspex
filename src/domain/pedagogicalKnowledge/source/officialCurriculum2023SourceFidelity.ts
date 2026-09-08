import { computeCatalogHash, deepFreeze } from '../catalog';
import { OFFICIAL_CURRICULUM_2023 } from './officialCurriculum2023';
import type {
  OfficialCurriculumDomainId,
  OfficialCurriculumGradeId,
  OfficialCurriculumSourceArtifact,
  OfficialResourceGroup,
} from './officialCurriculum.types';

export const SOURCE_FIDELITY_ARTIFACT_ID = 'dz-primary-pe-2023-source-fidelity' as const;

type ResourceSpec = readonly [string, string, readonly string[]];

const resources: Readonly<
  Record<
    OfficialCurriculumGradeId,
    Readonly<Record<OfficialCurriculumDomainId, readonly ResourceSpec[]>>
  >
> = {
  lvl_p1: {
    f_locomotion: [
      [
        'official-resource-group:lvl_p1:f_locomotion:1',
        'وظائف الأطراف وتكاملها',
        [
          'الوقوف: العادي، والوقوف ضما، والوقوف فتحا، والوقوف على جانب، أماما وخلفا.',
          'الجلوس: الجلوس العادي (التربع)، والجلوس على شيء، والجلوس ضما، وجلوس القرفصاء.',
          'التحول من الجلوس للوقوف والعكس، والاستلقاء على الظهر وعلى الجنب.',
          'وضعيات غير مألوفة: الانبطاح والانتصاب على أربع، والمشي على أربع.',
        ],
      ],
      [
        'official-resource-group:lvl_p1:f_locomotion:4',
        'التنقل العادي',
        ['مشي عادي وتنظيم فردي وثنائي.', 'هرولة فردية وثنائية.'],
      ],
    ],
    f_fundamentals: [
      [
        'official-resource-group:lvl_p1:f_fundamentals:1',
        'مختلف الحركات',
        [
          'المشي والجري الفردي والثنائي بوتيرة معينة: بطيئة، متوسطة، سريعة.',
          'التحول من المشي للجري تدريجيا، ومن الجري للمشي تدريجيا.',
          'الدفع الجانبي والخلفي وخطوات جانبية.',
        ],
      ],
    ],
    f_structuring: [
      [
        'official-resource-group:lvl_p1:f_structuring:1',
        'فضاء الممارسة',
        ['الفناء، الساحة، الملعب الجواري.'],
      ],
      [
        'official-resource-group:lvl_p1:f_structuring:2',
        'ضبط فضاء الممارسة',
        ['حدود ميدان الممارسة، التنقل في فضاء محدد، مشاركة فضاء الممارسة.'],
      ],
      [
        'official-resource-group:lvl_p1:f_structuring:3',
        'التشكيلات والتنقلات المنتظمة',
        ['الأعداد الصفوفية، الوسائل والأدوات.'],
      ],
    ],
  },
  lvl_p2: {
    f_locomotion: [
      [
        'official-resource-group:lvl_p2:f_locomotion:1',
        'الوضعية المناسبة',
        ['الوقوف، الانبطاح، الجثو، الجلوس، الوثب والحبو، ومختلف الوضعيات.'],
      ],
      [
        'official-resource-group:lvl_p2:f_locomotion:2',
        'أشكال التنقل',
        ['المشي والهرولة والجري والقفز والحجل، أماما وخلفا وجانبا.'],
      ],
      [
        'official-resource-group:lvl_p2:f_locomotion:limb-integration',
        'تكامل عمل الأطراف',
        ['في المشي، وفي الجري، وأثناء تنفيذ الحركة.'],
      ],
      [
        'official-resource-group:lvl_p2:f_locomotion:3',
        'مواقف التنفيذ',
        ['المشي السريع، الهرولة، الجري السريع.'],
      ],
      [
        'official-resource-group:lvl_p2:f_locomotion:4',
        'التنظيم',
        ['الابتعاد، الاقتراب، الازدحام.'],
      ],
    ],
    f_fundamentals: [
      [
        'official-resource-group:lvl_p2:f_fundamentals:1',
        'الحركات القاعدية في وضعيات طبيعية',
        ['من وقوف، ومن جلوس، ومن تمدد.'],
      ],
      [
        'official-resource-group:lvl_p2:f_fundamentals:2',
        'تكامل عمل الأطراف',
        ['في المشي، وفي الجري، وأثناء تنفيذ الحركة.'],
      ],
      [
        'official-resource-group:lvl_p2:f_fundamentals:3',
        'الحركات الملائمة',
        ['خطوات متناسقة، خطوات مترابطة، والمحافظة على السرعة.'],
      ],
    ],
    f_structuring: [
      [
        'official-resource-group:lvl_p2:f_structuring:1',
        'الوسائل',
        ['الكرات، الحبال، الأقماع، والحلقة.'],
      ],
      ['official-resource-group:lvl_p2:f_structuring:2', 'أسلوب التنفيذ', ['التسليم والاستلام.']],
      [
        'official-resource-group:lvl_p2:f_structuring:3',
        'الرمي',
        ['قريب وبعيد، جانبي وأمامي وخلفي، ودحرجة.'],
      ],
      [
        'official-resource-group:lvl_p2:f_structuring:4',
        'حفظ الأدوات',
        ['الترتيب، التنظيف، والتخزين.'],
      ],
    ],
  },
  lvl_p3: {
    f_locomotion: [
      [
        'official-resource-group:lvl_p3:f_locomotion:running-throwing',
        'الجري والرمي',
        ['الجري من المشي للهرولة، ومن الهرولة للجري، ومن الجري الخفيف للجري السريع.'],
      ],
      [
        'official-resource-group:lvl_p3:f_locomotion:throwing',
        'الرمي',
        ['من الثبات بيد واحدة وباليدين، وفي مكان معين، والرمي فوق علو معين.'],
      ],
      [
        'official-resource-group:lvl_p3:f_locomotion:instructions',
        'التعليمات والتوجيهات',
        ['أمن وسلامة الفوج، واحترام مجال الرمي.'],
      ],
    ],
    f_fundamentals: [
      [
        'official-resource-group:lvl_p3:f_fundamentals:1',
        'الحركات القاعدية',
        ['حسب وتائر وطبيعة وسرعة مختلفة.'],
      ],
      [
        'official-resource-group:lvl_p3:f_fundamentals:2',
        'الجري',
        ['على خط مستقيم، وفي منحنى، والجري المتعرج.'],
      ],
      [
        'official-resource-group:lvl_p3:f_fundamentals:3',
        'الرمي',
        ['بيد واحدة وباليدين، ومن الأمام والخلف والجانب، وفي مكان أو علو معين.'],
      ],
      [
        'official-resource-group:lvl_p3:f_fundamentals:4',
        'القواعد الأمنية',
        ['خلال الممارسة ومسافات الرمي.'],
      ],
    ],
    f_structuring: [
      [
        'official-resource-group:lvl_p3:f_structuring:1',
        'التصرفات القاعدية',
        [
          'التصرف المناسب للموقف، والزيادة في السرعة والتوافق، وتغيير الاتجاه، والإفلات للتخلص من المنافس.',
        ],
      ],
      [
        'official-resource-group:lvl_p3:f_structuring:2',
        'التنقل بين المعالم',
        ['اجتياز موانع بوسيلة، ورمي أداة في حدود فضاء ومكان وعلى بعد أو علو معين.'],
      ],
      ['official-resource-group:lvl_p3:f_structuring:3', 'قواعد المنافسة', ['أمن وسلامة الآخرين.']],
    ],
  },
  lvl_p4: {
    f_locomotion: [
      [
        'official-resource-group:lvl_p4:f_locomotion:1',
        'أشكال التنقلات',
        ['وضعية الجسم أثناء الجري وتربية الخطوة وآليتها.'],
      ],
      [
        'official-resource-group:lvl_p4:f_locomotion:body-position',
        'وضعية الجسم أثناء الجري',
        ['تربية الخطوة وآليتها.'],
      ],
      [
        'official-resource-group:lvl_p4:f_locomotion:2',
        'الأطراف خلال الجري بسرعة قصوى',
        ['على محور، وعلى منحنى، وعلى خط متعرج.'],
      ],
      [
        'official-resource-group:lvl_p4:f_locomotion:group-running',
        'الجري ضمن مجموعة',
        ['وتيرة الجري.'],
      ],
    ],
    f_fundamentals: [
      [
        'official-resource-group:lvl_p4:f_fundamentals:1',
        'أنماط الوثب وأنواعه',
        ['برجل واحدة وبالرجلين، للأمام وللأعلى، فرديا وجماعيا، والوثبات المتتالية والمتبادلة.'],
      ],
      [
        'official-resource-group:lvl_p4:f_fundamentals:2',
        'الرمي حسب الموقف',
        ['بيد واحدة وباليدين، من ثبات ومن حركة، للخلف والجانب، وربط الوثب بالرمي.'],
      ],
      [
        'official-resource-group:lvl_p4:f_fundamentals:3',
        'الحركات القاعدية للجمباز',
        ['القفز للأعلى، الوثب فرديا وجماعيا، والوثب للصدر.'],
      ],
      [
        'official-resource-group:lvl_p4:f_fundamentals:4',
        'حركات التوازن',
        ['التوازن الأمامي المنخفض، والجانبي، وعلى رجل واحدة.'],
      ],
      [
        'official-resource-group:lvl_p4:f_fundamentals:5',
        'حركات الدوران',
        ['نصف دورة عادية، دورة كاملة عادية، والسقوط الآمن.'],
      ],
      [
        'official-resource-group:lvl_p4:f_fundamentals:6',
        'التدحرج',
        ['تدحرج أمامي عادي، وتدحرج جانبي.'],
      ],
    ],
    f_structuring: [
      [
        'official-resource-group:lvl_p4:f_structuring:1',
        'علاقة التنقل بالفضاء المتاح',
        ['آمن وخطير، وانتشار الزملاء والمنافسين.'],
      ],
      [
        'official-resource-group:lvl_p4:f_structuring:2',
        'الرمي بضبط فضاء الممارسة',
        ['المسافات، الأبعاد، والمجالات.'],
      ],
      [
        'official-resource-group:lvl_p4:f_structuring:3',
        'الوثب بضبط فضاء الممارسة',
        ['مسار الوثبة، هيئة الجسم، الوثب برجل واحدة لأبعد مسافة، والوثبات التبادلية.'],
      ],
    ],
  },
  lvl_p5: {
    f_locomotion: [
      [
        'official-resource-group:lvl_p5:f_locomotion:1',
        'الوضعية الملائمة للجسم',
        [
          'أثناء الجري: تنسيق الأطراف والتوازن والانسيابية وخطوات ديناميكية.',
          'أثناء الوثب: التوازن والسقوط السليم.',
          'أثناء الرمي: الإحساس بالأداة وترتيب القوى وتحديد مجال الرمي.',
          'أثناء الاسترخاء: الجري والوثب والرمي.',
        ],
      ],
      [
        'official-resource-group:lvl_p5:f_locomotion:2',
        'تسلسل الدفع',
        ['في الجري، وفي الوثب، وفي الرمي.'],
      ],
      [
        'official-resource-group:lvl_p5:f_locomotion:3',
        'الانتقال المناسب لأسلوب الوثب أو الرمي',
        ['اختيار الانتقال المناسب لأسلوب الوثب أو الرمي.'],
      ],
    ],
    f_fundamentals: [
      [
        'official-resource-group:lvl_p5:f_fundamentals:1',
        'ديناميكية الجري لمسافات قصيرة',
        ['الجري السريع، تواتر الخطوات، تنسيق عمل الأطراف، واعتدال الجسم خلال الجري.'],
      ],
      [
        'official-resource-group:lvl_p5:f_fundamentals:2',
        'الوثب',
        ['أسلوب الوثب والاجتياز، استثمار الجري، الدفع المناسب، وتنسيق مراحل الوثب.'],
      ],
      [
        'official-resource-group:lvl_p5:f_fundamentals:3',
        'الرمي',
        ['مراحل الرمي، الرمي من وضعيات مختلفة، استثمار الجري، والرمي بيد واحدة وباليدين.'],
      ],
      [
        'official-resource-group:lvl_p5:f_fundamentals:4',
        'حركات قاعدية للجمباز',
        ['وثبة الغزالة، ووثبات الحجلة.'],
      ],
      [
        'official-resource-group:lvl_p5:f_fundamentals:5',
        'حركات التوازن',
        ['توازن أمامي على رجل واحدة، والتوازن على الكتفين.'],
      ],
      [
        'official-resource-group:lvl_p5:f_fundamentals:6',
        'حركات الدوران',
        ['ربع دورة، نصف دورة، ودورة كاملة على رجل واحدة.'],
      ],
      [
        'official-resource-group:lvl_p5:f_fundamentals:7',
        'التدحرج',
        ['تدحرج خلفي عادي، أمامي فردي، وخلفي فردي.'],
      ],
    ],
    f_structuring: [
      [
        'official-resource-group:lvl_p5:f_structuring:1',
        'الألعاب الجماعية',
        ['كرة اليد في ملعب صغير، وكرة السلة للصغار.'],
      ],
      [
        'official-resource-group:lvl_p5:f_structuring:basic-concepts',
        'المفاهيم الأساسية',
        ['الملعب وأطواله، قواعد اللعبة، والأخطاء.'],
      ],
      [
        'official-resource-group:lvl_p5:f_structuring:2',
        'المبادئ الأولية في التكتيك',
        ['التوزيع المنظم على الملعب، اللعب الجماعي، الدفاع والهجوم.'],
      ],
      [
        'official-resource-group:lvl_p5:f_structuring:3',
        'الحركات التقنية الأساسية',
        ['تمريرات الكرة ومسكها، المراوغات، التنقل بالكرة، والقذف.'],
      ],
    ],
  },
};

const officialTextCorrections: Readonly<Record<string, string>> = {
  'overall-competency:lvl_p2':
    'ينفذ حركات طبيعية بسيطة في وضعيات وتنقلات متنوعة، ويعدلها حسب الموقف، محددا الأسلوب المناسب للفضاء المتاح.',
  fc_lvl_p2_f_fundamentals: 'ينفذ حركات طبيعية بسيطة في وضعيات متنوعة.',
  fc_lvl_p5_f_fundamentals: 'ينجز حركات قاعدية مرتبطة بالجري والوثب للرمي بطريقة سليمة،',
  'learning-section:lvl_p1:f_locomotion:component:2':
    'يوظف تكامل أطرافه ويستثمرها في الوضعيات مألوفة وغير مألوفة حسب الموقف.',
  'learning-section:lvl_p1:f_fundamentals:component:1':
    'يتعرف على مختلف الحركات القاعدية والتحولات.',
  'learning-section:lvl_p5:f_locomotion:component:1':
    'يتعرف على الوضعيات الملائمة للجسم في وضعيات الجري والوثب للرمي وكيفيات تعديلها.',
  'learning-section:lvl_p5:f_fundamentals:component:1':
    'يتعرف على الحركات القاعدية المرتبطة بالجري للوثب، للرمي حسب نوعية الأداة المستعملة.',
  'learning-section:lvl_p5:f_fundamentals:component:2':
    'يختار الدينامية المناسبة حسب الوضعية والموقف.',
  'learning-section:lvl_p5:f_fundamentals:component:3': 'يتقيد بالتقنيات الملائمة للوضعية وللموقف.',
};

const supersededComponentIds: Readonly<Record<string, string>> = {
  'learning-section:lvl_p5:f_fundamentals:component:1':
    'learning-section:lvl_p5:f_fundamentals:source-fidelity-component:1',
  'learning-section:lvl_p5:f_fundamentals:component:2':
    'learning-section:lvl_p5:f_fundamentals:source-fidelity-component:2',
  'learning-section:lvl_p5:f_fundamentals:component:3':
    'learning-section:lvl_p5:f_fundamentals:source-fidelity-component:3',
};

const sourcePages = new Map(
  OFFICIAL_CURRICULUM_2023.grades.flatMap((grade) =>
    grade.domains.map(
      (cell) => [`${cell.gradeId}:${cell.domainId}`, cell.source.sourcePage] as const
    )
  )
);

const grades = OFFICIAL_CURRICULUM_2023.grades.map((grade) => ({
  ...grade,
  overallCompetency: {
    ...grade.overallCompetency,
    text: officialTextCorrections[grade.overallCompetency.id] || grade.overallCompetency.text,
  },
  domains: grade.domains.map((cell) => {
    const correctedComponents = cell.competencyComponents.map((component) => ({
      ...component,
      id: supersededComponentIds[component.id] || component.id,
      text: officialTextCorrections[component.id] || component.text,
    }));
    const correctedResources: OfficialResourceGroup[] = resources[cell.gradeId][cell.domainId].map(
      ([id, label, content]) => ({
        id,
        gradeId: cell.gradeId,
        domainId: cell.domainId,
        finalCompetencyId: cell.finalCompetency.id,
        label,
        content,
        sourceDocument: 'EPS-2023',
        sourcePage: sourcePages.get(`${cell.gradeId}:${cell.domainId}`)!,
        sourceHeading: cell.source.sourceHeading,
        provenance: 'official_structured_extraction',
      })
    );
    return {
      ...cell,
      finalCompetency: {
        ...cell.finalCompetency,
        text: officialTextCorrections[cell.finalCompetency.id] || cell.finalCompetency.text,
      },
      competencyComponents: correctedComponents,
      resourceGroups: correctedResources,
    };
  }),
}));

const artifactContent = {
  ...OFFICIAL_CURRICULUM_2023,
  sourceDocument: {
    ...OFFICIAL_CURRICULUM_2023.sourceDocument,
  },
  grades,
};

export const OFFICIAL_CURRICULUM_2023_SOURCE_FIDELITY: Readonly<OfficialCurriculumSourceArtifact> =
  deepFreeze({
    ...artifactContent,
    contentHash: computeCatalogHash({ ...artifactContent, contentHash: '' }),
  });

export const SOURCE_FIDELITY_RESOURCE_COUNTS = deepFreeze({
  lvl_p1: { f_locomotion: 2, f_fundamentals: 1, f_structuring: 3 },
  lvl_p2: { f_locomotion: 5, f_fundamentals: 3, f_structuring: 4 },
  lvl_p3: { f_locomotion: 3, f_fundamentals: 4, f_structuring: 3 },
  lvl_p4: { f_locomotion: 4, f_fundamentals: 6, f_structuring: 3 },
  lvl_p5: { f_locomotion: 3, f_fundamentals: 7, f_structuring: 4 },
} as const);
