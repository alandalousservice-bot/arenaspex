import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnnualPlan, AnnualPlanKind, User } from '../types/spex';
import { approveAnnualPlan, fetchAnnualPlans, saveAnnualPlan } from '../services/api';

const DEFAULT_ACADEMIC_YEAR = '2025-2026';

/** مفتاح كل هدف ضمن المستوى الدراسي: `${fieldId}__${fieldSessionNumber}` */
export function objectiveKey(fieldId: string, sessionNumber: number): string {
  return `${fieldId}__${sessionNumber}`;
}

interface UseAnnualPlanObjectivesOptions {
  currentUser: User;
  /** الأستاذ صاحب المخطط. افتراضياً هو المستخدم الحالي عندما يكون أستاذاً */
  teacherId?: string;
  levelId: string;
  kind: AnnualPlanKind;
  academicYearId?: string;
}

/**
 * useAnnualPlanObjectives
 * يجلب الأهداف المعدَّلة (من الأستاذ) أو المقترحة (من المفتش) لمخطط/توزيع سنوي
 * معيّن، ويوفّر أدوات التعديل والحفظ والاعتماد.
 */
export function useAnnualPlanObjectives({
  currentUser,
  teacherId,
  levelId,
  kind,
  academicYearId = DEFAULT_ACADEMIC_YEAR
}: UseAnnualPlanObjectivesOptions) {
  const effectiveTeacherId = teacherId || (currentUser.role === 'teacher' ? currentUser.id : undefined);

  const [record, setRecord] = useState<AnnualPlan | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!effectiveTeacherId) return;
    setIsLoading(true);
    setError(null);
    const res = await fetchAnnualPlans({ teacherId: effectiveTeacherId, kind, levelId, academicYearId });
    if (res.success && res.annualPlans && res.annualPlans.length > 0) {
      const found = res.annualPlans[0];
      setRecord(found);
      const flat: Record<string, string> = {};
      Object.entries(found.data?.overrides || {}).forEach(([key, ov]) => {
        flat[key] = ov.objective;
      });
      setOverrides(flat);
    } else {
      setRecord(null);
      setOverrides({});
      if (!res.success && res.error) setError(res.error);
    }
    setIsLoading(false);
  }, [effectiveTeacherId, kind, levelId, academicYearId]);

  useEffect(() => {
    load();
  }, [load]);

  /** الأستاذ يعدّل هدفاً لديه (لا يُستعمل أثناء اقتراح المفتش) */
  const setObjective = useCallback((fieldId: string, sessionNumber: number, text: string) => {
    setOverrides((prev) => ({ ...prev, [objectiveKey(fieldId, sessionNumber)]: text }));
  }, []);

  const save = useCallback(
    async (note?: string) => {
      if (!effectiveTeacherId) return { success: false, error: 'لا يوجد أستاذ محدَّد.' };
      setIsSaving(true);
      setError(null);
      const dataPayload = {
        overrides: Object.fromEntries(
          Object.entries(overrides)
            .filter(([, text]) => text && text.trim().length > 0)
            .map(([key, text]) => [key, { objective: text.trim() }])
        ),
        note
      };
      const res = await saveAnnualPlan({
        id: record?.id,
        teacherId: effectiveTeacherId,
        academicYearId,
        levelId,
        kind,
        data: dataPayload
      });
      setIsSaving(false);
      if (res.success && res.annualPlan) {
        setRecord(res.annualPlan);
      } else if (res.error) {
        setError(res.error);
      }
      return res;
    },
    [effectiveTeacherId, academicYearId, levelId, kind, overrides, record?.id]
  );

  /** يعتمد المفتش اقتراحه الخاص فيصبح نافذاً عند الأستاذ */
  const approve = useCallback(async () => {
    if (!record?.id) return { success: false, error: 'لا يوجد اقتراح لاعتماده.' };
    const res = await approveAnnualPlan(record.id);
    if (res.success && res.annualPlan) setRecord(res.annualPlan);
    return res;
  }, [record?.id]);

  const isLockedForTeacher = useMemo(
    () => currentUser.role === 'teacher' && !!record && record.status !== 'draft',
    [currentUser.role, record]
  );

  return {
    record,
    overrides,
    isLoading,
    isSaving,
    error,
    setObjective,
    save,
    approve,
    reload: load,
    /** هل يوجد اقتراح من المفتش ينتظر الأستاذ الاطلاع عليه (بحالة مقترح أو معتمد) */
    isLockedForTeacher
  };
}
