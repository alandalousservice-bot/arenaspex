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

// Production Users tailored for SPEX Platform launch (System Admin account only)
export const DEMO_USERS: User[] = [
  // Platform Admin Account
  {
    id: 'usr_admin_1',
    username: 'admin_spex',
    spexId: 'SPX-99ADMIN',
    firstName: 'مشرف',
    lastName: 'المنظومة الرقمية',
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
    publishedResourcesCount: 0,
    approvedResourcesCount: 0,
    privacySettings: {
      whoCanFollow: 'everyone',
      whoCanMessage: 'everyone',
      showInSearch: true,
      showPersonalInfo: true
    }
  }
];

export const INITIAL_BROADCASTS: DistrictBroadcast[] = [];

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
export const INITIAL_INSPECTOR_NOTES: InspectorNote[] = [];

// Initial Inspection Visit Logs
export const INITIAL_INSPECTION_VISITS: InspectionVisit[] = [];

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

