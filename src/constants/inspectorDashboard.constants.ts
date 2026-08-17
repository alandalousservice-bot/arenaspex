/**
 * SPEX - Inspector Dashboard Constants
 * الثوابت الرسمية لبوابة المفتش البيداغوجي
 */

export const LATE_REPORT_THRESHOLD_DAYS = 7;

export const DEFAULT_SCHOOL_NAME_FALLBACK = 'مدرسة الأمير عبد القادر الابتدائية';

export const INSPECTOR_SUB_TABS = [
  { id: 'annual_plan', label: 'المخطط والتوزيع السنوي' },
  { id: 'schedule', label: 'التوزيع الأسبوعي وساعات العمل' },
  { id: 'lesson_plans', label: 'المذكرات البيداغوجية والتحضير' },
  { id: 'students', label: 'إجمالي التلاميذ والأقسام' },
  { id: 'visits', label: 'الزيارات والتوجيهات' },
] as const;

export const DEFAULT_INSPECTOR_LEVEL_ID = 'lvl_p1';
