import { computeCatalogHash, deepFreeze } from '../catalog';
import type {
  OfficialCurriculumDomainId,
  OfficialCurriculumGrade,
  OfficialCurriculumGradeId,
  OfficialCurriculumSourceArtifact,
  OfficialGradeDomainCell,
  OfficialResourceGroup,
} from './officialCurriculum.types';

const SOURCE_DOCUMENT = 'EPS-2023' as const;
const domainLabels: Record<OfficialCurriculumDomainId, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
};

type CellSpec = readonly [
  OfficialCurriculumGradeId,
  OfficialCurriculumDomainId,
  number | readonly number[],
  string,
  readonly [string, string, string],
  readonly string[],
];

const specs: readonly CellSpec[] = [
  [
    'lvl_p1',
    'f_locomotion',
    [13, 14],
    'يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر.',
    [
      'يتعرف على مختلف الوضعيات الطبيعية المألوفة وغير المألوفة في محيطه المباشر.',
      'يوظف تكامل الأطراف ويستثمرها في وضعيات مألوفة وغير مألوفة حسب الموقف.',
      'يحترم القواعد عند أخذ مختلف الوضعيات.',
    ],
    [
      'وظائف الأطراف وتكاملها',
      'وضعيات الوقوف',
      'وضعيات الجلوس والوضعيات غير المألوفة',
      'المشي والهرولة الفردية والثنائية',
    ],
  ],
  [
    'lvl_p1',
    'f_fundamentals',
    14,
    'ينفذ حركات قاعدية مبنية على تكامل وظائف جسمه.',
    [
      'يتعرف على مختلف الحركات القاعدية والتنقلات.',
      'يوظف مختلف الحركات القاعدية عند التحول.',
      'يحترم وتائر الحركات ومسارات التحول.',
    ],
    ['المشي والجري حسب الوتيرة', 'التحول التدريجي والتنقل الجانبي والخلفي'],
  ],
  [
    'lvl_p1',
    'f_structuring',
    14,
    'يستغل فضاء الممارسة ومعالمه للتشكل والتنقل المنتظم.',
    [
      'يتعرف على فضاءات الممارسة وضوابطها ومختلف التشكيلات والتنقلات المنتظمة.',
      'يوظف فضاء الممارسة وفق معالمه وقواعده.',
      'يحافظ على فضاءات الممارسة.',
    ],
    ['أماكن الممارسة', 'حدود فضاء الممارسة ومشاركته', 'التشكيلات والتنقلات المنتظمة'],
  ],
  [
    'lvl_p2',
    'f_locomotion',
    15,
    'يعدل في الوقت المناسب وضعيته وتنقلاته من موقف إلى آخر.',
    [
      'يتعرف على الوضعيات والتنقلات والمواقف ومختلف التنظيمات.',
      'ينفذ الموقف بما يتماشى وإمكاناته الفردية في مختلف الوضعيات.',
      'يسهر على أمن وسلامة زملائه.',
    ],
    ['الوضعية المناسبة', 'التنقل المناسب', 'مواقف التنفيذ', 'التنظيم المكاني'],
  ],
  [
    'lvl_p2',
    'f_fundamentals',
    16,
    'ينفذ حركات طبيعية بسيطة في وضعيات مختلفة.',
    [
      'يتعرف على الحركات القاعدية الملائمة وتكامل عمل الأطراف في مختلف الوضعيات.',
      'يؤدي الحركات القاعدية الملائمة في مختلف الوضعيات.',
      'يسهر على أداء مختلف الحركات.',
    ],
    ['الحركات القاعدية في الوضعيات الطبيعية', 'تكامل الأطراف والحركات الملائمة'],
  ],
  [
    'lvl_p2',
    'f_structuring',
    16,
    'يحدد الأسلوب والفضاء المناسبين لاستعمال أداة.',
    [
      'يتعرف على الوسائل وكيفيات توظيفها وحفظها ومجالات استعمالها.',
      'يستخدم مختلف الوسائل بالكيفيات المناسبة ويحفظها.',
      'يصون الوسائل ويحفظها.',
    ],
    ['الوسائل', 'التسليم والاستلام', 'الرمي والدحرجة', 'حفظ الأدوات'],
  ],
  [
    'lvl_p3',
    'f_locomotion',
    17,
    'يركب جملة من العمليات وينفذها وفق ما يتطلبه الموقف.',
    [
      'يتعرف على كيفية الربط بين تدرج جملة من الحركات: الجري والرمي.',
      'يلتزم بالتعليمات والتوجيهات المناسبة عند الرمي والجري.',
      'يحترم التعليمات والتوجيهات المقدمة.',
    ],
    ['التدرج في الجري والرمي', 'تعليمات الأمن ومجال الرمي'],
  ],
  [
    'lvl_p3',
    'f_fundamentals',
    18,
    'ينجز حركات قاعدية متعلقة بالجري والرمي.',
    [
      'يتعرف على الحركات القاعدية حسب وتائرها والقواعد الأمنية.',
      'ينفذ الحركات القاعدية ويلتزم بالقواعد الأمنية.',
      'يحترم القواعد الأمنية.',
    ],
    ['وتائر الحركات القاعدية', 'مسارات الجري', 'أشكال الرمي', 'القواعد الأمنية'],
  ],
  [
    'lvl_p3',
    'f_structuring',
    18,
    'يبني تصرفاته القاعدية لتنظيم تدخلاته حسب الموقف.',
    [
      'يتعرف على التصرفات القاعدية وطرق التنقل بين المعالم والرمي وقواعد المنافسة المناسبة.',
      'يتنقل بين المعالم وفق قواعد المنافسة المناسبة.',
      'يلتزم بقواعد المنافسة.',
    ],
    [
      'التصرفات القاعدية المناسبة للموقف',
      'التنقل بين المعالم والرمي الموجه',
      'قواعد المنافسة والسلامة',
    ],
  ],
  [
    'lvl_p4',
    'f_locomotion',
    [19, 20],
    'ينجز مختلف الحركات فرديا وجماعيا ويحافظ على ترابطها.',
    [
      'يتعرف على وضعيات الجسم وعمل الأطراف ووتيرة الجري ضمن مجموعة.',
      'يضبط جسمه وعمل أطرافه وفق مختلف وضعيات التنقل.',
      'يتعايش مع المجموعة.',
    ],
    ['أشكال التنقل ووضعية الجسم وآلية الخطوة', 'الجري الأقصى والفردي والجماعي'],
  ],
  [
    'lvl_p4',
    'f_fundamentals',
    20,
    'يؤدي حركات قاعدية متعلقة بالوثب والرمي ويحافظ على تنسيق مراحلها وفق فضاء الممارسة المتاح.',
    [
      'يتعرف على أنماط الوثب والرمي والحركات القاعدية وضوابطها وفضاء الممارسة المتاح.',
      'يمارس أنماط الوثب والرمي والحركات القاعدية للجمباز.',
      'يلتزم بأخلاقيات الممارسة.',
    ],
    [
      'أنماط الوثب',
      'أشكال الرمي',
      'حركات الجمباز القاعدية',
      'حركات التوازن',
      'حركات الدوران والسقوط الآمن',
      'التدحرج',
    ],
  ],
  [
    'lvl_p4',
    'f_structuring',
    21,
    'يبني الحركات القاعدية التي تضمن مواجهة الموقف بما يتماشى وفضاء الممارسة.',
    [
      'يجند معارفه وقدرات جسمه للتنقل والرمي والوثب بما يتناسب وفضاء الممارسة.',
      'يستغل الفضاء المتاح للتنقل والرمي والوثب.',
      'يحترم ضوابط الممارسة في الفضاء المتاح.',
    ],
    ['علاقة التنقل بالفضاء المتاح', 'الرمي وضبط فضاء الممارسة', 'الوثب وضبط فضاء الممارسة'],
  ],
  [
    'lvl_p5',
    'f_locomotion',
    [22, 23],
    'ينجز مختلف الوضعيات والتنقلات في الرياضات الفردية والألعاب الجماعية محافظا على ترابطها، ويلائم وضعية جسمه حسب الموقف.',
    [
      'يتعرف على الوضعيات الملائمة للجسم في الجري والوثب والرمي وكيفيات تعديلها.',
      'يلائم وضعيات جسمه حسب مختلف المواقف.',
      'يتقيد بمختلف الوضعيات المناسبة حسب الموقف.',
    ],
    [
      'الوضعية الملائمة للجسم أثناء الجري والوثب والرمي',
      'تسلسل الدفع في الجري والوثب والرمي',
      'الانتقال المناسب لأسلوب الوثب أو الرمي',
    ],
  ],
  [
    'lvl_p5',
    'f_fundamentals',
    [23, 24],
    'ينجز حركات قاعدية متعلقة بالجري والوثب والرمي بطريقة سليمة.',
    [
      'يتعرف على الحركات القاعدية حسب وتائرها والقواعد الأمنية.',
      'ينفذ الحركات القاعدية ويلتزم بالقواعد الأمنية.',
      'يحترم القواعد الأمنية.',
    ],
    [
      'ديناميكية الجري القصير',
      'تقنية الوثب ومراحله',
      'تقنية الرمي ومراحله',
      'وثبات الجمباز',
      'حركات التوازن',
      'حركات الدوران',
      'التدحرج',
    ],
  ],
  [
    'lvl_p5',
    'f_structuring',
    24,
    'يمارس بعض الرياضات الجماعية وفق مبادئ اللعبة والتقنيات الأساسية.',
    [
      'يجند معارفه الأساسية المتعلقة ببعض الألعاب الجماعية ويتعرف على قواعدها.',
      'يوظف المفاهيم الأساسية للألعاب الجماعية ومبادئها الأولية.',
      'يحترم قواعد اللعب الجماعي الأساسية ومبادئه.',
    ],
    [
      'الألعاب الجماعية المصغرة وقواعدها',
      'المبادئ الأولية في التكتيك',
      'التمرير والمسك والمراوغة والتنقل والقذف',
    ],
  ],
];

const overallSpecs: Readonly<Record<OfficialCurriculumGradeId, readonly [number, string]>> = {
  lvl_p1: [
    13,
    'يقوم بحركات باتخاذ وضعيات وهيئات طبيعية بالتكامل بين مختلف الحركات القاعدية، مستغلا فضاء الممارسة ومعالمه.',
  ],
  lvl_p2: [
    15,
    'ينفذ حركات طبيعية وبسيطة في وضعيات وتنقلات متنوعة، ويعدلها حسب الموقف، محددا الأسلوب المناسب للفضاء المتاح.',
  ],
  lvl_p3: [17, 'يبني جملة من التصرفات القاعدية المتعلقة بالجري والرمي وينفذها حسب الموقف.'],
  lvl_p4: [
    19,
    'ينجز فرديا وجماعيا حركات قاعدية تتعلق بالوثب والرمي مبنية على وضعيات، محافظا على ترابطها بما يتماشى وفضاء الممارسة.',
  ],
  lvl_p5: [
    22,
    'ينجز عمليات فرديا وجماعيا مبنية على حركات قاعدية، ويحافظ على ترابطها، ويلائم وضعية جسمه بما يتوافق والوضعية المطروحة، ويمارس بعض الرياضات الجماعية.',
  ],
};

const componentId = (gradeId: string, domainId: string, index: number) =>
  `learning-section:${gradeId}:${domainId}:component:${index}`;

const makeCell = ([
  gradeId,
  domainId,
  sourcePage,
  text,
  components,
  groups,
]: CellSpec): OfficialGradeDomainCell => {
  const finalCompetencyId = `fc_${gradeId}_${domainId}`;
  const sourceHeading = `برنامج ${gradeId.replace('lvl_p', 'السنة ')} — ${domainLabels[domainId]}`;
  const source = { sourceDocument: SOURCE_DOCUMENT, sourcePage, sourceHeading } as const;
  const competencyComponents = components.map((componentText, index) => ({
    id: componentId(gradeId, domainId, index + 1),
    finalCompetencyId,
    gradeId,
    domainId,
    text: componentText,
    ...source,
    provenance: 'official_verbatim' as const,
  }));
  const resourceGroups: OfficialResourceGroup[] = groups.map((label, index) => ({
    id: `official-resource-group:${gradeId}:${domainId}:${index + 1}`,
    gradeId,
    domainId,
    finalCompetencyId,
    label,
    content: [label],
    ...source,
    provenance: 'official_structured_extraction',
  }));
  return {
    gradeId,
    domainId,
    domainLabel: domainLabels[domainId],
    finalCompetency: {
      id: finalCompetencyId,
      gradeId,
      domainId,
      text,
      ...source,
      provenance: 'official_verbatim',
    },
    competencyComponents,
    resourceGroups,
    source,
    provenance: 'official_structured_extraction',
    learningRequirementBasis: 'source_sufficient',
    objectiveBankReadiness: 'ready_with_reviewed_derivation',
  };
};

const cells = specs.map(makeCell);
const grades: OfficialCurriculumGrade[] = Object.entries(overallSpecs).map(
  ([rawGradeId, [sourcePage, text]]) => {
    const gradeId = rawGradeId as OfficialCurriculumGradeId;
    return {
      gradeId,
      overallCompetency: {
        id: `overall-competency:${gradeId}`,
        gradeId,
        text,
        sourceDocument: SOURCE_DOCUMENT,
        sourcePage,
        sourceHeading: `برنامج ${gradeId.replace('lvl_p', 'السنة ')}`,
        provenance: 'official_verbatim',
      },
      domains: cells.filter((cell) => cell.gradeId === gradeId),
    };
  }
);

const artifactContent = {
  curriculumSourceId: 'dz-primary-pe-2023',
  sourceVersion: '2023',
  sourceDocument: {
    id: SOURCE_DOCUMENT,
    title: 'منهاج التربية البدنية والرياضية لمرحلة التعليم الابتدائي 2023',
    repositoryPath: 'docs/EPS.pdf',
  },
  grades,
  evaluationFramework: {
    available: true,
    sourcePage: [27, 28],
    perCellCriteriaAvailable: false,
    perCellIndicatorsAvailable: false,
  },
  sessionSemantics: { formativeRegulationSupported: true, arenaSpexSequenceIsOfficial: false },
} as const;

export const OFFICIAL_CURRICULUM_2023: Readonly<OfficialCurriculumSourceArtifact> = deepFreeze({
  ...artifactContent,
  contentHash: computeCatalogHash(artifactContent),
});
