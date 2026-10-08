export type ReportType = 'GUIDANCE' | 'TENURE';
export type ReportStatus = 'DRAFT' | 'FINAL';
export type ReportField = readonly [
  key: string,
  label: string,
  kind?: 'text' | 'long' | 'number' | 'date',
];
export const GUIDANCE_SECTIONS: readonly { title: string; fields: readonly ReportField[] }[] = [
  {
    title: 'معلومات الأستاذ',
    fields: [
      ['nationality', 'الجنسية'],
      ['daira', 'الدائرة'],
    ],
  },
  {
    title: 'ظروف التفتيش',
    fields: [
      ['durationMinutes', 'مدة الحصة', 'number'],
      ['ground', 'الأرضية'],
      ['safety', 'السلامة'],
      ['layout', 'التخطيط'],
      ['location', 'الموقع'],
    ],
  },
  {
    title: 'تحضير الدرس',
    fields: [
      ['domain', 'الميدان'],
      ['objective', 'هدف الدرس'],
      ['teachingUnitExists', 'الوحدة التعليمية: هل هي موجودة؟'],
      ['teachingUnitValue', 'قيمتها'],
      ['learningUnitExists', 'الوحدة التعلمية: هل هي موجودة؟'],
      ['learningUnitValue', 'تقدير قيمتها العملية'],
    ],
  },
  {
    title: 'التوزيع السنوي',
    fields: [
      ['annualDistribution', 'هل هو موجود ومحترم حسب المنهاج؟'],
      ['officialProgramme', 'هل يعمل بتوجيهات البرنامج الرسمي؟'],
    ],
  },
  {
    title: 'التدرج في التعلم ومراحل الحصة',
    fields: [
      ['progression', 'التدرج في التعلم ومراحل الحصة'],
      ['groupOrganization', 'تنظيم القسم (التفويج)'],
      ['sportsAttire', 'العمل بالبدلة التربوية الرياضية'],
      ['spaceMaterials', 'استغلال المساحة والوسائل التعليمية'],
      ['applicationExists', 'التطبيق على الدرس: هل هو موجود؟'],
      ['applicationSuitability', 'هل هو مناسب؟'],
      ['explanation', 'الشرح والعرض'],
      ['correction', 'التصحيح والتوجيه'],
      ['discipline', 'التنظيم والانضباط'],
      ['participation', 'تنشيط المشاركة'],
      ['pupilParticipation', 'تقدير مشاركة التلاميذ'],
      ['teachingAids', 'الوسائل التعليمية'],
    ],
  },
  { title: 'دفتر اليومي', fields: [['dailyNotebook', 'هل هو مستعمل حسب التوجيهات التربوية؟']] },
  {
    title: 'مراقبة أعمال التلاميذ',
    fields: [
      ['attendanceMonitored', 'الغيابات، هل هي مراقبة؟'],
      ['attendanceRecorded', 'هل هي مسجلة باستمرار؟'],
    ],
  },
  {
    title: 'الإرشادات التربوية',
    fields: [
      ['guidanceIntroduction', 'الإرشادات التربوية', 'long'],
      ['pedagogicalGuidance', 'التوجيهات التربوية', 'long'],
      ['practicalGuidance', 'الجانب الميداني العملي', 'long'],
    ],
  },
  {
    title: 'الخلاصة',
    fields: [
      ['conclusion', 'الخلاصة', 'long'],
      ['generalAssessment', 'التقدير العام'],
      ['markWords', 'العلامة بالحروف'],
    ],
  },
];
export const TENURE_SECTIONS: readonly { title: string; fields: readonly ReportField[] }[] = [
  {
    title: 'معلومات التثبيت',
    fields: [
      ['referenceNumber', 'الرقم'],
      ['examinationInstitution', 'في ابتدائية'],
      ['examinationCity', 'بمدينة'],
      ['financialVisaDate', 'تأشيرة المراقب المالي: بتاريخ', 'date'],
    ],
  },
  {
    title: 'لجنة امتحان شهادة الكفاءة الأستاذية للتعليم الابتدائي',
    fields: [
      ['directorName', 'العضو الأول: السيد(ة)'],
      ['directorSchool', 'مدير بابتدائية'],
      ['teacherMemberName', 'العضو الثاني: السيد(ة)'],
      ['teacherMemberSchool', 'أستاذ بابتدائية'],
    ],
  },
  {
    title: 'الاختبار الشفوي',
    fields: [['oralExamination', 'مسائل التربية وعلم النفس والتشريع المدرسي', 'long']],
  },
  {
    title: 'قيمة المترشح(ة) الثقافية',
    fields: [['culturalValue', 'قيمة المترشح(ة) الثقافية', 'long']],
  },
  {
    title: 'قيمة المترشح(ة) التربوية',
    fields: [['pedagogicalValue', 'قيمة المترشح(ة) التربوية', 'long']],
  },
  {
    title: 'خلاصة الملاحظات والتوجيهات',
    fields: [['observations', 'خلاصة الملاحظات والتوجيهات', 'long']],
  },
  {
    title: 'التقدير العام والتقييم النهائي',
    fields: [['finalAssessment', 'التقدير العام والتقييم النهائي', 'long']],
  },
  {
    title: 'مداولة اللجنة',
    fields: [
      ['decisionDate', 'تاريخ المداولة', 'date'],
      ['educationDirectorDecision', 'قرار السيد مدير التربية', 'long'],
      ['educationDirectorDecisionDate', 'تاريخ قرار السيد مدير التربية', 'date'],
      ['decisionPlace', 'مكان القرار'],
    ],
  },
];
export const TENURE_LEGAL_TEXT =
  'طبقا للقرار الوزاري المشترك رقم 820/و.ت.و/أ.خ.و/المؤرخ في 09/11/1991 المعدل و المتمم بالقرار الوزاري المشترك رقم 01/و.ت.و/أ.خ.م/المؤرخ في 14/02/1996 و القرار الوزاري المشترك المؤرخ في 09/08/1999 و الصادر في الجريدة الرسمية بتاريخ 22/09/1999 تحت رقم 67 ’و القرار الوزاري المؤرخ في 25 أكتوبر 2010 المحدد لكيفيات تنظيم امتحان ترسيم موظفي التعليم.';
export const DECISION_LABELS = {
  ACCEPT: 'قبول المترشح(ة)',
  POSTPONE: 'تأجيل المترشح(ة)',
  REJECT: 'رفض المترشح(ة)',
} as const;
export interface PracticalLesson {
  level: string;
  className: string;
  domain: string;
  objective: string;
}
export interface ReportContent {
  [key: string]: string | number | null | PracticalLesson[] | undefined;
  practicalLessons?: PracticalLesson[];
  decision?: keyof typeof DECISION_LABELS;
}
export interface ReportContext {
  teacher: Record<string, string>;
  location: { school: string; directorate: string; district: string; municipality: string };
  inspector: { id: string; name: string };
  visit: {
    id: string;
    date: string;
    academicYear: string;
    subject: string;
    className: string;
    level: string;
    pupilCount: number | null;
    durationMinutes: number | null;
  };
}
export interface ReportDocument {
  id: string;
  visitId: string;
  reportType: ReportType;
  status: ReportStatus;
  authorId: string;
  content: ReportContent;
  mark: number | null;
  revision: number;
  finalSnapshot: {
    context: ReportContext;
    content: ReportContent;
    mark: number | null;
    sourceVersion: string;
    legalText: string | null;
  } | null;
  finalizedAt: string | null;
  finalizedById: string | null;
  createdAt: string;
  updatedAt: string;
  sharedWithTeacherAt?: string | null;
  sharedWithTeacherById?: string | null;
  teacherAcknowledgedAt?: string | null;
  teacherAcknowledgedById?: string | null;
}
export interface ReportRead {
  report: ReportDocument | null;
  context: ReportContext | null;
  canEdit: boolean;
  canCreate: boolean;
  canShare?: boolean;
  unsupported?: boolean;
}
