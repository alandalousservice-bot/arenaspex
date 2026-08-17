/**
 * SPEX - Teacher Dashboard business logic
 * منطق حسابي/تحويلي بحت، منفصل عن طبقة العرض (Component) لتسهيل الاختبار وإعادة الاستخدام.
 */
import { DailyNotebookEntry } from '../types/spex';
import {
  DEFAULT_DISTRICT_LABEL,
  DEFAULT_SESSION_TITLE,
  DISTRICT_LABELS,
  NOTEBOOK_STATUS,
  SESSION_TITLES,
} from '../constants/teacherDashboard.constants';

export interface NotebookExecutionStats {
  completedCount: number;
  delayedCount: number;
  totalSessions: number;
  executionPercentage: number;
}

/**
 * يحسب مؤشرات تنفيذ الكراس اليومي (نفس المنطق الأصلي المضمّن سابقاً داخل الـ Component).
 */
export function computeNotebookExecutionStats(
  dailyNotebook: DailyNotebookEntry[]
): NotebookExecutionStats {
  const completedCount = dailyNotebook.filter((n) => n.status === NOTEBOOK_STATUS.DONE).length;
  const delayedCount = dailyNotebook.filter((n) => n.status === NOTEBOOK_STATUS.DELAYED).length;
  const totalSessions = dailyNotebook.length || 1;
  const executionPercentage = Math.round((completedCount / totalSessions) * 100);

  return { completedCount, delayedCount, totalSessions, executionPercentage };
}

/**
 * يحوّل معرّف الحصة (sessionId) إلى عنوانها الكامل المعروض للأستاذ.
 */
export function resolveSessionTitle(sessionId: string): string {
  return SESSION_TITLES[sessionId] ?? DEFAULT_SESSION_TITLE;
}

/**
 * يحوّل معرّف المقاطعة (districtId) إلى تسميتها المعروضة.
 */
export function resolveDistrictLabel(districtId?: string): string {
  if (!districtId) return DEFAULT_DISTRICT_LABEL;
  return DISTRICT_LABELS[districtId] ?? districtId;
}
