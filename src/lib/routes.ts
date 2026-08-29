/**
 * SPEX - URL Routing Map
 * خريطة ثنائية الاتجاه بين تبويبات المنصة (NavTab) وعناوين URL. هي التي تتيح
 * فتح كل أداة من أدوات المنصة في تبويب متصفح مستقل برابط خاص بها (بدل التنقل
 * بحالة داخلية تُجبر المستخدم على إغلاق أداة للانتقال إلى أخرى)، مع دعم
 * الروابط العميقة (deep links) والمشاركة وزّر الرجوع/التقدم في المتصفح.
 */

import type { NavTab } from '../components/layout/Sidebar';
import type { UserRole } from '../types/spex';

/** روابط أقسام المصادقة */
export const AUTH_PATHS = {
  landing: '/',
  login: '/login',
} as const;

/** NavTab → مسار URL */
export const TAB_PATHS: Record<NavTab, string> = {
  dashboard: '/dashboard',
  planning: '/planning',
  annual_plan: '/annual-plan',
  annual_schedule: '/annual-schedule',
  weekly_schedule: '/weekly-schedule',
  learning_segments: '/learning-segments',
  daily_notebook: '/daily-notebook',
  lesson_plans: '/lesson-plans',
  lesson_command_center: '/lesson-command-center',
  educational_situations: '/educational-situations',
  knowledge_engine: '/knowledge-engine',
  gradebook: '/gradebook',
  attendance: '/attendance',
  students: '/students',
  professional_hub: '/community',
  inspector_portal: '/inspector',
  inspector_teachers: '/inspector/teachers',
  inspector_approvals: '/inspector/approvals',
  inspector_visits: '/inspector/visits',
  inspector_curriculum: '/inspector/curriculum-audit',
  inspector_guidance: '/inspector/guidance',
  inspector_communication: '/inspector/communication',
  director_portal: '/director',
  admin_portal: '/admin',
  admin_accounts: '/admin/accounts',
  admin_pending_users: '/admin/pending-users',
  admin_inspectors: '/admin/inspectors',
  admin_services: '/admin/services',
  admin_approvals: '/admin/approvals',
  admin_curriculum: '/admin/curriculum',
  admin_reports: '/admin/reports',
  reports: '/reports',
  settings: '/settings',
};

/** مسار URL → NavTab (مشتق آلياً من الجدول ليبقى المصدر واحداً) */
const PATH_TO_TAB: Record<string, NavTab> = Object.fromEntries(
  (Object.entries(TAB_PATHS) as Array<[NavTab, string]>).map(([tab, path]) => [path, tab])
);

export function tabToPath(tab: NavTab): string {
  return TAB_PATHS[tab] ?? '/dashboard';
}

/**
 * يحوّل مسار URL إلى تبويب، أو null إن كان المسار غير معروف
 * (مثل روابط المصادقة أو أي رابط قديم/غير موجود).
 */
export function pathToTab(pathname: string): NavTab | null {
  // تطبيع: تجاهل الشرطة الأخيرة الزائدة
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  // Deep links to the retired standalone bank now open the unified knowledge bank.
  if (normalized === '/educational-situations') return 'knowledge_engine';
  if (normalized === '/assessment') return 'gradebook';
  if (normalized === '/gradebook') return 'gradebook';
  if (normalized === '/attendance') return 'attendance';
  if (normalized === '/students' || /^\/students\/[^/]+$/.test(normalized)) return 'students';
  if (normalized === '/assessment-notebook') return 'gradebook';
  if (
    ['/annual-plan', '/annual-schedule', '/weekly-schedule', '/learning-segments'].includes(
      normalized
    )
  )
    return 'planning';
  if (/^\/inspector\/teachers\/[^/]+$/.test(normalized)) return 'inspector_teachers';
  if (/^\/admin\/accounts\/[^/]+$/.test(normalized)) return 'admin_accounts';
  return PATH_TO_TAB[normalized] ?? null;
}

export type PlanningSection =
  'annual-plan' | 'segments' | 'annual-distribution' | 'weekly' | 'calendar';

export function planningSectionForPath(pathname: string): PlanningSection | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const legacy: Record<string, PlanningSection> = {
    '/annual-plan': 'annual-plan',
    '/learning-segments': 'segments',
    '/annual-schedule': 'annual-distribution',
    '/weekly-schedule': 'weekly',
  };
  return legacy[normalized] ?? null;
}

/** تبويب البداية الافتراضي حسب دور المستخدم (نفس منطق getEffectiveTab سابقاً) */
export function defaultTabForRole(role: UserRole): NavTab {
  if (role === 'inspector') return 'inspector_portal';
  if (role === 'director') return 'director_portal';
  if (role === 'admin') return 'admin_portal';
  return 'dashboard';
}

/** التبويبات المسموحة لكل دور (مطابقة للقيد السري سابقاً في App.tsx) */
export const ROLE_TABS: Record<UserRole, NavTab[]> = {
  teacher: [
    'dashboard',
    'professional_hub',
    'planning',
    'daily_notebook',
    'lesson_plans',
    'lesson_command_center',
    'knowledge_engine',
    'gradebook',
    'attendance',
    'students',
    'reports',
    'settings',
  ],
  inspector: [
    'inspector_portal',
    'inspector_teachers',
    'inspector_approvals',
    'inspector_visits',
    'inspector_curriculum',
    'inspector_guidance',
    'inspector_communication',
    'professional_hub',
    'knowledge_engine',
    'reports',
    'settings',
  ],
  director: ['director_portal', 'professional_hub', 'knowledge_engine', 'reports', 'settings'],
  admin: [
    'admin_portal',
    'admin_accounts',
    'admin_pending_users',
    'admin_inspectors',
    'admin_services',
    'admin_approvals',
    'admin_curriculum',
    'admin_reports',
    'professional_hub',
    'knowledge_engine',
    'reports',
    'settings',
  ],
};

/** يرجع التبويب الفعلي المسموح عرضه للدور، مع السقوط إلى الصفحة الرئيسية للدور */
export function resolveTabForRole(tab: NavTab, role: UserRole): NavTab {
  const allowed = ROLE_TABS[role] ?? ROLE_TABS.teacher;
  return allowed.includes(tab) ? tab : defaultTabForRole(role);
}
