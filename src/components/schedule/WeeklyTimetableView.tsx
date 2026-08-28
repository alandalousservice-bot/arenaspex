import React, { useMemo, useState } from 'react';
import { Clock, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import type { ClassRoom, User, WeeklyScheduleSlot } from '../../types/spex';
import {
  buildWeeklyTimetableSummary,
  durationMinutes,
  formatWeeklyMinutes,
  hasWeeklyOverlap,
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

const START_MINUTES = 8 * 60;
const END_MINUTES = 17 * 60;
const ROW_HEIGHT = 42;
const timeLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const classTone = (classId: string) => {
  const palette = [
    'border-blue-200 bg-blue-50 text-blue-950',
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

  const openForm = (slot?: WeeklyScheduleSlot) => {
    setIsFormOpen(true);
    setEditing(slot || null);
    setFormError('');
    if (slot) {
      const times = parseSlotTimes(slot);
      setDay(slot.day);
      setClassId(slot.classId);
      setStartTime(times.startTime);
      setEndTime(times.endTime);
    } else {
      setDay('الأحد');
      setClassId(teacherClasses[0]?.id || '');
      setStartTime('08:00');
      setEndTime('09:00');
    }
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
    setEditing(null);
    setIsFormOpen(false);
  };

  return (
    <section className="weekly-timetable-print space-y-4" dir="rtl">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs print:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">التوقيت الأسبوعي</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <Clock className="h-6 w-6 text-blue-600" /> التوزيع الأسبوعي
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {schoolName} · {teacherName} · السنة الدراسية {academicYearId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {!readOnly && (
              <button
                type="button"
                onClick={() => openForm()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4" /> إضافة حصة
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              <Printer className="h-4 w-4" /> طباعة التوقيت
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['عدد الأقسام', effectiveSummary.uniqueClasses],
            ['عدد الحصص', effectiveSummary.totalSessions],
            ['النصاب الأسبوعي', formatWeeklyMinutes(effectiveSummary.totalMinutes)],
            ['أيام العمل', effectiveSummary.workingDays],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="block text-xs font-bold text-slate-500">{label}</span>
              <strong className="mt-1 block text-lg font-extrabold text-slate-900">{value}</strong>
            </div>
          ))}
        </div>
      </header>

      {effectiveSummary.totalSessions === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
          لم يقم الأستاذ بإعداد التوزيع الأسبوعي بعد.
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs print:shadow-none">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="rounded-xl bg-slate-50 p-2 text-center text-xs font-bold text-slate-600"
              >
                {weekday}
                <span className="mt-1 block text-sm font-extrabold text-slate-900">
                  {formatWeeklyMinutes(effectiveSummary.dailyTotals[weekday])}
                </span>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <div
              className="relative grid min-w-[860px] grid-cols-[64px_repeat(5,minmax(150px,1fr))]"
              style={{ height: `${((END_MINUTES - START_MINUTES) / 30) * ROW_HEIGHT}px` }}
            >
              <div className="relative border-l border-slate-200 bg-slate-50">
                {Array.from({ length: 19 }, (_, index) => (
                  <span
                    key={index}
                    className="absolute left-1 top-0 -translate-y-1/2 text-[10px] font-bold text-slate-500"
                    style={{ top: `${index * ROW_HEIGHT * 2}px` }}
                  >
                    {timeLabel(START_MINUTES + index * 30)}
                  </span>
                ))}
              </div>
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="relative border-l border-slate-200 bg-white">
                  {Array.from({ length: 18 }, (_, index) => (
                    <div
                      key={index}
                      className="absolute inset-x-0 border-t border-slate-100"
                      style={{ top: `${index * ROW_HEIGHT}px` }}
                    />
                  ))}
                  {effectiveSummary.slots
                    .filter((slot) => slot.day === weekday)
                    .map((slot) => {
                      const times = parseSlotTimes(slot);
                      const start =
                        Number(times.startTime.slice(0, 2)) * 60 +
                        Number(times.startTime.slice(3)) -
                        START_MINUTES;
                      const height = Math.max((durationMinutes(slot) / 30) * ROW_HEIGHT - 4, 28);
                      return (
                        <div
                          key={slot.id}
                          className={`absolute inset-x-1 z-10 overflow-hidden rounded-xl border p-2 text-xs shadow-xs ${classTone(slot.classId)}`}
                          style={{
                            top: `${(start / 30) * ROW_HEIGHT + 2}px`,
                            height: `${height}px`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-extrabold">{slot.className}</span>
                            {!readOnly && (
                              <span className="flex gap-1 print:hidden">
                                <button
                                  type="button"
                                  aria-label="تعديل الحصة"
                                  onClick={() => openForm(slot)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="حذف الحصة"
                                  onClick={() => onDeleteSlot?.(slot.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                </button>
                              </span>
                            )}
                          </div>
                          <span className="block font-mono font-bold">{formatSlot(slot)}</span>
                          <span className="block text-[10px]">
                            {formatWeeklyMinutes(durationMinutes(slot))}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs print:shadow-none">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">ملخص النصاب حسب القسم</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(effectiveSummary.classTotals).map((item) => (
            <div
              key={item.className}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
            >
              <span className="block font-extrabold text-slate-900">{item.className}</span>
              <span className="text-xs text-slate-600">
                {item.sessions} حصة · {formatWeeklyMinutes(item.minutes)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {isFormOpen && !readOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 print:hidden">
          <form
            onSubmit={save}
            className="w-full max-w-md space-y-4 rounded-3xl bg-white p-5 shadow-2xl"
            dir="rtl"
          >
            <h3 className="text-lg font-extrabold text-slate-900">
              {editing ? 'تعديل الحصة' : 'إضافة حصة'}
            </h3>
            <label className="block text-xs font-bold">
              اليوم
              <select
                value={day}
                onChange={(event) => setDay(event.target.value as WeeklyDay)}
                className="mt-1 block w-full rounded-xl border border-slate-200 p-2"
              >
                {WEEKDAYS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold">
              القسم
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 p-2"
              >
                {teacherClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold">
                من
                <input
                  type="time"
                  min="08:00"
                  max="17:00"
                  step="300"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 p-2"
                />
              </label>
              <label className="text-xs font-bold">
                إلى
                <input
                  type="time"
                  min="08:00"
                  max="17:00"
                  step="300"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 p-2"
                />
              </label>
            </div>
            {formError && (
              <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setIsFormOpen(false);
                }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
              >
                حفظ
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
