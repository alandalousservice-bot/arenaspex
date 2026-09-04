import { useCallback, useEffect, useState } from 'react';
import type { User, TeacherLearningPlanData } from '../types/spex';
import { fetchTeacherLearningPlan, saveTeacherLearningPlan } from '../services/api';
import {
  asTeacherLearningPlanData,
  type TeacherLearningPlan,
} from '../services/teacherLearningPlan.service';

interface UseTeacherLearningPlanOptions {
  currentUser: User;
  levelId: string;
  academicYearId: string;
}

export function useTeacherLearningPlan({
  currentUser,
  levelId,
  academicYearId,
}: UseTeacherLearningPlanOptions) {
  const [plan, setPlan] = useState<TeacherLearningPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (nextPlan: TeacherLearningPlan) => {
      setPlan(nextPlan);
      setIsSaving(true);
      setError(null);
      try {
        const result = await saveTeacherLearningPlan(
          levelId,
          academicYearId,
          asTeacherLearningPlanData(nextPlan)
        );
        if (!result.success || !result.plan) {
          setError(result.error || 'تعذر حفظ خطة الأستاذ.');
          return { success: false, error: result.error };
        }
        setPlan(result.plan);
        return result;
      } catch (reason: unknown) {
        const message = reason instanceof Error ? reason.message : 'تعذر حفظ خطة الأستاذ.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsSaving(false);
      }
    },
    [academicYearId, levelId]
  );

  const load = useCallback(async () => {
    if (currentUser.role !== 'teacher') {
      setPlan(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchTeacherLearningPlan(levelId, academicYearId);
      if (!result.success || !result.plan) {
        if (result.error) setError(result.error);
        setPlan(null);
        return;
      }
      setPlan(result.plan);
      if (result.initialized === false) void persist(result.plan);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل خطة الأستاذ.');
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [academicYearId, currentUser.role, levelId, persist]);

  useEffect(() => {
    void load();
  }, [load]);

  return { plan, isLoading, isSaving, error, persist, reload: load };
}

export type { TeacherLearningPlanData };
