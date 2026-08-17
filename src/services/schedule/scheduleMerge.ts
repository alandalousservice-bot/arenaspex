/**
 * SPEX - Schedule Merge Utility
 * يدمج الحصص المحسوبة آلياً (التوزيع الأساسي وتفادي العطل) مع تخصيصات الأستاذ
 * (تأجيل/إعادة برمجة يدوية، حالة التنفيذ، صياغة الحصة وملاحظاتها)، ليُستعمل كمصدر
 * وحيد للبيانات من طرف التوزيع السنوي والكراس اليومي معاً — بدون أي تكرار للبيانات.
 */
import { ScheduledAnnualSession } from '../../data/algerianCurriculum';
import { AnnualPlanObjectiveOverride, LessonExecutionStatus } from '../../types/spex';

export interface MergedScheduledLesson extends Omit<ScheduledAnnualSession, 'status'> {
  /** مفتاح فريد للحصة: `${fieldId}__${fieldSessionNumber}` */
  key: string;
  status: LessonExecutionStatus;
  /** هل تم تعديل تاريخ هذه الحصة يدوياً (تأجيل/إعادة برمجة) من التوزيع الآلي الأصلي */
  isManuallyRescheduled: boolean;
  /** التاريخ المحسوب آلياً الأصلي (قبل أي تعديل يدوي) للمقارنة */
  originalScheduledDate: string;
  /** صياغة الهدف المعدَّلة من طرف الأستاذ في المقاطع التعليمية (إن وُجدت) */
  wordingOverride?: string;
  /** ملاحظة الأستاذ على مضمون الحصة (من المقاطع التعليمية) */
  contentNote?: string;
  /** ملاحظة الأستاذ عند تنفيذ الحصة (من الكراس اليومي) */
  executionNote?: string;
}

export function lessonKeyOf(fieldId: string, fieldSessionNumber: number): string {
  return `${fieldId}__${fieldSessionNumber}`;
}

/**
 * يدمج القائمة الأساسية المحسوبة آلياً مع تخصيصات التاريخ/الحالة (kind: schedule_dates)
 * وتخصيصات الصياغة/الملاحظات (kind: section_wording)، ويعيد القائمة مرتبة زمنياً.
 */
export function mergeSchedule(
  base: ScheduledAnnualSession[],
  scheduleOverrides: Record<string, AnnualPlanObjectiveOverride>,
  sectionOverrides: Record<string, AnnualPlanObjectiveOverride> = {}
): MergedScheduledLesson[] {
  return base
    .map((session) => {
      const key = lessonKeyOf(session.fieldId, session.fieldSessionNumber);
      const schedOv = scheduleOverrides[key];
      const sectionOv = sectionOverrides[key];

      return {
        ...session,
        key,
        scheduledDate: schedOv?.date || session.scheduledDate,
        originalScheduledDate: session.scheduledDate,
        isManuallyRescheduled: Boolean(schedOv?.date && schedOv.date !== session.scheduledDate),
        status: (schedOv?.status as LessonExecutionStatus) || session.status,
        executionNote: schedOv?.executionNote,
        wordingOverride: sectionOv?.objective,
        contentNote: sectionOv?.teacherNote
      } satisfies MergedScheduledLesson;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.globalSessionNumber - b.globalSessionNumber);
}

/** يحسب نسبة الإنجاز (٪) لقائمة حصص مدمجة */
export function computeCompletionStats(lessons: MergedScheduledLesson[]) {
  const total = lessons.length;
  const completed = lessons.filter((l) => l.status === 'منجزة').length;
  const postponed = lessons.filter((l) => l.status === 'مؤجلة').length;
  const remaining = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, postponed, remaining, percentage };
}

/** يجد أقرب حصة "اليوم" ضمن قائمة مدمجة: أول حصة غير منجزة بتاريخ <= اليوم، وإلا أقرب حصة قادمة */
export function findTodayLessonIndex(lessons: MergedScheduledLesson[], todayISO: string): number {
  if (lessons.length === 0) return -1;
  const pastDueUnfinished = lessons.findIndex((l) => l.scheduledDate <= todayISO && l.status !== 'منجزة');
  if (pastDueUnfinished !== -1) {
    // آخر حصة غير منجزة ضمن الماضي/اليوم (الأقرب إلى اليوم)
    let idx = pastDueUnfinished;
    for (let i = pastDueUnfinished; i < lessons.length; i++) {
      if (lessons[i].scheduledDate <= todayISO && lessons[i].status !== 'منجزة') idx = i;
      else break;
    }
    return idx;
  }
  const nextUpcoming = lessons.findIndex((l) => l.scheduledDate >= todayISO);
  return nextUpcoming !== -1 ? nextUpcoming : lessons.length - 1;
}
