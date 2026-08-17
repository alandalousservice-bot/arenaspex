import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnnualPlan, AnnualPlanKind, AnnualPlanObjectiveOverride, User } from '../types/spex';
import { approveAnnualPlan, fetchAnnualPlans, saveAnnualPlan } from '../services/api';

const DEFAULT_ACADEMIC_YEAR = '2025-2026';

/** مفتاح تخصيص على مستوى الحصة: `${fieldId}__${fieldSessionNumber}` */
export function lessonKey(fieldId: string, sessionNumber: number): string {
  return `${fieldId}__${sessionNumber}`;
}

interface UseCurriculumOverridesOptions {
  currentUser: User;
  /** الأستاذ صاحب السجل. افتراضياً هو المستخدم الحالي عندما يكون أستاذاً */
  teacherId?: string;
  levelId: string;
  kind: AnnualPlanKind;
  academicYearId?: string;
}

/**
 * useCurriculumOverrides
 * نسخة عامة تُستعمل عبر الوحدات الأربع (المخطط السنوي، المقاطع التعليمية، التوزيع
 * السنوي، الكراس اليومي) لقراءة وتعديل تخصيصات الأستاذ (أو اقتراحات المفتش)
 * بالاعتماد على نموذج AnnualPlan نفسه (بدون تكرار البيانات أو نماذج جديدة في القاعدة)،
 * مع دعم الرجوع الفوري للصياغة الرسمية.
 */
export function useCurriculumOverrides({
  currentUser,
  teacherId,
  levelId,
  kind,
  academicYearId = DEFAULT_ACADEMIC_YEAR
}: UseCurriculumOverridesOptions) {
  const effectiveTeacherId = teacherId || (currentUser.role === 'teacher' ? currentUser.id : undefined);

  const [record, setRecord] = useState<AnnualPlan | null>(null);
  const [values, setValues] = useState<Record<string, AnnualPlanObjectiveOverride>>({});
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
      setValues(found.data?.overrides || {});
    } else {
      setRecord(null);
      setValues({});
      if (!res.success && res.error) setError(res.error);
    }
    setIsLoading(false);
  }, [effectiveTeacherId, kind, levelId, academicYearId]);

  useEffect(() => {
    load();
  }, [load]);

  /** يعدّل الأستاذ تخصيصاً لمفتاح معيّن محلياً (دمج جزئي)، دون حفظ فوري */
  const setValue = useCallback((key: string, patch: Partial<AnnualPlanObjectiveOverride>) => {
    setValues((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const persist = useCallback(
    async (nextValues: Record<string, AnnualPlanObjectiveOverride>, note?: string) => {
      if (!effectiveTeacherId) return { success: false, error: 'لا يوجد أستاذ محدَّد.' };
      setIsSaving(true);
      setError(null);
      // تنظيف القيم الفارغة قبل الحفظ (مصفوفة فارغة أو نص فارغ لا يُعتبر تخصيصاً)
      const cleaned: Record<string, AnnualPlanObjectiveOverride> = {};
      Object.entries(nextValues).forEach(([key, v]) => {
        if (!v) return;
        const hasContent = Object.values(v).some((x) => (Array.isArray(x) ? x.length > 0 : Boolean(x)));
        if (hasContent) cleaned[key] = v;
      });
      const res = await saveAnnualPlan({
        id: record?.id,
        teacherId: effectiveTeacherId,
        academicYearId,
        levelId,
        kind,
        data: { overrides: cleaned, note }
      });
      setIsSaving(false);
      if (res.success && res.annualPlan) {
        setRecord(res.annualPlan);
        setValues(res.annualPlan.data?.overrides || {});
      } else if (res.error) {
        setError(res.error);
      }
      return res;
    },
    [effectiveTeacherId, academicYearId, levelId, kind, record?.id]
  );

  /** يحفظ كل التعديلات المحلية الحالية */
  const save = useCallback((note?: string) => persist(values, note), [persist, values]);

  /** يعدّل ويحفظ تخصيصاً واحداً فوراً (يُستعمل للتفاعلات الفورية كتغيير حالة الإنجاز أو التأجيل) */
  const setValueAndSave = useCallback(
    (key: string, patch: Partial<AnnualPlanObjectiveOverride>) => {
      const next = { ...values, [key]: { ...values[key], ...patch } };
      setValues(next);
      return persist(next);
    },
    [values, persist]
  );

  /** يعيد المفتاح إلى الصياغة الرسمية فوراً (حذف التخصيص وحفظه) — "Teachers can restore official wording at any time" */
  const restore = useCallback(
    (key: string) => {
      const next = { ...values };
      delete next[key];
      setValues(next);
      return persist(next);
    },
    [values, persist]
  );

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
    values,
    isLoading,
    isSaving,
    error,
    setValue,
    setValueAndSave,
    save,
    restore,
    approve,
    reload: load,
    /** هل يوجد اقتراح من المفتش ينتظر الأستاذ الاطلاع عليه (بحالة مقترح أو معتمد) */
    isLockedForTeacher
  };
}
