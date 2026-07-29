/**
 * SPEX - Initial Application State & Demo Data for Primary Education
 * بيانات أولية تفاعلية لتجربة جميع الأدوار: أستاذ الابتدائي، مفتش التربية البدنية ابتدائي، ومدير النظام
 */

import {
  User,
  Directorate,
  InspectionDistrict,
  DailyNotebookEntry,
  LessonPlan,
  CompetencyAssessmentSession,
  ClassRoom,
  Student,
  InspectorNote,
  InspectionVisit,
  AILog,
  AISetting,
  DistrictBroadcast,
  DirectChatMessage,
  WeeklyScheduleSlot,
  DistrictGroupMessage
} from '../types/spex';

// Educational Directorates Data according to official ministry structure
export const INITIAL_DIRECTORATES: Directorate[] = [
  {
    id: 'setif_de',
    name: 'مديرية التربية لولاية سطيف',
    wilaya: 'سطيف',
    code: '19',
    isActiveWithData: true,
    districts: [
      { id: 'dist_setif_1', directorateId: 'setif_de', districtNumber: 1, name: 'المقاطعة 01 - سطيف شرق', inspectorId: 'insp_01', inspectorName: 'أمهاتة العيفة' },
      { id: 'dist_setif_2', directorateId: 'setif_de', districtNumber: 2, name: 'المقاطعة 02 - سطيف غرب', inspectorId: 'insp_02', inspectorName: 'عباوي ابراهيم' },
      { id: 'dist_setif_3', directorateId: 'setif_de', districtNumber: 3, name: 'المقاطعة 03 - العلمة 1', inspectorId: 'insp_03', inspectorName: 'عيساوي فضيل' },
      { id: 'dist_setif_4', directorateId: 'setif_de', districtNumber: 4, name: 'المقاطعة 04 - العلمة 2', inspectorId: 'insp_04', inspectorName: 'آيت علي سليمان رابح' },
      { id: 'dist_setif_5', directorateId: 'setif_de', districtNumber: 5, name: 'المقاطعة 05 - عين ولمان', inspectorId: 'insp_05', inspectorName: 'زراري عبد الرحمان' },
      { id: 'dist_setif_6', directorateId: 'setif_de', districtNumber: 6, name: 'المقاطعة 06 - بوقاعة', inspectorId: 'insp_06', inspectorName: 'صحنان عبد العزيز' },
      { id: 'dist_setif_7', directorateId: 'setif_de', districtNumber: 7, name: 'المقاطعة 07 - عين أزال', inspectorId: 'usr_inspector_1', inspectorName: 'رواق مصطفى' },
      { id: 'dist_setif_8', directorateId: 'setif_de', districtNumber: 8, name: 'المقاطعة 08 - عين الكبيرة', inspectorId: 'insp_08', inspectorName: 'رياحي كريم' },
      { id: 'dist_setif_9', directorateId: 'setif_de', districtNumber: 9, name: 'المقاطعة 09 - بني ورتيلان', inspectorId: 'insp_09', inspectorName: 'مداني عمار' }
    ]
  },
  {
    id: 'other_directorates',
    name: 'باقي مديريات التربية (57 مديرية أخرى)',
    isActiveWithData: false,
    note: 'قيد التحديث لاحقاً',
    districts: []
  }
];

export const INITIAL_DISTRICTS: InspectionDistrict[] = INITIAL_DIRECTORATES[0].districts || [];

// Current Demo Users tailored for District 07 - Ain Azel, Setif (Teachers + Inspector + Admin)
export const DEMO_USERS: User[] = [
  // 1. Primary Teachers (Ain Azel)
  {
    id: 'usr_teacher_1',
    username: 'abdelmalek_nabti',
    spexId: 'SPX-8K31H2',
    firstName: 'عبد المالك',
    lastName: 'نابتي',
    email: 'abdelmalek.nabti@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0661234567',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_1',
    schoolName: 'مدرسة الشهيد بالخيري عبد القادر',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 9,
    bio: 'أستاذ تربية بدنية ورياضية بالطور الابتدائي، مهتم بتطوير مهارات الحركة والألعاب التربوية الجماعية وفق المنهاج الوزاري.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    followingIds: ['usr_teacher_2', 'usr_teacher_3', 'usr_inspector_1'],
    followersIds: ['usr_teacher_2', 'usr_teacher_4', 'usr_teacher_5'],
    publishedResourcesCount: 14,
    approvedResourcesCount: 9,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_2',
    username: 'issam_boucharaba',
    spexId: 'SPX-2M94B1',
    firstName: 'عصام',
    lastName: 'بوشرابة',
    email: 'issam.boucharaba@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0661889900',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_1',
    schoolName: 'مدرسة الشهيد بالخيري عبد القادر',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 6,
    bio: 'متخصص في الألعاب البيداغوجية والتحفيز الحركي المبكر لتلاميذ السنوات الأولى من التعليم الابتدائي.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    followingIds: ['usr_teacher_1'],
    followersIds: ['usr_teacher_1'],
    publishedResourcesCount: 8,
    approvedResourcesCount: 5,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_3',
    username: 'ahmed_gharabsi',
    spexId: 'SPX-7P15C3',
    firstName: 'احمد',
    lastName: 'قرابسي',
    email: 'ahmed.gharabsi@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0552112233',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_2',
    schoolName: 'مدرسة الشهيد بلعياطي زبير',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 11,
    bio: 'بحث وتطوير وضعيات التقييم المعياري وإعداد المذكرات النموذجية للمقاطعات التفتيشية.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    followingIds: ['usr_teacher_1', 'usr_teacher_2'],
    followersIds: ['usr_teacher_1'],
    publishedResourcesCount: 19,
    approvedResourcesCount: 15,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_4',
    username: 'ghaith_bounagab',
    spexId: 'SPX-4X92K8',
    firstName: 'غيث',
    lastName: 'بونقاب',
    email: 'ghaith.bounagab@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0663445566',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_3',
    schoolName: 'مدرسة المجاهد لخضر بوعود',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 7,
    bio: 'مهتم بتنظيم الأندية التربوية (نادي أ ونادي ب) والأنشطة المدرسية اللاصفية.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    followingIds: ['usr_teacher_1'],
    followersIds: [],
    publishedResourcesCount: 6,
    approvedResourcesCount: 4,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_5',
    username: 'mohamed_lamara',
    spexId: 'SPX-5T63L1',
    firstName: 'محمد',
    lastName: 'لعمارة',
    email: 'mohamed.lamara@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0771223344',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_1',
    schoolName: 'مدرسة الشهيد بالخيري عبد القادر',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 5,
    bio: 'شغوف بتوظيف الوسائل الحديثة والحلول البيداغوجية الرقمية في تدريس مادة التربية البدنية.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=250',
    followingIds: ['usr_teacher_1'],
    followersIds: [],
    publishedResourcesCount: 4,
    approvedResourcesCount: 3,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_6',
    username: 'almadani_letim',
    spexId: 'SPX-9W28M4',
    firstName: 'المدني',
    lastName: 'ليتيم',
    email: 'almadani.letim@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0665554433',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_2',
    schoolName: 'مدرسة الشهيد بلعياطي زبير',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 8,
    bio: 'متابع ومساهم في إثراء البنك البيداغوجي وتوليد الألعاب المهارية الموجهة.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=250',
    followingIds: [],
    followersIds: [],
    publishedResourcesCount: 7,
    approvedResourcesCount: 5,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_7',
    username: 'abdelrazak_rebai',
    spexId: 'SPX-3R81N7',
    firstName: 'عبد الرزاق',
    lastName: 'ربعي',
    email: 'abdelrazak.rebai@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0778889900',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_3',
    schoolName: 'مدرسة المجاهد لخضر بوعود',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 10,
    bio: 'تطوير أداء الألعاب الجماعية والتكيف مع الظروف المناخية في المدارس الابتدائية.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250',
    followingIds: [],
    followersIds: [],
    publishedResourcesCount: 11,
    approvedResourcesCount: 8,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_8',
    username: 'oussama_belhout',
    spexId: 'SPX-1Q45P2',
    firstName: 'اسامة',
    lastName: 'بلحوت',
    email: 'oussama.belhout@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0559998877',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    institutionId: 'inst_ainazel_1',
    schoolName: 'مدرسة الشهيد بالخيري عبد القادر',
    municipality: 'عين أزال',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 4,
    bio: 'أستاذ حديث التعيين شغوف بالتعلم ومشاركة المذكرات البيداغوجية مع المجتمع المهني.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
    followingIds: [],
    followersIds: [],
    publishedResourcesCount: 3,
    approvedResourcesCount: 2,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },
  {
    id: 'usr_teacher_out_district',
    username: 'kamal_brahimi',
    spexId: 'SPX-6V74Q9',
    firstName: 'كمال',
    lastName: 'براهيمي',
    email: 'kamal.brahimi@spex.dz',
    password: '12345678',
    role: 'teacher',
    phone: '0661122334',
    directorateId: 'setif_de',
    districtId: 'dist_setif_1', // المقاطعة 01 - سطيف شرق (مقاطعة مختلفة)
    institutionId: 'inst_setif_east_1',
    schoolName: 'مدرسة مالك بن نبي (سطيف شرق)',
    municipality: 'سطيف',
    specialization: 'أستاذ التربية البدنية والرياضية - الطور الابتدائي',
    cycle: 'ابتدائي',
    yearsExperience: 12,
    bio: 'أستاذ من المقاطعة 01 سطيف شرق، مهتم بالتواصل والتبادل البيداغوجي عبر المجتمع المهني الرقمي.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
    followingIds: [],
    followersIds: [],
    publishedResourcesCount: 15,
    approvedResourcesCount: 12,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },

  // 2. Inspector Account (Inspector Rewaq Mostefa - District 07 Ain Azel, Setif)
  {
    id: 'usr_inspector_1',
    username: 'inspector_rewaq',
    spexId: 'SPX-0I11R5',
    firstName: 'مصطفى',
    lastName: 'رواق',
    email: 'inspector.rewaq@spex.dz',
    password: '12345678',
    role: 'inspector',
    phone: '0550987654',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    schoolName: 'مفتشية التربية والتعليم الابتدائي',
    municipality: 'عين أزال - سطيف',
    specialization: 'مفتش التربية البدنية والرياضية للتعليم الابتدائي - المقاطعة 07 عين أزال (سطيف)',
    yearsExperience: 24,
    bio: 'مفتش إدارة ومتابعة بيداغوجية لمادة التربية البدنية والرياضية بالمقاطعة 07 عين أزال - ولاية سطيف.',
    status: 'active',
    isApprovedByAdmin: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
    followingIds: ['usr_teacher_1', 'usr_teacher_2', 'usr_teacher_3'],
    followersIds: ['usr_teacher_1', 'usr_teacher_2', 'usr_teacher_3', 'usr_teacher_4'],
    publishedResourcesCount: 35,
    approvedResourcesCount: 35,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  },

  // 3. System Admin Account
  {
    id: 'usr_admin_1',
    username: 'admin_spex',
    spexId: 'SPX-99ADMIN',
    firstName: 'مشرف',
    lastName: 'عين أزال الرقمي',
    email: 'admin@spex.dz',
    password: '12345678',
    role: 'admin',
    phone: '0550001122',
    directorateId: 'setif_de',
    districtId: 'dist_setif_7',
    schoolName: 'مديرية التربية لولاية سطيف',
    municipality: 'سطيف / عين أزال',
    specialization: 'مشرف المنظومة الرقمية - المقاطعة 07 عين أزال ولاية سطيف',
    yearsExperience: 15,
    bio: 'إدارة وتأطير المنظومة الرقمية الذكية SPEX وإدارة حسابات الأساتذة والمفتشين.',
    status: 'active',
    isApprovedByAdmin: true,
    followingIds: [],
    followersIds: [],
    publishedResourcesCount: 50,
    approvedResourcesCount: 50,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  }
];

export const INITIAL_BROADCASTS: DistrictBroadcast[] = [
  {
    id: 'bc_1',
    inspectorId: 'usr_inspector_1',
    inspectorName: 'المفتش مصطفى رواق',
    districtId: 'dist_setif_7',
    title: 'دعوة لحضور الندوة البيداغوجية الافتتاحية لمفتشية المقاطعة 07 - عين أزال',
    content: 'نهيب بجميع أساتذة التربية البدنية والرياضية للتعليم الابتدائي بالمقاطعة 07 (عين أزال) الحضور للندوة البيداغوجية يوم الخميس القادم لمناقشة آليات تنفيذ الدفاتر البيداغوجية الرقمية والمنهاج الوزاري.',
    category: 'دعوة_اجتماع',
    createdAt: '2026-07-25T09:00:00Z'
  },
  {
    id: 'bc_2',
    inspectorId: 'usr_inspector_1',
    inspectorName: 'المفتش مصطفى رواق',
    districtId: 'dist_setif_7',
    title: 'توجيه بيداغوجي: تفعيل دفتر البلديات التربوية وإعفاءات التربية البدنية',
    content: 'نرجو من جميع الأساتذة الحرص على تقسيم تلاميذ كل قسم إلى ناديين أ و ب (البلدية التربوية)، وتسجيل الشهادات الطبية بالدفتر المخصص لذلك.',
    category: 'توجيه_بيداغوجي',
    createdAt: '2026-07-24T14:30:00Z'
  }
];

export const INITIAL_DIRECT_MESSAGES: DirectChatMessage[] = [
  {
    id: 'msg_1',
    senderId: 'usr_inspector_1',
    senderName: 'المفتش مصطفى رواق',
    senderRole: 'inspector',
    receiverId: 'usr_teacher_1',
    receiverName: 'عبد المالك نابتي',
    districtId: 'dist_setif_7',
    message: 'السلام عليكم أستاذ عبد المالك، كيف تسير تحضيرات المخطط السنوي وبناء التعلمات في مدرسة بالخيري عبد القادر؟',
    createdAt: '2026-07-25T10:00:00Z',
    read: true
  },
  {
    id: 'msg_2',
    senderId: 'usr_teacher_1',
    senderName: 'عبد المالك نابتي',
    senderRole: 'teacher',
    receiverId: 'usr_inspector_1',
    receiverName: 'المفتش مصطفى رواق',
    districtId: 'dist_setif_7',
    message: 'وعليكم السلام والرحمة سيدي المفتش. جميع المذكرات والكراس اليومي جاهزة ومحينة بالمنظومة الرقمية.',
    createdAt: '2026-07-25T10:15:00Z',
    read: true
  }
];

// Initial Classes for Primary Education (الأقسام الابتدائية بمدرسة الشهيد بالخيري عبد القادر - عين أزال)
export const INITIAL_CLASSES: ClassRoom[] = [
  { id: 'cls_1', institutionId: 'inst_ainazel_1', teacherId: 'usr_teacher_1', levelId: 'lvl_p1', name: '1 ابتدائي 1', studentCount: 28 },
  { id: 'cls_2', institutionId: 'inst_ainazel_1', teacherId: 'usr_teacher_1', levelId: 'lvl_p2', name: '2 ابتدائي 1', studentCount: 26 },
  { id: 'cls_3', institutionId: 'inst_ainazel_1', teacherId: 'usr_teacher_1', levelId: 'lvl_p3', name: '3 ابتدائي 1', studentCount: 30 },
  { id: 'cls_4', institutionId: 'inst_ainazel_1', teacherId: 'usr_teacher_1', levelId: 'lvl_p4', name: '4 ابتدائي 1', studentCount: 27 },
  { id: 'cls_5', institutionId: 'inst_ainazel_1', teacherId: 'usr_teacher_1', levelId: 'lvl_p5', name: '5 ابتدائي 1', studentCount: 29 },
];

// Initial Primary Students (قائمة تلاميذ الابتدائي للتقويم لجميع المستويات من س1 إلى س5)
export const INITIAL_STUDENTS: Student[] = [
  // 1 ابتدائي
  { id: 'std_1', classId: 'cls_1', firstName: 'أيوب', lastName: 'زياني', gender: 'ذكر', registrationNumber: '2025/101' },
  { id: 'std_2', classId: 'cls_1', firstName: 'سارة', lastName: 'حمودي', gender: 'أنثى', registrationNumber: '2025/102' },
  { id: 'std_3', classId: 'cls_1', firstName: 'محمد إسلام', lastName: 'طاهري', gender: 'ذكر', registrationNumber: '2025/103' },
  { id: 'std_4', classId: 'cls_1', firstName: 'ياسمين', lastName: 'بن خالد', gender: 'أنثى', registrationNumber: '2025/104' },
  { id: 'std_5', classId: 'cls_1', firstName: 'عمر', lastName: 'قادري', gender: 'ذكر', registrationNumber: '2025/105' },
  { id: 'std_6', classId: 'cls_1', firstName: 'نسرين', lastName: 'شريفي', gender: 'أنثى', registrationNumber: '2025/106' },
  { id: 'std_7', classId: 'cls_1', firstName: 'حمزة', lastName: 'بوعزيز', gender: 'ذكر', registrationNumber: '2025/107' },
  { id: 'std_8', classId: 'cls_1', firstName: 'مريم', lastName: 'بلقاسم', gender: 'أنثى', registrationNumber: '2025/108' },

  // 2 ابتدائي
  { id: 'std_201', classId: 'cls_2', firstName: 'أحمد', lastName: 'سليماني', gender: 'ذكر', registrationNumber: '2025/201' },
  { id: 'std_202', classId: 'cls_2', firstName: 'فاطمة', lastName: 'عثماني', gender: 'أنثى', registrationNumber: '2025/202' },
  { id: 'std_203', classId: 'cls_2', firstName: 'يوسف', lastName: 'رحموني', gender: 'ذكر', registrationNumber: '2025/203' },
  { id: 'std_204', classId: 'cls_2', firstName: 'خديجة', lastName: 'مرابط', gender: 'أنثى', registrationNumber: '2025/204' },
  { id: 'std_205', classId: 'cls_2', firstName: 'إبراهيم', lastName: 'شرفي', gender: 'ذكر', registrationNumber: '2025/205' },
  { id: 'std_206', classId: 'cls_2', firstName: 'آية', lastName: 'بوعلام', gender: 'أنثى', registrationNumber: '2025/206' },

  // 3 ابتدائي
  { id: 'std_301', classId: 'cls_3', firstName: 'عبد الرؤوف', lastName: 'بن ناصر', gender: 'ذكر', registrationNumber: '2025/301' },
  { id: 'std_302', classId: 'cls_3', firstName: 'منار', lastName: 'قواسمي', gender: 'أنثى', registrationNumber: '2025/302' },
  { id: 'std_303', classId: 'cls_3', firstName: 'أمين', lastName: 'سعايدية', gender: 'ذكر', registrationNumber: '2025/303' },
  { id: 'std_304', classId: 'cls_3', firstName: 'هدى', lastName: 'بوجمعة', gender: 'أنثى', registrationNumber: '2025/304' },
  { id: 'std_305', classId: 'cls_3', firstName: 'صهيب', lastName: 'زروال', gender: 'ذكر', registrationNumber: '2025/305' },
  { id: 'std_306', classId: 'cls_3', firstName: 'إكرام', lastName: 'حداد', gender: 'أنثى', registrationNumber: '2025/306' },

  // 4 ابتدائي
  { id: 'std_401', classId: 'cls_4', firstName: 'زكرياء', lastName: 'بوطابة', gender: 'ذكر', registrationNumber: '2025/401' },
  { id: 'std_402', classId: 'cls_4', firstName: 'منى', lastName: 'عمراوي', gender: 'أنثى', registrationNumber: '2025/402' },
  { id: 'std_403', classId: 'cls_4', firstName: 'إياد', lastName: 'خليل', gender: 'ذكر', registrationNumber: '2025/403' },
  { id: 'std_404', classId: 'cls_4', firstName: 'سلسيل', lastName: 'بن سعيد', gender: 'أنثى', registrationNumber: '2025/404' },
  { id: 'std_405', classId: 'cls_4', firstName: 'معاذ', lastName: 'براهيمي', gender: 'ذكر', registrationNumber: '2025/405' },
  { id: 'std_406', classId: 'cls_4', firstName: 'نور الهدى', lastName: 'مزاهي', gender: 'أنثى', registrationNumber: '2025/406' },

  // 5 ابتدائي
  { id: 'std_501', classId: 'cls_5', firstName: 'عبد الجليل', lastName: 'سطيفي', gender: 'ذكر', registrationNumber: '2025/501' },
  { id: 'std_502', classId: 'cls_5', firstName: 'رتاج', lastName: 'بن شريف', gender: 'أنثى', registrationNumber: '2025/502' },
  { id: 'std_503', classId: 'cls_5', firstName: 'سيف الدين', lastName: 'مباركي', gender: 'ذكر', registrationNumber: '2025/503' },
  { id: 'std_504', classId: 'cls_5', firstName: 'أريج', lastName: 'مداني', gender: 'أنثى', registrationNumber: '2025/504' },
  { id: 'std_505', classId: 'cls_5', firstName: 'إلياس', lastName: 'منصوري', gender: 'ذكر', registrationNumber: '2025/505' },
  { id: 'std_506', classId: 'cls_5', firstName: 'أنفال', lastName: 'بلعربي', gender: 'أنثى', registrationNumber: '2025/506' },
];

// Initial Daily Notebook Entries for Primary School PE (الكراس اليومي - فارغ للتجربة والتدريب)
export const INITIAL_DAILY_NOTEBOOK: DailyNotebookEntry[] = [];

// Initial Sample Lesson Plan for Primary Education PE (مذكرات الحصص - فارغة للتجربة والتدريب)
export const INITIAL_LESSON_PLANS: LessonPlan[] = [];

// Initial Competency Assessment Session (جلسات تقييم الكفاءات - فارغة للتجربة والتدريب)
export const INITIAL_ASSESSMENT_SESSIONS: CompetencyAssessmentSession[] = [];

// Initial Inspector Notes (توجيهات وإشعارات المفتش البيداغوجي للابتدائي)
export const INITIAL_INSPECTOR_NOTES: InspectorNote[] = [
  {
    id: 'note_1',
    inspectorId: 'usr_inspector_1',
    inspectorName: 'المفتش مصطفى رواق',
    teacherId: 'usr_teacher_1',
    teacherName: 'عبد المالك نابتي',
    moduleRef: 'lesson_plan',
    title: 'توجيه بيداغوجي حول ملاءمة الألعاب التمهيدية لسن تلاميذ الابتدائي',
    content: 'أستاذ عبد المالك، لوحظ تحكم ممتاز في إعداد مذكرة الحصة، نوصي باستمرار استخدام الأقماع الملونة والكرات الإسفنجية الخفيفة لرفع جاذبية التعلم لدى أطفال المرحلة الابتدائية.',
    priority: 'هام',
    status: 'جديدة',
    createdAt: '2026-07-23T10:15:00Z',
    updatedAt: '2026-07-23T10:15:00Z'
  },
  {
    id: 'note_2',
    inspectorId: 'usr_inspector_1',
    inspectorName: 'المفتش مصطفى رواق',
    teacherId: 'usr_teacher_1',
    teacherName: 'عبد المالك نابتي',
    moduleRef: 'seminar_invitation',
    title: 'دعوة رسمية لحضور ندوة تربوية حول المناهج الحديثة في التربية البدنية',
    content: 'يشرفنا دعوتكم لحضور الندوة التربوية المقررة يوم الخميس القادم بمجمع الابتدائيات، للتكفل بالمستجدات البيداغوجية وطرق تقويم الكفاءات الختامية.',
    priority: 'مستعجل',
    status: 'جديدة',
    createdAt: '2026-07-24T09:00:00Z',
    updatedAt: '2026-07-24T09:00:00Z'
  },
  {
    id: 'note_3',
    inspectorId: 'usr_inspector_1',
    inspectorName: 'المفتش مصطفى رواق',
    teacherId: 'usr_teacher_1',
    teacherName: 'عبد المالك نابتي',
    moduleRef: 'visit_alert',
    title: 'تنبيه بزيارة تفقدية وتوجيهية مرتقبة',
    content: 'ننهي إلى علمكم أنه تم برمجت زيارة تفقدية لبحث سيرورة الكراس اليومي وتطبيق المخطط السنوي لبناء التعلمات خلال الأسبوع المقبل.',
    priority: 'هام',
    status: 'جديدة',
    createdAt: '2026-07-24T11:30:00Z',
    updatedAt: '2026-07-24T11:30:00Z'
  }
];

// Initial Inspection Visit Logs
export const INITIAL_INSPECTION_VISITS: InspectionVisit[] = [
  {
    id: 'visit_1',
    inspectorId: 'usr_inspector_1',
    teacherId: 'usr_teacher_1',
    institutionId: 'inst_1',
    visitDate: '2026-07-15',
    visitType: 'متابعة دورية',
    lessonObservedTitle: 'الألعاب الحركية والجري السريع الموجه',
    pedagogicalGrade: 17.0,
    positivePoints: [
      'تحكم عالي في ضبط التلاميذ في ساحة المدرسة الابتدائي',
      'استخدام وسائل إيضاح وأقماع ملونة ممتعة للأطفال',
      'التأكيد الدائم على قواعد السلامة والأمان'
    ],
    areasForImprovement: [
      'تنويع زوايا الوقوف أثناء إعطاء التعليمات الصوتية للأطفال',
      'زيادة تشجيع التلاميذ الخجولين حركياً'
    ],
    recommendations: [
      'مواصلة اعتماد منصة SPEX لتنظيم الكراس اليومي وتوليد مذكرات الابتدائي'
    ],
    officialReportGenerated: true
  }
];

// Initial AI Settings
export const INITIAL_AI_SETTINGS: AISetting = {
  provider: 'gemini',
  activeModel: 'gemini-3.6-flash',
  apiKeyConfigured: true,
  temperature: 0.7,
  maxTokens: 2048,
  dailyQuotaLimit: 100,
  dailyQuotaUsed: 14,
  systemPromptPreset: 'أنت مساعد تربوي متخصص حصرياً في منهاج التربية البدنية والرياضية للطور الابتدائي بوزارة التربية الوطنية الجزائرية.'
};

// Initial AI Logs
export const INITIAL_AI_LOGS: AILog[] = [
  {
    id: 'ailog_1',
    timestamp: '2026-07-24T11:20:00Z',
    userId: 'usr_teacher_1',
    userName: 'أحمد بن علي',
    provider: 'Google Gemini',
    model: 'gemini-2.5-flash',
    module: 'توليد مذكرة حصة',
    promptSummary: 'توليد مذكرة للألعاب الحركية والتوافق الحركي لمستوى 1 ابتدائي',
    tokensUsed: 1120,
    responseTimeMs: 780,
    status: 'success'
  }
];

// Initial Weekly Schedule (التوزيع الأسبوعي للحصص لاستعمال الزمن)
export const INITIAL_WEEKLY_SCHEDULE: WeeklyScheduleSlot[] = [
  {
    id: 'ws_1',
    teacherId: 'usr_teacher_1',
    day: 'الأحد',
    timeSlot: '08:00 - 09:00',
    classId: 'cls_1',
    className: '1 إبتدائي أ',
    fieldId: 'field_physical',
    fieldName: 'الميدان البدني (التنقلات والتعادل)',
    sessionTitle: 'حصة اللياقة والتوافق الحركي 01',
    venue: 'ساحة الرياضة الرئيسية'
  },
  {
    id: 'ws_2',
    teacherId: 'usr_teacher_1',
    day: 'الأحد',
    timeSlot: '10:00 - 11:00',
    classId: 'cls_2',
    className: '2 إبتدائي ب',
    fieldId: 'field_team',
    fieldName: 'الميدان الجماعي (تمرير واستقبال)',
    sessionTitle: 'حصة الألعاب الجماعية التمهيدية 02',
    venue: 'الملعب المعشب'
  },
  {
    id: 'ws_3',
    teacherId: 'usr_teacher_1',
    day: 'الإثنين',
    timeSlot: '09:00 - 10:00',
    classId: 'cls_3',
    className: '3 إبتدائي أ',
    fieldId: 'field_individual',
    fieldName: 'الميدان الفردي (الوثب والجري)',
    sessionTitle: 'حصة الجري السريع وتغيير الاتجاه 01',
    venue: 'ساحة الرياضة الرئيسية'
  },
  {
    id: 'ws_4',
    teacherId: 'usr_teacher_1',
    day: 'الإثنين',
    timeSlot: '14:00 - 15:00',
    classId: 'cls_4',
    className: '4 إبتدائي ج',
    fieldId: 'field_team',
    fieldName: 'الميدان الجماعي (ألعاب كرة اليد المصغرة)',
    sessionTitle: 'حصة التصويب المباشر نحو الهدف 03',
    venue: 'الملعب المعشب'
  },
  {
    id: 'ws_5',
    teacherId: 'usr_teacher_1',
    day: 'الثلاثاء',
    timeSlot: '08:00 - 09:00',
    classId: 'cls_5',
    className: '5 إبتدائي أ',
    fieldId: 'field_physical',
    fieldName: 'الميدان البدني (المرونة والمطاولة)',
    sessionTitle: 'حصة التحمل الدوري التنفسي 04',
    venue: 'ساحة الرياضة الرئيسية'
  },
  {
    id: 'ws_6',
    teacherId: 'usr_teacher_1',
    day: 'الأربعاء',
    timeSlot: '10:00 - 11:00',
    classId: 'cls_1',
    className: '1 إبتدائي أ',
    fieldId: 'field_physical',
    fieldName: 'الميدان البدني (التنقلات والتعادل)',
    sessionTitle: 'حصة التوازن والثبات الحركي 02',
    venue: 'ساحة الرياضة المغطاة'
  },
  {
    id: 'ws_7',
    teacherId: 'usr_teacher_1',
    day: 'الخميس',
    timeSlot: '09:00 - 10:00',
    classId: 'cls_2',
    className: '2 إبتدائي ب',
    fieldId: 'field_team',
    fieldName: 'الميدان الجماعي',
    sessionTitle: 'حصة المنافسة والتعاون الجماعي 03',
    venue: 'الملعب المعشب'
  }
];

export const INITIAL_DISTRICT_GROUP_MESSAGES: DistrictGroupMessage[] = [
  {
    id: 'dgm_1',
    districtId: 'dist_setif_7',
    senderId: 'usr_teacher_2',
    senderName: 'عصام بوشرابة',
    senderSchool: 'مدرسة بالخيري عبد القادر - عين أزال',
    senderRole: 'teacher',
    message: 'السلام عليكم زملائي أساتذة التربية البدنية بمقاطعة عين أزال. هل قنتم بتنظيم ورشات الجري السريع للميدان البدني للجيل الثاني؟',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    likesCount: 4
  },
  {
    id: 'dgm_2',
    districtId: 'dist_setif_7',
    senderId: 'usr_teacher_3',
    senderName: 'احمد قرابسي',
    senderSchool: 'مدرسة بلعياطي زبير - عين أزال',
    senderRole: 'teacher',
    message: 'وعليكم السلام أستاذ عصام. نعم قمنا ببرمجة الورشات وفق التدرج الوزاري واستعمال الأقماع الملونة والعلامات الأرضية.',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    likesCount: 6
  },
  {
    id: 'dgm_3',
    districtId: 'dist_setif_7',
    senderId: 'usr_inspector_1',
    senderName: 'أ. مصطفى رواق (مفتش المقاطعة)',
    senderSchool: 'مفتشية التربية والتعليم - المقاطعة 07',
    senderRole: 'inspector',
    message: 'تحياتي البيداغوجية لكافة أساتذة المقاطعة. أذكركم بأهمية توثيق المذكرات واستعمال شبكات التقييم المعيارية لتقويم الكفاءات الختامية عبر منصة SPEX.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    likesCount: 9
  },
  {
    id: 'dgm_4',
    districtId: 'dist_setif_7',
    senderId: 'usr_teacher_1',
    senderName: 'عبد المالك نابتي',
    senderSchool: 'مدرسة بالخيري عبد القادر - عين أزال',
    senderRole: 'teacher',
    message: 'شكراً لكم أستاذنا المفتش. تم تحديث التوزيع الأسبوعي والكراس اليومي وتوليد المذكرات البيداغوجية بنجاح.',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    likesCount: 5
  }
];

