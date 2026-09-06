import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Clock,
  Pencil,
  Plus,
  Printer,
  School,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { ClassRoom, User, WeeklyScheduleSlot } from '../../types/spex';
import {
  buildWeeklyTimetableSummary,
  durationMinutes,
  formatWeeklyMinutes,
  hasWeeklyOverlap,
  minutesFromTime,
  parseSlotTimes,
  validateWeeklyTime,
  WEEKDAYS,
  type WeeklyDay,
} from '../../services/weeklyTimetable';

interface WeeklyTimetableViewProps {
  scheduleSlots: WeeklyScheduleSlot[];
  teacherClasses: ClassRoom[];
  academicYearId: string;
  currentUser?: User;
  teacherName?: string;
  schoolName?: string;
  readOnly?: boolean;
  onAddSlot?: (slot: Omit<WeeklyScheduleSlot, 'id'>) => void;
  onUpdateSlot?: (slot: WeeklyScheduleSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
}

const classTone = (classId: string) => {
  const palette = [
    'border-sky-200 bg-sky-50 text-sky-950',
    'border-emerald-200 bg-emerald-50 text-emerald-950',
    'border-amber-200 bg-amber-50 text-amber-950',
    'border-indigo-200 bg-indigo-50 text-indigo-950',
  ];
  let hash = 0;
  for (const character of classId) hash = (hash * 31 + character.charCodeAt(0)) % palette.length;
  return palette[hash];
};

function formatSlot(slot: WeeklyScheduleSlot) {
  const { startTime, endTime } = parseSlotTimes(slot);
  return `${startTime} – ${endTime}`;
}

function timeFromMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const WeeklyTimetableView: React.FC<WeeklyTimetableViewProps> = ({
  scheduleSlots,
  teacherClasses,
  academicYearId,
  currentUser,
  teacherName = 'أستاذ المادة',
  schoolName = 'المؤسسة التعليمية',
  readOnly = false,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
}) => {
  const yearSlots = useMemo(
    () => scheduleSlots.filter((slot) => slot.academicYearId === academicYearId),
    [academicYearId, scheduleSlots]
  );
  const [editing, setEditing] = useState<WeeklyScheduleSlot | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [day, setDay] = useState<WeeklyDay>('الأحد');
  const [classId, setClassId] = useState(teacherClasses[0]?.id || '');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [formError, setFormError] = useState('');
  const teacherSlots = currentUser
    ? yearSlots.filter((slot) => slot.teacherId === currentUser.id)
    : yearSlots;
  const effectiveSummary = useMemo(() => buildWeeklyTimetableSummary(teacherSlots), [teacherSlots]);
  const slotsByDay = useMemo(
    () =>
      Object.fromEntries(
        WEEKDAYS.map((weekday) => [
          weekday,
          effectiveSummary.slots
            .filter((slot) => slot.day === weekday)
            .sort((left, right) =>
              parseSlotTimes(left).startTime.localeCompare(parseSlotTimes(right).startTime)
            ),
        ])
      ) as Record<WeeklyDay, typeof effectiveSummary.slots>,
    [effectiveSummary]
  );

  const openForm = (slot?: WeeklyScheduleSlot, preferredDay: WeeklyDay = 'الأحد') => {
    setIsFormOpen(true);
    setEditing(slot || null);
    setFormError('');
    if (slot) {
      const times = parseSlotTimes(slot);
      setDay(slot.day);
      setClassId(slot.classId);
      setStartTime(times.startTime);
      setEndTime(times.endTime);
      return;
    }

    const lastSlot = slotsByDay[preferredDay].at(-1);
    const lastEnd = lastSlot ? parseSlotTimes(lastSlot).endTime : '';
    const suggestedStart = lastEnd && lastEnd < '16:00' ? lastEnd : '08:00';
    setDay(preferredDay);
    setClassId(teacherClasses[0]?.id || '');
    setStartTime(suggestedStart);
    setEndTime(timeFromMinutes((minutesFromTime(suggestedStart) || 8 * 60) + 60));
  };

  const closeForm = () => {
    setEditing(null);
    setIsFormOpen(false);
    setFormError('');
  };

  const applyDuration = (minutes: number) => {
    const start = minutesFromTime(startTime);
    if (start === null || start + minutes > 17 * 60) {
      setFormError('المدة المختارة تتجاوز نهاية اليوم الدراسي عند 17:00.');
      return;
    }
    setEndTime(timeFromMinutes(start + minutes));
    setFormError('');
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateWeeklyTime(startTime, endTime);
    const classRoom = teacherClasses.find((item) => item.id === classId);
    const candidate: WeeklyScheduleSlot = {
      id: editing?.id || `ws_${Date.now()}`,
      teacherId: currentUser?.id || editing?.teacherId || '',
      day,
      timeSlot: `${startTime} - ${endTime}`,
      startTime,
      endTime,
      academicYearId,
      classId,
      className: classRoom?.name || editing?.className || 'قسم غير محدد',
      fieldId: editing?.fieldId || '',
      fieldName: editing?.fieldName || 'التربية البدنية والرياضية',
      venue: editing?.venue,
      sessionTitle: editing?.sessionTitle,
    };
    if (error) return setFormError(error);
    if (hasWeeklyOverlap(teacherSlots, candidate, editing?.id))
      return setFormError('لا يمكن إضافة حصة متداخلة مع حصة أخرى في اليوم نفسه.');
    if (editing) onUpdateSlot?.(candidate);
    else onAddSlot?.(candidate);
    closeForm();
  };

  return (
    <section className="weekly-timetable-workspace weekly-timetable-print space-y-4" dir="rtl">
      <header className="weekly-timetable-hero relative overflow-hidden rounded-3xl border p-5 shadow-sm print:shadow-none">
        <div className="weekly-timetable-sport-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="weekly-timetable-eyebrow text-xs font-semibold">التوقيت التربوي الرسمي</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <CalendarDays className="h-6 w-6" /> التوزيع الأسبوعي
            </h2>
            <p className="weekly-timetable-hero-copy mt-2 text-sm">
              نظّم حصصك من الأحد إلى الخميس، ثم عدّلها مباشرة من بطاقة اليوم.
            </p>
            <div className="weekly-timetable-identity mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="flex items-center gap-1.5">
                <School className="h-4 w-4" /> {schoolName}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {teacherName}
              </span>
              <span className="font-mono" dir="ltr">
                {academicYearId}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {!readOnly && (
              <button
                type="button"
                onClick={() => openForm()}
                className="weekly-timetable-primary-action flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" /> إضافة حصة
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="weekly-timetable-secondary-action flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <Printer className="h-4 w-4" /> طباعة التوقيت
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['عدد الأقسام', effectiveSummary.uniqueClasses],
            ['عدد الحصص', effectiveSummary.totalSessions],
            ['النصاب الأسبوعي', formatWeeklyMinutes(effectiveSummary.totalMinutes)],
            ['أيام العمل', effectiveSummary.workingDays],
          ].map(([label, value]) => (
            <div key={label} className="weekly-timetable-stat rounded-2xl border px-3 py-2.5">
              <span className="block text-[11px] font-medium">{label}</span>
              <strong className="mt-0.5 block text-base font-bold">{value}</strong>
            </div>
          ))}
        </div>
      </header>

      <section className="weekly-timetable-board rounded-3xl border border-slate-200 bg-white p-3 shadow-sm print:shadow-none sm:p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-900">لوحة أيام الأسبوع</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              اضغط «إضافة» داخل اليوم المطلوب لتعبئة التوقيت بسرعة.
            </p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
            ساعات العمل: 08:00 — 17:00
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5 print:gap-2">
          {WEEKDAYS.map((weekday) => {
            const weekdaySlots = slotsByDay[weekday];
            return (
              <article key={weekday} className="weekly-day-column min-w-0 rounded-2xl border p-2">
                <header className="weekly-day-heading rounded-xl px-3 py-2.5 text-center">
                  <h4 className="text-base font-bold">{weekday}</h4>
                  <p className="mt-0.5 text-[11px] font-medium">
                    {weekdaySlots.length} حصة ·{' '}
                    {formatWeeklyMinutes(effectiveSummary.dailyTotals[weekday])}
                  </p>
                </header>

                <div className="mt-2 space-y-2">
                  {weekdaySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`weekly-slot-card rounded-xl border p-3 shadow-xs ${classTone(slot.classId)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 font-bold leading-5">{slot.className}</span>
                        {!readOnly && (
                          <span className="flex shrink-0 gap-1 print:hidden">
                            <button
                              type="button"
                              aria-label={`تعديل حصة ${slot.className}`}
                              onClick={() => openForm(slot)}
                              className="weekly-slot-action rounded-lg p-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`حذف حصة ${slot.className}`}
                              onClick={() => onDeleteSlot?.(slot.id)}
                              className="weekly-slot-delete rounded-lg p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-current/10 pt-2">
                        <span
                          className="flex items-center gap-1 font-mono text-xs font-bold"
                          dir="ltr"
                        >
                          <Clock className="h-3.5 w-3.5" /> {formatSlot(slot)}
                        </span>
                        <span className="text-[10px] font-medium">
                          {formatWeeklyMinutes(durationMinutes(slot))}
                        </span>
                      </div>
                    </div>
                  ))}

                  {weekdaySlots.length === 0 && (
                    <div className="weekly-day-empty flex min-h-24 items-center justify-center rounded-xl border border-dashed p-3 text-center text-xs font-medium">
                      لا توجد حصة مبرمجة
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => openForm(undefined, weekday)}
                    className="weekly-day-add mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed px-2 py-2 text-xs font-semibold print:hidden"
                  >
                    <Plus className="h-3.5 w-3.5" /> إضافة في {weekday}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="weekly-timetable-summary rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">ملخص النصاب حسب القسم</h3>
          <span className="text-xs text-slate-500">محسوب تلقائيًا من الحصص أعلاه</span>
        </div>
        {Object.keys(effectiveSummary.classTotals).length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(effectiveSummary.classTotals).map(([itemClassId, item]) => (
              <div key={itemClassId} className={`rounded-2xl border p-3 ${classTone(itemClassId)}`}>
                <span className="block font-bold">{item.className}</span>
                <span className="text-xs">
                  {item.sessions} حصة · {formatWeeklyMinutes(item.minutes)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-center text-xs font-medium text-slate-500">
            سيظهر ملخص النصاب بعد إضافة أول حصة.
          </p>
        )}
      </section>

      {isFormOpen && !readOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 print:hidden">
          <form
            onSubmit={save}
            className="weekly-timetable-form w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            dir="rtl"
          >
            <div className="weekly-timetable-form-header flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[11px] font-medium">تعبئة سريعة للتوقيت</p>
                <h3 className="mt-0.5 text-lg font-bold">
                  {editing ? 'تعديل بيانات الحصة' : 'إضافة حصة جديدة'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="إغلاق نافذة الحصة"
                className="rounded-xl border border-white/25 bg-white/10 p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <fieldset>
                <legend className="mb-2 text-xs font-bold text-slate-700">1. اختر اليوم</legend>
                <div className="grid grid-cols-5 gap-1.5">
                  {WEEKDAYS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDay(item)}
                      className={`rounded-xl border px-1 py-2 text-xs font-semibold transition ${
                        day === item
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block text-xs font-bold text-slate-700">
                2. اختر القسم
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  {teacherClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="mb-2 text-xs font-bold text-slate-700">3. حدد التوقيت</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-slate-600">
                    من
                    <input
                      type="time"
                      min="08:00"
                      max="17:00"
                      step="300"
                      value={startTime}
                      onChange={(event) => {
                        const nextStart = event.target.value;
                        setStartTime(nextStart);
                        const nextStartMinutes = minutesFromTime(nextStart);
                        const currentEndMinutes = minutesFromTime(endTime);
                        if (
                          nextStartMinutes !== null &&
                          nextStartMinutes + 60 <= 17 * 60 &&
                          (currentEndMinutes === null || currentEndMinutes <= nextStartMinutes)
                        ) {
                          setEndTime(timeFromMinutes(nextStartMinutes + 60));
                        }
                      }}
                      className="mt-1 block w-full rounded-xl border border-slate-200 p-3 font-mono text-sm"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    إلى
                    <input
                      type="time"
                      min="08:00"
                      max="17:00"
                      step="300"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="mt-1 block w-full rounded-xl border border-slate-200 p-3 font-mono text-sm"
                    />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">مدة سريعة:</span>
                  {[45, 60, 90].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => applyDuration(minutes)}
                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
                    >
                      {minutes} دقيقة
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="weekly-timetable-form-preview flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-xs">
                <span className="font-semibold">{day}</span>
                <span>
                  {teacherClasses.find((item) => item.id === classId)?.name || 'اختر القسم'}
                </span>
                <span className="font-mono font-bold" dir="ltr">
                  {startTime} — {endTime}
                </span>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"
                >
                  {formError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <Check className="h-4 w-4" /> حفظ الحصة
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
