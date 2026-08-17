import { useMemo } from 'react';
import {
  User,
  DailyNotebookEntry,
  InspectorNote,
  InspectionVisit,
  LessonPlan,
  DistrictBroadcast,
} from '../types/spex';
import {
  computeInspectorGlobalStats,
  InspectorGlobalStats,
} from '../services/inspectorDashboard.service';

export function useInspectorDashboardStats(
  teachers: User[],
  dailyNotebook: DailyNotebookEntry[],
  notes: InspectorNote[],
  visits: InspectionVisit[],
  lessonPlans: LessonPlan[],
  broadcasts: DistrictBroadcast[] = []
): InspectorGlobalStats {
  return useMemo(
    () => computeInspectorGlobalStats(teachers, dailyNotebook, notes, visits, lessonPlans, broadcasts),
    [teachers, dailyNotebook, notes, visits, lessonPlans, broadcasts]
  );
}
