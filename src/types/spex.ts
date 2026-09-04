/**
 * SPEX - Sports Physical Education eXpert Platform
 * Data Models & Type Definitions
 */

export type UserRole = 'teacher' | 'inspector' | 'director' | 'admin';
export type AIMode = 'official_curriculum' | 'ai_suggested' | 'teacher_personal';

// Profile for Generation Services
export interface GenerationProfile {
  userId: string;
  isEnabled: boolean; // تفعيل الخدمة للمستخدم من قبل الإدارة
  dailyLimit: number; // الحد اليومي للطلبات
  monthlyLimit: number; // الحد الشهري للطلبات
  usedDaily: number;
  usedMonthly: number;
  lastUsedDate?: string;
}

// Lesson Command Center Session Timing Settings
export interface LessonSessionTiming {
  preparationMinutes: number; // default 10
  situation1Minutes: number; // default 20
  situation2Minutes: number; // default 20
  finalMinutes: number; // default 10
  alertBeforeStart10Min: boolean; // default true
  alertBeforeStart5Min: boolean; // default true
  alertNoPlan: boolean; // default true
  soundEnabled: boolean; // default true
  vibrationEnabled: boolean; // default true
  voiceAnnouncements: boolean; // default true — إعلانات صوتية بالعربية عند تغيير المراحل
  autoLogToNotebook: boolean; // default true
}

// Ongoing / Scheduled Lesson Session for Command Center & Floating Overlay
export interface LessonSession {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  sessionTitle: string;
  lessonPlanId?: string;
  classPlannedSessionId?: string;
  academicYearId?: string;
  educationalObjective: string;
  currentGameOrSituationTitle?: string;
  preparationObjective?: string;
  situation1Title?: string;
  situation1Description?: string;
  situation2Title?: string;
  situation2Description?: string;
  finalObjective?: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  currentPhase: 'preparation' | 'situation1' | 'situation2' | 'final';
  phaseRemainingSeconds: number;
  totalElapsedSeconds: number;
  phaseDurations: {
    preparation: number; // in seconds
    situation1: number;
    situation2: number;
    final: number;
  };
  actualPhaseSpent: {
    preparation: number;
    situation1: number;
    situation2: number;
    final: number;
  };
  startedAt?: string;
  completedAt?: string;
  isPaused?: boolean;
  contingencyMode?: 'normal' | 'hot_weather' | 'equipment_shortage' | 'high_fatigue';
}

export interface LessonExecutionLog {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  lessonPlanTitle: string;
  date: string;
  actualStartTime: string;
  actualEndTime: string;
  totalDurationMinutes: number;
  phaseDurations: {
    preparation: number;
    situation1: number;
    situation2: number;
    final: number;
  };
  delaysOrOverrunsMinutes: number;
  completionStatus: 'منجزة في الوقت' | 'تأخير بسيط' | 'تجاوز زمني';
  notes?: string;
  studentRatings?: Record<string, string[]>;
  paceAnalysis?: string;
  overruns?: Array<{ phase: string; minutes: number }>;
  contingencyMode?: 'normal' | 'hot_weather' | 'equipment_shortage' | 'high_fatigue';
  attendanceData?: {
    total: number;
    present: number;
    absent: number;
    exempt: number;
  };
}

// Personal Objective Copies Created by Teachers
export interface PersonalObjective {
  id: string;
  officialObjectiveId: string;
  teacherId: string;
  customTitle: string;
  customActionVerb: string;
  fieldId: string;
  levelId: string;
  createdAt: string;
  updatedAt: string;
}

// National Pedagogical Resource Submissions (From Teacher Library to Inspector Approval)
export interface NationalResourceSubmission {
  id: string;
  personalLibraryItemId: string;
  teacherId: string;
  teacherName: string;
  districtId: string;
  title: string;
  category: 'game' | 'situation' | 'indicator' | 'note';
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  inspectorId?: string;
  inspectorFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface UserPrivacySettings {
  whoCanFollow: 'everyone' | 'approved_only';
  whoCanMessage: 'everyone' | 'following_only' | 'nobody';
  showInSearch: boolean;
  showPersonalInfo: boolean;
}

export interface User {
  id: string;
  username: string; // المعرّف الفريد للبحث الحصري (@username)
  spexId: string; // معرف ثابت لا يتغير مثل SPX-8K31H2
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isPlatformOwner?: boolean;
  avatar?: string;
  phone?: string;
  directorateId: string; // مديرية التربية
  districtId: string; // المقاطعة التفتيشية
  institutionId?: string; // المؤسسة التعليمية
  schoolName?: string; // اسم المدرسة الابتدائية
  municipality?: string; // بلدية العمل
  specialization?: string;
  cycle?: 'ابتدائي';
  yearsExperience?: number;
  teachingExperienceYears?: number;
  wilaya?: string;
  bio?: string; // النبذة الشخصية
  status: 'active' | 'inactive' | 'pending_approval';
  isApprovedByAdmin?: boolean; // تفعيل الحساب من طرف المشرف
  password?: string;
  followingIds?: string[]; // معرّفات المستخدمين المتابَعين
  followersIds?: string[]; // معرّفات المتابعين
  followingCount?: number;
  followersCount?: number;
  publishedResourcesCount?: number; // عدد الموارد المنشورة
  approvedResourcesCount?: number; // عدد الموارد المعتمدة
  privacySettings?: UserPrivacySettings; // إعدادات الخصوصية
  customApiKey?: string; // مفتاح الاستعلام المباشر المخصص للحساب (Gemini API Key)
  apiKeyStatus?: 'active' | 'quota_exceeded' | 'not_set';
  googleId?: string | null; // معرّف حساب Google المرتبط (إن وُجد) لتسجيل الدخول السريع
}

// Community Shared Pedagogical Resource
export interface CommunityResource {
  id: string;
  spexId: string; // معرّف صاحب المورد الثابت
  authorName: string;
  authorUsername: string;
  authorRole: UserRole;
  authorAvatar?: string;
  type: 'game' | 'situation' | 'lesson_plan' | 'pedagogical_resource' | 'file';
  title: string;
  description: string;
  categoryName?: string;
  content?: unknown;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'word' | 'image' | 'resource';
  likesCount: number;
  savesCount: number;
  likedByUserIds?: string[];
  isApprovedByInspector?: boolean;
  createdAt: string;
}

// Community Direct Chat Message
export interface CommunityChatMessage {
  id: string;
  senderId: string;
  senderSpexId: string;
  senderUsername: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  receiverSpexId: string;
  message: string;
  sharedResource?: CommunityResource;
  attachment?: {
    url: string;
    name: string;
    type: 'image' | 'pdf' | 'word' | 'resource';
    size?: string;
  };
  createdAt: string;
  read: boolean;
}

// Community Notification Item
export interface CommunityNotification {
  id: string;
  userId: string; // المستلم
  senderId: string;
  senderUsername: string;
  senderName: string;
  senderAvatar?: string;
  type:
    'new_message' | 'new_follower' | 'resource_shared' | 'comment' | 'like' | 'resource_approved';
  title: string;
  message: string;
  resourceId?: string;
  read: boolean;
  createdAt: string;
}

// District Group Chat Message between Teachers of the Same District
export interface DistrictGroupMessage {
  id: string;
  districtId: string; // شرط التواجد بنفس المقاطعة
  senderId: string;
  senderName: string;
  senderSchool?: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
  likesCount?: number;
  replyTo?: {
    id: string;
    senderName: string;
    message: string;
  };
}

// Teacher Follow Relationship in District
export interface DistrictTeacherFollow {
  followerId: string;
  followingId: string;
  districtId: string; // شرط نفس المقاطعة التفتيشية
  createdAt: string;
}

// District Broadcast / Group Invitation from Inspector
export interface DistrictBroadcast {
  id: string;
  inspectorId: string;
  inspectorName: string;
  districtId: string;
  title: string;
  content: string;
  category: 'دعوة_اجتماع' | 'توجيه_بيداغوجي' | 'إشعار_مستعجل' | 'ندوة_تكوينية';
  createdAt: string;
}

// Direct Text Chat between Inspector and Teacher
export interface DirectChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  districtId: string;
  message: string;
  content?: string;
  timestamp?: string;
  createdAt: string;
  read?: boolean;
  archived?: boolean;
}

export interface Directorate {
  id: string;
  name: string; // e.g. مديرية التربية لولاية سطيف
  wilaya?: string;
  code?: string;
  isActiveWithData?: boolean;
  note?: string;
  districts?: InspectionDistrict[];
}

export interface InspectionDistrict {
  id: string;
  directorateId: string;
  districtNumber?: number;
  name: string; // e.g. المقاطعة 07 - سطيف
  inspectorId?: string;
  inspectorName?: string;
}

export interface Institution {
  id: string;
  districtId: string;
  directorateId: string;
  name: string; // e.g. مدرسة الأمير عبد القادر الابتدائية
  type: 'ابتدائية';
  address: string;
}

// Educational Hierarchy according to Algerian PE Curriculum for Primary Education
export interface AcademicYear {
  id: string;
  title: string; // e.g. 2025/2026
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface PELevel {
  id: string;
  name: string; // e.g. السنة الأولى ابتدائي, السنة الخامسة ابتدائي
  cycle: 'ابتدائي';
  order: number;
}

export interface PEField {
  id: string;
  name: string; // e.g. الميدان البدني, الميدان الجماعي, الميدان الفردي
  description: string;
  category: 'بدني' | 'جماعي' | 'فردي';
}

export interface FinalCompetency {
  id: string;
  fieldId: string;
  levelId: string;
  title: string; // الكفاءة الختامية
  officialCode: string;
  description: string;
  components?: CompetencyComponent[]; // مركبات الكفاءة الختامية
}

export interface CompetencyComponent {
  id: string;
  competencyId: string;
  title: string; // مركب الكفاءة (مثال: التحكم في التوازنات والتنقل الفضائي)
  resources: LearningResource[];
}

export interface LearningResource {
  id: string;
  componentId: string;
  title: string; // الموارد التعلمية المستهدفة
  objectives: LearningObjective[];
}

export interface LearningObjective {
  id: string;
  resourceId: string;
  fieldId: string;
  levelId: string;
  title: string; // الهدف الإجرائي الحركي القابل للقياس (مثال: يجري، يقفز، يرمي، يلتزم بالحدود)
  actionVerb: string;
  standardOrder: number;
}

export interface SmartAssistantPrompt {
  academicYear: string;
  fieldId: string;
  levelId: string;
  pupilsCount: number;
  equipmentAvailable: string[];
  environment: 'outdoor_yard' | 'indoor_hall' | 'mixed';
  weatherCondition: 'good' | 'hot' | 'rainy' | 'cold';
  hasSpecialNeedsPupils: boolean;
  specialNeedsNotes?: string;
  aiMode: AIMode;
}

export interface PersonalLibraryItem {
  id: string;
  teacherId: string;
  type: 'game' | 'situation' | 'indicator' | 'note';
  title: string;
  content: string;
  fieldName?: string;
  levelName?: string;
  equipment?: string[];
  tags: string[];
  createdAt: string;
}

export interface ValidationResult {
  isCompliant: boolean;
  score: number; // 0 to 100
  messages: {
    type: 'success' | 'warning' | 'error';
    text: string;
    suggestion?: string;
  }[];
}

export interface LearningSegment {
  id: string;
  competencyId: string;
  fieldId: string;
  levelId: string;
  title: string; // المقطع التعليمي
  orderIndex: number;
  objectives: string[];
  durationWeeks: number;
}

export interface LearningUnit {
  id: string;
  segmentId: string;
  title: string; // الوحدة التعلمية
  orderIndex: number;
}

export interface PESession {
  id: string;
  unitId: string;
  segmentId: string;
  fieldId?: string;
  sessionNumber?: number;
  orderIndex: number;
  title: string; // عنوان الحصة التعلمية
  type: 'تشخيصية' | 'تعلمية' | 'إدماجية' | 'تقويمية' | 'علاجية' | 'تقويم تشخيصي' | 'تقويم تحصيلي';
  targetObjective: string;
}

// Annual Plan (المخطط السنوي) / Annual Schedule (التوزيع السنوي) objective overrides
// يعدّل الأستاذ صياغة الأهداف التعلمية الخاصة به، ويمكن للمفتش اقتراح مخطط/توزيع
// سنوي لأساتذة مقاطعته ثم اعتماد اقتراحه ليصبح نافذاً عند الأستاذ.
// 'plan' و 'schedule': الأنواع القديمة (متوافقية فقط، لم تعد تُستعمل من الواجهات الجديدة).
// 'plan_components': تخصيص مركبات الكفاءة/الموارد التعلمية/المؤشرات على مستوى الميدان (المخطط السنوي) — المفتاح: fieldId
// 'section_wording': تخصيص صياغة هدف الحصة وملاحظات الأستاذ على مستوى الحصة (المقاطع التعليمية) — المفتاح: `${fieldId}__${fieldSessionNumber}`
// 'schedule_dates': تاريخ/حالة تنفيذ كل حصة (التوزيع السنوي والكراس اليومي) — المفتاح: `${fieldId}__${fieldSessionNumber}`
// 'annual_distribution': التوزيع المحفوظ للمستوى قبل materialization للأقسام — المفتاح: referenceSessionId
// 'annual_plan_new': الهيكلية الجديدة للمخطط السنوي 2025 — 3 ميادين فقط مع الكفاءة الشاملة و 6 حقول لكل ميدان
export type AnnualPlanKind =
  | 'plan'
  | 'schedule'
  | 'plan_components'
  | 'section_wording'
  | 'schedule_dates'
  | 'annual_distribution'
  | 'annual_plan_new'
  | 'teacher_learning_plan';
export type AnnualPlanStatus = 'draft' | 'proposed' | 'approved';
export type LessonExecutionStatus = 'مبرمجة' | 'منجزة' | 'مؤجلة' | 'غير منجزة';

// مفتاح كل هدف/حصة هو `${fieldId}__${fieldSessionNumber}` (فريد ضمن المستوى الدراسي)، ما عدا
// kind='plan_components' حيث المفتاح هو `${fieldId}` فقط (تخصيص على مستوى الميدان/المقطع التعليمي)
// kind='annual_plan_new' حيث المفاتيح هي: 'comprehensive' للكفاءة الشاملة، و `${fieldId}__final`, `${fieldId}__components`, `${fieldId}__knowledge`, `${fieldId}__transversal`, `${fieldId}__evaluation`, `${fieldId}__time`
export interface AnnualPlanObjectiveOverride {
  objective?: string; // صياغة الأستاذ لهدف الحصة (kind: plan | schedule | section_wording)
  teacherNote?: string; // ملاحظة الأستاذ على مضمون الحصة (kind: section_wording)
  components?: string[]; // مركبات الكفاءة (kind: plan_components)
  resources?: string[]; // الموارد التعلمية (kind: plan_components) - للتوافق القديم
  indicators?: string[]; // مؤشرات الأداء (kind: plan_components) - للتوافق القديم
  date?: string; // تاريخ تنفيذ الحصة المعدَّل يدوياً (kind: schedule_dates)
  status?: LessonExecutionStatus; // حالة تنفيذ الحصة (kind: schedule_dates)
  executionNote?: string; // ملاحظة الأستاذ عند تنفيذ الحصة في الكراس اليومي (kind: schedule_dates)

  // ===== الحقول الجديدة للمخطط السنوي 2025 (kind: annual_plan_new) =====
  comprehensive?: string; // الكفاءة الشاملة للمستوى
  finalCompetency?: string; // الكفاءة الختامية للميدان
  knowledgeResources?: string; // الموارد المعرفية
  transversalResources?: string; // الموارد العرضية
  evaluationCriteria?: string; // معايير ومؤشرات التقويم
  time?: string; // الزمن
  // حقل خاص للتمييز بين تفريغ المخطط (empty customization valid) وعدم وجود تخصيص
  isCleared?: boolean; // true means teacher intentionally cleared the plan
}

export interface TeacherLearningObjective {
  id: string;
  text: string;
  orderIndex: number;
  sourceReferenceId?: string | null;
}

export interface TeacherLearningIntegrationPoint {
  id: string;
  afterObjectiveId: string | null;
  orderIndex: number;
  label: 'إدماجية 1' | 'إدماجية 2';
}

export interface TeacherLearningPlanDomain {
  fieldId: string;
  finalCompetencyId?: string;
  objectives: TeacherLearningObjective[];
  integrationPoints: TeacherLearningIntegrationPoint[];
}

export interface TeacherLearningPlanData {
  version: 1;
  levelId: string;
  domains: TeacherLearningPlanDomain[];
}

export interface AnnualPlan {
  id: string;
  teacherId: string;
  academicYearId: string;
  levelId: string;
  kind: AnnualPlanKind;
  status: AnnualPlanStatus;
  proposedByInspectorId?: string | null;
  approvedAt?: string | null;
  data: {
    overrides?: Record<string, AnnualPlanObjectiveOverride>;
    note?: string;
    version?: 1;
    levelId?: string;
    domains?: TeacherLearningPlanDomain[];
  };
  createdAt: string;
  updatedAt: string;
}

// Daily Notebook (الكراس اليومي)
export interface DailyNotebookEntry {
  id: string;
  teacherId: string;
  classPlannedSessionId?: string;
  academicYearId?: string;
  sessionId?: string;
  segmentId?: string;
  classId: string;
  className: string;
  levelName?: string;
  segmentTitle?: string;
  sessionTitle?: string;
  executionDate: string;
  timeSlot: string; // e.g. 08:00 - 10:00
  status: 'منجزة' | 'مؤجلة' | 'غير منجزة';
  note?: string;
  lessonPlanId?: string; // linked lesson plan if generated
}

export type LessonPhaseName = 'المرحلة التحضيرية' | 'المرحلة الرئيسية' | 'المرحلة الختامية';

/** صف ظاهر في جدول مذكرة الحصة الموحد. */
export interface LessonPlanRow {
  id: string;
  phase: LessonPhaseName;
  learningContent: string;
  executionContent: string;
  durationMinutes: number;
  guidance: string;
  /** رسم/صورة تنظيمية اختيارية للموقف، عند توفرها من النظام الحالي. */
  illustrationUrl?: string;
  situationSnapshot?: EducationalSituationSnapshot;
}

export type EducationalSituationStatus = 'PRIVATE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export interface EducationalSituation {
  id: string;
  externalId?: string;
  name: string;
  grade: number;
  fieldId: string;
  fieldName: string;
  objectiveIds: string[];
  objectiveTexts: string[];
  sourceGoal: string;
  organization: string;
  equipment: string[];
  variations?: string;
  origin: 'REFERENCE_SEED' | 'TEACHER';
  status: EducationalSituationStatus;
  ownerId?: string;
  approvedById?: string;
  approvedByRole?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedByRole?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface EducationalSituationSnapshot {
  situationId: string;
  name: string;
  organization: string;
  equipment: string[];
  variations?: string;
}

// Lesson Plan (مذكرة الحصة البيداغوجية الرسمية)
export interface LessonPlan {
  id: string;
  dailyNotebookEntryId?: string;
  classPlannedSessionId?: string;
  referenceSessionId?: string;
  academicYearId?: string;
  classId?: string;
  plannedStartTime?: string | null;
  venue?: string | null;
  teacherId: string;
  institutionName: string; // اسم المدرسة الابتدائية
  teacherName: string; // اسم الأستاذ
  inspectorName?: string; // اسم الأستاذ المفتش
  levelName: string; // المستوى الدراسي
  level?: string;
  className: string; // اسم القسم
  fieldName: string; // الميدان التعليمي
  competencyTitle: string; // الكفاءة الختامية للميدان
  segmentTitle: string; // المقطع التعليمي
  sessionTitle: string; // عنوان الحصة
  sessionType:
    'تشخيصية' | 'تعلمية' | 'إدماجية' | 'تقويمية' | 'علاجية' | 'تقويم تشخيصي' | 'تقويم تحصيلي';
  sessionTypeNumber?: string; // نوع الحصة ورقمها (مثال: حصة تعلمية رقم 03، أو إدماجية، أو تقويم تشخيصي، أو تقويم تحصيلي)
  sessionGlobalNumber?: number; // رقم الحصة في التوزيع السنوي (1 إلى 30)
  annualSessionRef?: string; // مرجع الحصة بالتوزيع السنوي (مثل: "الأسبوع 02 / الحصة 02")
  segmentGoal?: string; // الهدف البيداغوجي / التعلمي للمقطع البيداغوجي
  learningGoal?: string;
  evaluation?: string;
  duration?: string;
  date: string;
  durationMinutes: number; // default 60
  equipmentNeeded: string[]; // الوسائل المستعملة
  /** القالب الموحد الظاهر للأستاذ. السجلات القديمة تبقى قابلة للقراءة عبر التطبيع. */
  lessonRows?: LessonPlanRow[];
  equipmentChecklist?: { name: string; available: boolean }[]; // قائمة تحقق التجهيزات (متوفر/يجب توفيره) — تُشتق من equipmentNeeded عند التوليد وتبقى متوافقة مع النسخ القديمة
  generalObjective: string; // هدف الحصة التعلمي الخاص والإجرائي المسطر للمقطع
  proceduralObjectives: {
    motor: string; // الهدف المهاري / المنهجي الحركي
    cognitive: string; // الهدف المعرفي
    affective?: string; // الهدف الوجداني السلوكي
    communication?: string; // الهدف التواصلي
    personalSocial?: string; // الهدف الشخصي والاجتماعي
  };
  warmupPhase: {
    // المرحلة التحضيرية (إحماء بلعبة تربوية)
    duration: string;
    pedagogicalWarmupGame?: {
      // لعبة تربوية تمهيدية إحمائية
      title: string;
      rules: string;
      equipment?: string;
    };
    generalWarmup: string; // الإحماء العام
    specificWarmup: string; // الإحماء الخاص
    organization: string; // التوجيه والتنظيم
  };
  mainPhase: {
    // المرحلة الرئيسية / التعلمية (موقفين للعبتين تربويتين تنافسيتين)
    duration: string;
    problemSituation: string; // الوضعية المشكلة الهدف
    learningSituation1: {
      // الموقف الأول: لعبة تربوية تنافسية 1
      title: string;
      description: string;
      dosing: string; // التجريد والجرعات التنافسية
      criteria: string; // معيار النجاح وتحقيق الهدف
    };
    learningSituation2: {
      // الموقف الثاني: لعبة تربوية تنافسية 2
      title: string;
      description: string;
      dosing: string;
      criteria: string;
    };
    guidedApplication: {
      // المنافسة الختامية والتطبيق الموجه
      title: string;
      description: string;
      rules: string;
    };
  };
  coolDownPhase: {
    // المرحلة الختامية / العودة للهواة
    duration: string;
    activities: string; // التمارين الهادئة والاسترخاء
    assessmentAndDialogue: string; // التقييم الذاتي والحوار الهادف
  };
  safetyRules: string[]; // قواعد الأمن والسلامة
  teacherNotes?: string;
  executionStatus?: 'منجزة' | 'مؤجلة' | 'غير منجزة'; // حالة إنجاز الحصة
  executionNote?: string; // ملاحظات الأستاذ حول تنفيذ الحصة
  aiGenerated: boolean;
  version: number;
  createdAt: string;
}

// Educational Knowledge Engine (بنك المعرفة)
export type KnowledgeCategory =
  'objective' | 'game' | 'situation' | 'integration' | 'remedial' | 'assessment';

export interface KnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  title: string;
  description: string;
  origin?: 'REFERENCE' | 'CURRICULUM_REFERENCE' | 'AI_GENERATED' | 'TEACHER' | 'COMMUNITY';
  approvalStatus?: 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  ownerId?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedById?: string;
  fieldId?: string;
  fieldName?: string;
  objectiveId?: string;
  objectiveText?: string;
  levelId?: string;
  levelName?: string;
  levelIds?: string[];
  tags: string[];
  equipment?: string[];
  rules?: string;
  organization?: string;
  pedagogicalPurpose?: string;
  safetyGuidance?: string;
  progression?: string;
  duration?: string;
  remedialProblem?: string;
  targetSkill?: string;
  approved: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
}

// Competency Assessment (تقويم الكفاءة الختامية)
export interface Student {
  id: string;
  classId: string;
  firstName: string;
  lastName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate?: string;
  registrationNumber: string;
  matricule?: string;
  grade?: number;
  schoolYear?: string;
}

export interface ClassRoom {
  id: string;
  institutionId: string;
  teacherId: string;
  levelId: string;
  name: string; // e.g. 1 متوسط 1
  levelName?: string;
  studentCount: number;
}

export type AssessmentGrade = 'أ' | 'ب' | 'ج' | 'د'; // أ: تحكم تام, ب: تحكم مقبول, ج: تحكم أدنى, د: لم يتحقق

export type TeacherAssessmentType =
  'تشخيصية' | 'تعلمية' | 'إدماجية' | 'تقويمية' | 'تقويم تشخيصي' | 'تقويم تحصيلي';

export interface AssessmentSessionDto {
  id: string;
  teacherId: string;
  classId: string;
  academicYearId: string;
  classPlannedSessionId?: string | null;
  assessmentType: TeacherAssessmentType;
  gradeLevelId: string;
  domainId: string;
  finalCompetencyId?: string | null;
  title?: string | null;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAssessmentDto {
  id: string;
  assessmentSessionId: string;
  studentId: string;
  masteryLevel: AssessmentGrade | null;
  numericMark: number | null;
  note: string | null;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  criterionResults: CriterionResultDto[];
}

export interface StudentAssessmentHistoryDto {
  session: AssessmentSessionDto;
  result: StudentAssessmentDto | null;
}
export type AttendanceStatus = 'حاضر' | 'غائب' | 'غائب بمبرر' | 'معفى';

export interface TeacherAttendanceRecordDto {
  id: string;
  status: AttendanceStatus | null;
  note: string | null;
  recordedAt: string | null;
}

export interface TeacherAttendanceStudentDto {
  id: string;
  firstName: string;
  lastName: string;
  attendance: TeacherAttendanceRecordDto | null;
  medicallyExempt: boolean;
}

export interface TeacherAttendanceDto {
  success: boolean;
  session: { id: string; classId: string; academicYearId: string; plannedDate: string };
  students: TeacherAttendanceStudentDto[];
}

export interface MedicalExemptionDto {
  id: string;
  studentId: string;
  student?: { id: string; firstName: string; lastName: string };
  issuedOn: string;
  expiresOn: string | null;
  reason: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CriterionResultDto {
  id: string;
  studentAssessmentId: string;
  criterionId: string;
  masteryLevel: AssessmentGrade | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
// Inspector Module
export interface InspectorNote {
  id: string;
  inspectorId: string;
  inspectorName: string;
  teacherId: string;
  teacherName: string;
  moduleRef:
    | 'annual_plan'
    | 'daily_notebook'
    | 'lesson_plan'
    | 'assessment'
    | 'general'
    | 'seminar_invitation'
    | 'visit_alert';
  title: string;
  content: string;
  priority: 'عادية' | 'هام' | 'مستعجل';
  status: 'جديدة' | 'قيد المعالجة' | 'تم الرد' | 'مغلقة';
  teacherResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionVisit {
  id: string;
  inspectorId: string;
  teacherId: string;
  institutionId: string;
  visitDate: string;
  visitType: 'تفتيش تثبيت' | 'توجيهية' | 'متابعة دورية' | 'تقييمية';
  lessonObservedTitle: string;
  pedagogicalGrade?: number; // /20
  positivePoints: string[];
  areasForImprovement: string[];
  recommendations: string[];
  officialReportGenerated: boolean;
  createdAt?: string;
}

// AI Engine Settings & Logs
export interface AISetting {
  provider: 'gemini' | 'openai' | 'claude' | 'deepseek' | 'groq' | 'ollama';
  activeModel: string; // e.g. gemini-2.5-flash
  apiKeyConfigured: boolean;
  temperature: number;
  maxTokens: number;
  dailyQuotaLimit: number;
  dailyQuotaUsed: number;
  systemPromptPreset: string;
}

export interface AILog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  provider: string;
  model: string;
  module: string; // e.g. 'lesson_generator', 'game_suggester', 'report_writer'
  promptSummary: string;
  tokensUsed: number;
  responseTimeMs: number;
  status: 'success' | 'error';
}

// System Notification
export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

// Attendance Register (دفتر الغياب والحضور)
export interface WeeklyScheduleSlot {
  id: string;
  teacherId: string;
  day: 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';
  dayOfWeek?: string;
  timeSlot: string; // e.g. "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"
  academicYearId?: string;
  startTime?: string;
  endTime?: string;
  classId: string;
  className: string;
  fieldId: string;
  fieldName: string;
  sessionTitle?: string;
  venue?: string; // ساحة المدرسة / الملعب
  note?: string;
}

export interface AttendanceEntry {
  id: string;
  classId: string;
  date: string;
  sessionTitle: string;
  records: {
    studentId: string;
    status: 'حاضر' | 'غائب' | 'غائب بمبرر' | 'معفى';
    note?: string;
  }[];
}

// Educational Clubs Register (دفتر البلديات والنوادي التربوية - نادي أ ونادي ب)
export interface ClassEducationalClubConfig {
  classId: string;
  clubAName: string; // e.g. نادي الأمل / نادي التحدي
  clubASlogan?: string;
  clubACaptainId?: string;
  clubBName: string; // e.g. نادي النصر / نادي البطولة
  clubBSlogan?: string;
  clubBCaptainId?: string;
  studentClubAssignments: Record<string, 'club_a' | 'club_b'>; // studentId -> club_a | club_b
}
