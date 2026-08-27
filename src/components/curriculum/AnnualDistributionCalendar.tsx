import React, { useMemo } from 'react';
import { BookOpen, CalendarDays, NotebookPen, Printer, RefreshCw } from 'lucide-react';
import {
  ALGERIAN_SCHOOL_HOLIDAYS_2025_2026,
  PE_FIELDS,
  PE_LEVELS,
} from '../../data/algerianCurriculum';
import type { ClassRoom, User } from '../../types/spex';
import type { TeacherPlanningReference, TeacherPlanningSession } from '../../services/api';

interface AnnualDistributionCalendarProps {
  currentUser: User;
  selectedClass: ClassRoom;
  academicYearId: string;
  planningStartDate: string;
  sessions: TeacherPlanningSession[];
  loading: boolean;
  saving: string | null;
  error: string;
  onPlanningStartDateChange: (value: string) => void;
  onInitialize: () => void;
  onUpdateDate: (session: TeacherPlanningSession, value: string) => void;
}

const MONTHS = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export type AnnualCalendarRow =
  | { kind: 'lesson'; date: string; session: TeacherPlanningSession }
  | {
      kind: 'holiday';
      date: string;
      holiday: (typeof ALGERIAN_SCHOOL_HOLIDAYS_2025_2026)[number];
    };

export function buildAnnualCalendarRows(sessions: TeacherPlanningSession[]): AnnualCalendarRow[] {
  const lessonRows: AnnualCalendarRow[] = sessions.map((session) => ({
    kind: 'lesson',
    date: session.plannedDate,
    session,
  }));
  const firstDate = sessions[0]?.plannedDate || '';
  const lastDate = sessions.at(-1)?.plannedDate || '';
  const holidayRows: AnnualCalendarRow[] = ALGERIAN_SCHOOL_HOLIDAYS_2025_2026.filter(
    (holiday) => !lastDate || holiday.startDate <= lastDate
  )
    .filter((holiday) => !firstDate || holiday.endDate >= firstDate)
    .map((holiday) => ({ kind: 'holiday', date: holiday.startDate, holiday }));
  return [...lessonRows, ...holidayRows].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.kind === 'holiday' ? -1 : 1)
  );
}

const holidayTone = (name: string) => {
  if (name.includes('الخريف') || name.includes('الثورة')) return 'bg-amber-50 text-amber-900';
  if (name.includes('الشتاء')) return 'bg-blue-50 text-blue-900';
  if (name.includes('الربيع') || name.includes('الفطر')) return 'bg-emerald-50 text-emerald-900';
  return 'bg-yellow-50 text-yellow-900';
};

const typeTone = (reference?: TeacherPlanningReference | null) => {
  if (reference?.sessionType === 'تقويم تشخيصي') return 'bg-amber-100 text-amber-800';
  if (reference?.sessionType === 'إدماجية') return 'bg-purple-100 text-purple-800';
  if (reference?.sessionType === 'تقويم تحصيلي') return 'bg-emerald-100 text-emerald-800';
  if (reference?.sessionType === 'تعارف وتنظيم') return 'bg-slate-100 text-slate-700';
  return 'bg-blue-100 text-blue-800';
};

function displayDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day} / ${month} / ${year}`;
}

function monthName(value: string): string {
  const month = Number(value.slice(5, 7));
  return MONTHS[month - 1] || value.slice(0, 7);
}

export const AnnualDistributionCalendar: React.FC<AnnualDistributionCalendarProps> = ({
  currentUser,
  selectedClass,
  academicYearId,
  planningStartDate,
  sessions,
  loading,
  saving,
  error,
  onPlanningStartDateChange,
  onInitialize,
  onUpdateDate,
}) => {
  const calendarRows = useMemo(() => buildAnnualCalendarRows(sessions), [sessions]);
  const levelName =
    PE_LEVELS.find((level) => level.id === selectedClass.levelId)?.name || selectedClass.levelId;
  const teacherName = `${currentUser.firstName} ${currentUser.lastName}`.trim();

  return (
    <section className="annual-distribution-print space-y-4" dir="rtl">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">التوزيع السنوي</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">{selectedClass.name}</h2>
            <p className="mt-1 text-xs text-slate-500">السنة الدراسية: {academicYearId}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-slate-600">
              بداية الحصص
              <input
                type="date"
                value={planningStartDate}
                onChange={(event) => onPlanningStartDateChange(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
              />
            </label>
            <button
              onClick={onInitialize}
              disabled={!planningStartDate || loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {sessions.length ? 'إعادة المحاولة' : 'توليد التوزيع السنوي'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!sessions.length || loading}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> طباعة التوزيع السنوي
            </button>
          </div>
        </div>
      </div>

      {sessions.length > 0 && (
        <header className="annual-distribution-document-header hidden border border-slate-300 bg-white p-4 text-center print:block">
          <p className="text-[10px] font-bold text-slate-600">
            الجمهورية الجزائرية الديمقراطية الشعبية
          </p>
          <p className="text-[10px] font-bold text-slate-600">وزارة التربية الوطنية</p>
          <div className="my-2 border-y border-slate-200 py-2">
            <h1 className="text-xl font-extrabold text-slate-900">التوزيع السنوي</h1>
            <p className="mt-1 text-sm font-bold text-blue-800">لمادة التربية البدنية والرياضية</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right text-[10px] sm:grid-cols-5">
            {[
              ['المؤسسة', currentUser.schoolName || ''],
              ['الأستاذ', teacherName],
              ['المستوى', levelName],
              ['القسم', selectedClass.name],
              ['السنة الدراسية', academicYearId],
            ].map(([label, value]) => (
              <div key={label} className="border border-slate-200 bg-slate-50 px-2 py-1.5">
                <span className="block font-bold text-slate-500">{label}</span>
                <span className="mt-0.5 block font-extrabold text-slate-900">{value || ' '}</span>
              </div>
            ))}
          </div>
        </header>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">جارٍ تحميل التوزيع...</p>
      )}
      {!loading && sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          لم يتم إنشاء التوزيع السنوي لهذا القسم بعد. اختر تاريخ بداية الحصص ثم ولّد التوزيع.
        </div>
      )}
      {sessions.length > 0 && (
        <div className="annual-distribution-table overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs print:overflow-visible print:shadow-none">
          <table className="w-full min-w-[720px] text-right text-xs print:min-w-0">
            <caption className="border-b border-slate-200 bg-slate-50 p-4 text-right text-sm font-extrabold text-slate-900 print:hidden">
              التوزيع السنوي للحصص التعليمية — {selectedClass.name} — {academicYearId}
            </caption>
            <thead className="bg-slate-900 text-white print:table-header-group">
              <tr>
                <th className="w-[16%] p-3">الشهر</th>
                <th className="w-[22%] p-3">التاريخ</th>
                <th className="w-[30%] p-3">نوع الحصة</th>
                <th className="w-[32%] p-3">الميدان</th>
                <th className="w-40 p-3 print:hidden">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                let lastMonth = '';
                return calendarRows.map((row) => {
                  if (row.kind === 'holiday') {
                    return (
                      <tr
                        key={`holiday-${row.holiday.startDate}`}
                        className={holidayTone(row.holiday.name)}
                      >
                        <td colSpan={5} className="border-y border-current/10 p-3 font-extrabold">
                          عطلة: {row.holiday.name} · من {displayDate(row.holiday.startDate)} إلى{' '}
                          {displayDate(row.holiday.endDate)}
                        </td>
                      </tr>
                    );
                  }
                  const reference = row.session.reference;
                  const currentMonth = monthName(row.date);
                  const showMonth = currentMonth !== lastMonth;
                  lastMonth = currentMonth;
                  return (
                    <tr key={row.session.id} className="break-inside-avoid hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-700">
                        {showMonth ? currentMonth : ''}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        <span className="hidden print:inline">{displayDate(row.date)}</span>
                        <input
                          aria-label={`تاريخ الحصة ${reference?.sequenceIndex || row.session.id}`}
                          type="date"
                          defaultValue={row.date.slice(0, 10)}
                          onBlur={(event) => {
                            if (event.target.value && event.target.value !== row.date.slice(0, 10))
                              onUpdateDate(row.session, event.target.value);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono print:hidden"
                        />
                        {saving === row.session.id && (
                          <span className="mr-2 text-[10px] text-slate-400">يحفظ...</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-lg px-2.5 py-1 font-bold ${typeTone(reference)}`}>
                          {reference?.sessionTypeLabel || 'نوع حصة غير متاح'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {reference?.domainId === 'intro'
                          ? '—'
                          : reference?.fieldName ||
                            PE_FIELDS.find((field) => field.id === reference?.domainId)?.name ||
                            '—'}
                      </td>
                      <td className="flex gap-2 p-3 print:hidden">
                        <a
                          href={`/lesson-plans?classId=${encodeURIComponent(row.session.classId)}&classPlannedSessionId=${encodeURIComponent(row.session.id)}&academicYearId=${encodeURIComponent(row.session.academicYearId)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 font-bold text-blue-700"
                        >
                          <BookOpen className="h-3.5 w-3.5" /> المذكرة
                        </a>
                        <a
                          href={`/daily-notebook?classId=${encodeURIComponent(row.session.classId)}&classPlannedSessionId=${encodeURIComponent(row.session.id)}&academicYearId=${encodeURIComponent(row.session.academicYearId)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-700"
                        >
                          <NotebookPen className="h-3.5 w-3.5" /> الكراس
                        </a>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          <p className="flex items-center gap-2 border-t border-slate-100 p-3 text-[11px] font-bold text-slate-500 print:hidden">
            <CalendarDays className="h-4 w-4" /> التواريخ مستخرجة من التوزيع المحفوظ، وتُرفض أيام
            العطل والعطلة الأسبوعية عند التعديل.
          </p>
        </div>
      )}
      {sessions.length > 0 && (
        <footer className="annual-distribution-document-footer hidden border-t border-slate-300 pt-3 text-xs font-bold text-slate-700 print:grid">
          <div>الأستاذ: {teacherName || ' '}</div>
          <div className="text-left">المفتش: </div>
          <div className="col-span-2 mt-2 flex justify-between border-t border-slate-200 pt-2 text-[10px] font-normal text-slate-500">
            <span>ArenaSpex</span>
            <span>السنة الدراسية {academicYearId}</span>
          </div>
        </footer>
      )}
    </section>
  );
};
