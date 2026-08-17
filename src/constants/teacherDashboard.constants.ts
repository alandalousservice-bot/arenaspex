/**
 * SPEX - Teacher Dashboard constants
 * ثوابت لوحة قيادة الأستاذ: نصوص وتعيينات ثابتة كانت مضمّنة سابقاً داخل الـ Component
 */

export const CURRENT_SCHOOL_YEAR_LABEL = 'السنة الدراسية 2025/2026 - الفصل الأول';

export const DEFAULT_SCHOOL_NAME = 'المدرسة الابتدائية';
export const DEFAULT_MUNICIPALITY = 'عين أزال';
export const DEFAULT_DISTRICT_LABEL = 'المقاطعة التفتيشية';

/** تعيين معرّف المقاطعة إلى تسميتها المعروضة */
export const DISTRICT_LABELS: Record<string, string> = {
  dist_setif_7: 'المقاطعة 07 - عين أزال',
};

/** تعيين معرّف الحصة إلى عنوانها الكامل، ريثما يتم ربطها بمصدر بيانات ديناميكي */
export const SESSION_TITLES: Record<string, string> = {
  sess_run_1: 'الحصة 01: اكتشاف السرعة الفردية والاستجابة للإشارة الصوتية',
  sess_run_2: 'الحصة 02: ضبط الانطلاقة المنخفضة والاندفاع الأولي',
  sess_run_3: 'الحصة 03: إدماج الجري السريع في سباق التناوب التنافسي',
};

export const DEFAULT_SESSION_TITLE = 'الحصة 01: التمرير الصدري والاستقبال أثناء التنقل';

export const CURRENT_INSPECTOR_NAME = 'مصطفى رواق';

/** بيانات ثابتة مؤقتاً (لا مصدر ديناميكي بعد) - أُبقيت كما كانت لتفادي تغيير السلوك */
export const LAST_INSPECTION_VISIT_LABEL = 'آخر زيارة تفتيشية: 15 يوليو 2026';

export const NOTEBOOK_STATUS = {
  DONE: 'منجزة',
  DELAYED: 'مؤجلة',
  NOT_DONE: 'غير منجزة',
} as const;

export const INSPECTOR_NOTE_MODULE_REF = {
  SEMINAR_INVITATION: 'seminar_invitation',
  VISIT_ALERT: 'visit_alert',
} as const;
