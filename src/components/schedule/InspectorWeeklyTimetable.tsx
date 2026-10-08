import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchInspectorWeeklyTimetable } from '../../services/api';
import {
  formatAcademicYearSelectLabel,
  getCurrentAcademicYear,
  isCanonicalAcademicYearId,
} from '../../services/academicYear';
import type { WeeklyScheduleSlot } from '../../types/spex';
import { WeeklyTimetableView } from './WeeklyTimetableView';
import './inspectorWeeklyPrint.css';

type Result = Awaited<ReturnType<typeof fetchInspectorWeeklyTimetable>>;

/** Current accepted supervision only; no local/legacy schedule fallback. */
export function InspectorWeeklyTimetable({
  teacherId,
  academicYearId,
}: {
  teacherId: string;
  academicYearId: string;
}) {
  const [year, setYear] = useState(academicYearId);
  const [data, setData] = useState<Result | null>(null);
  const [years, setYears] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    setYear(academicYearId);
    setYears([]);
    setData(null);
  }, [academicYearId, teacherId]);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setPrinting(false);
    void fetchInspectorWeeklyTimetable(teacherId, year)
      .then((result) => {
        if (!active) return;
        setData(result);
        setYears(result.academicYears.filter(isCanonicalAcademicYearId));
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [teacherId, year, refresh]);
  useEffect(() => {
    const update = () => setRefresh((value) => value + 1);
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  const options = [...new Set([getCurrentAcademicYear(), academicYearId, year, ...years])]
    .sort()
    .reverse();
  return (
    <section dir="rtl" className="min-w-0 space-y-3" aria-label="التوزيع الأسبوعي للأستاذ">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 print:hidden">
        <label className="text-sm font-bold">
          السنة الدراسية
          <select
            aria-label="سنة التوزيع الأسبوعي"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="mr-2 rounded-lg border p-2"
          >
            {options.map((value) => (
              <option key={value} value={value}>
                {formatAcademicYearSelectLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setRefresh((value) => value + 1)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          تحديث العرض
        </button>
        <p className="w-full text-xs text-slate-600">
          للقراءة فقط؛ يظهر التوقيت المحفوظ من الأستاذ مباشرة دون إرسال أو اعتماد.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
          {error}
        </p>
      ) : !data ? (
        <p role="status">جارٍ تحميل التوزيع الأسبوعي…</p>
      ) : (
        <WeeklyTimetableView
          key={`${teacherId}:${year}`}
          scheduleSlots={data.slots as WeeklyScheduleSlot[]}
          teacherClasses={[]}
          academicYearId={year}
          teacherName={`${data.teacher.firstName} ${data.teacher.lastName}`}
          schoolName={data.teacher.schoolName || 'المؤسسة غير محددة'}
          readOnly
          onPrint={() => setPrinting(true)}
        />
      )}
      {printing &&
        data &&
        createPortal(
          <div className="inspector-weekly-print-root" dir="rtl">
            <button
              type="button"
              onClick={() => setPrinting(false)}
              className="m-4 rounded-xl border bg-white px-4 py-2 print:hidden"
            >
              إغلاق معاينة التوقيت
            </button>
            <WeeklyTimetableView
              scheduleSlots={data.slots as WeeklyScheduleSlot[]}
              teacherClasses={[]}
              academicYearId={year}
              teacherName={`${data.teacher.firstName} ${data.teacher.lastName}`}
              schoolName={data.teacher.schoolName || 'المؤسسة غير محددة'}
              readOnly
            />
          </div>,
          document.body
        )}
    </section>
  );
}
