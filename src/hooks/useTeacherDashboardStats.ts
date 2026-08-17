import { useMemo } from 'react';
import { DailyNotebookEntry, User } from '../types/spex';
import {
  computeNotebookExecutionStats,
  resolveDistrictLabel,
  NotebookExecutionStats,
} from '../services/teacherDashboard.service';
import { DEFAULT_MUNICIPALITY, DEFAULT_SCHOOL_NAME } from '../constants/teacherDashboard.constants';

interface UseTeacherDashboardStatsResult extends NotebookExecutionStats {
  schoolName: string;
  municipality: string;
  districtLabel: string;
}

/**
 * useTeacherDashboardStats
 * يجمّع كل القيم المشتقة (derived state) التي تحتاجها لوحة قيادة الأستاذ،
 * حتى لا يُعاد حسابها داخل الـ JSX مباشرة.
 */
export function useTeacherDashboardStats(
  user: User,
  dailyNotebook: DailyNotebookEntry[]
): UseTeacherDashboardStatsResult {
  return useMemo(() => {
    const stats = computeNotebookExecutionStats(dailyNotebook);
    return {
      ...stats,
      schoolName: user.schoolName || DEFAULT_SCHOOL_NAME,
      municipality: user.municipality || DEFAULT_MUNICIPALITY,
      districtLabel: resolveDistrictLabel(user.districtId),
    };
  }, [user.schoolName, user.municipality, user.districtId, dailyNotebook]);
}
