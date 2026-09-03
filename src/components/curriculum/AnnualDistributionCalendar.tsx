import React, { useMemo } from 'react';
import { CalendarDays, Printer, RefreshCw } from 'lucide-react';
import type { User } from '../../types/spex';
import {
  getCalendarEventsForDisplay,
  type AcademicCalendarEvent,
} from '../../data/academicCalendars';
import type {
  TeacherAnnualDistributionPedagogicalUnit,
  TeacherAnnualDistributionResponse,
  TeacherAnnualDistributionWeek,
} from '../../services/api';
import type { PrimaryLevelId } from '../../services/primaryLevel.service';
import { AcademicYearLabel } from '../common/AcademicYearLabel';

interface AnnualDistributionCalendarProps {
  currentUser: User;
  selectedLevelId: PrimaryLevelId;
  academicYearId: string;
  planningStartDate: string;
  loading: boolean;
  error: string;
  annualGeneration: TeacherAnnualDistributionResponse | null;
  onLevelChange: (levelId: PrimaryLevelId) => void;
  onPlanningStartDateChange: (value: string) => void;
  onInitialize: () => void;
  onNavigateToCalendar: () => void;
}

export type AnnualDistributionRow =
  | {
      kind: 'week';
      week: TeacherAnnualDistributionWeek;
    }
  | {
      kind: 'holiday';
      holiday: AcademicCalendarEvent;
    };

export function buildAnnualDistributionRows(
  weeks: TeacherAnnualDistributionWeek[],
  planningStartDate?: string,
  academicYearId?: string
): AnnualDistributionRow[] {
  const weekRows = weeks.map((week) => ({ kind: 'week' as const, week }));
  if (!planningStartDate || !academicYearId) return weekRows;
  const holidays = seasonalHolidays(academicYearId);
  if (!holidays.length) return weekRows;
  const firstDate = annualDistributionWeekStart(planningStartDate, 1, academicYearId);
  const lastDate = annualDistributionWeekStart(
    planningStartDate,
    weeks.at(-1)?.weekIndex || 1,
    academicYearId
  );
  const rangeStart = firstDate;
  const rangeEnd = formatISODate(addUtcDays(lastDate, 4));
  const holidayRows = holidays
    .filter((holiday) => holiday.endDate >= rangeStart && holiday.startDate <= rangeEnd)
    .map((holiday) => ({ kind: 'holiday' as const, holiday }));
  return [...weekRows, ...holidayRows].sort((left, right) => {
    const leftDate =
      left.kind === 'holiday'
        ? left.holiday.startDate
        : annualDistributionWeekStart(planningStartDate, left.week.weekIndex, academicYearId);
    const rightDate =
      right.kind === 'holiday'
        ? right.holiday.startDate
        : annualDistributionWeekStart(planningStartDate, right.week.weekIndex, academicYearId);
    return leftDate.localeCompare(rightDate) || (left.kind === 'holiday' ? -1 : 1);
  });
}

function seasonalHolidays(academicYearId: string): AcademicCalendarEvent[] {
  return getCalendarEventsForDisplay(academicYearId).filter((event) =>
    ['عطلة الخريف', 'عطلة الشتاء', 'عطلة الربيع'].includes(event.name)
  );
}

const typeTone = (unit: TeacherAnnualDistributionPedagogicalUnit) => {
  if (unit.sessionType === 'تقويم تشخيصي') return 'bg-amber-100 text-amber-800';
  if (unit.sessionType === 'إدماجية') return 'bg-purple-100 text-purple-800';
  if (unit.sessionType === 'تقويم تحصيلي') return 'bg-emerald-100 text-emerald-800';
  if (unit.sessionType === 'تعارف وتنظيم') return 'bg-slate-100 text-slate-700';
  return 'bg-blue-100 text-blue-800';
};

export function annualDistributionMeetingLabel(
  unit: TeacherAnnualDistributionPedagogicalUnit,
  learningUnitNumber?: number
): string {
  if (unit.fieldId === 'intro') return 'حصة تعارف وتنظيم';
  if (unit.meetingCount === 2 && learningUnitNumber) {
    return `حصة تعلمية ${learningUnitNumber} (أ) / حصة تعلمية ${learningUnitNumber} (ب)`;
  }
  return 'حصة واحدة';
}

function addUtcDays(value: string | Date, days: number): Date {
  const source = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00Z`);
  const date = new Date(source);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function formatNumericDate(date: Date): string {
  return [date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear()]
    .map((value, index) => (index === 2 ? String(value) : String(value).padStart(2, '0')))
    .join('/');
}

function isFullySeasonalHolidayWeek(sunday: Date, holidays: AcademicCalendarEvent[]): boolean {
  return Array.from({ length: 5 }, (_, index) => formatISODate(addUtcDays(sunday, index))).every(
    (date) => holidays.some((holiday) => holiday.startDate <= date && date <= holiday.endDate)
  );
}

function annualDistributionWeekStart(
  planningStartDate: string,
  weekIndex: number,
  academicYearId?: string
): string {
  const anchor = new Date(`${planningStartDate.slice(0, 10)}T00:00:00Z`);
  let sunday = addUtcDays(planningStartDate, -anchor.getUTCDay());
  const holidays = academicYearId ? seasonalHolidays(academicYearId) : [];
  let visibleWeek = 1;
  while (visibleWeek < Math.max(1, weekIndex)) {
    sunday = addUtcDays(sunday, 7);
    if (!isFullySeasonalHolidayWeek(sunday, holidays)) visibleWeek += 1;
  }
  return formatISODate(sunday);
}

function formatISODate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function annualDistributionWeekDateRange(
  planningStartDate: string,
  weekIndex: number,
  academicYearId?: string
): string {
  const sunday = new Date(
    `${annualDistributionWeekStart(planningStartDate, weekIndex, academicYearId)}T00:00:00Z`
  );
  return `${formatNumericDate(sunday)} – ${formatNumericDate(addUtcDays(sunday, 4))}`;
}

function AnnualDistributionTable({
  rows,
  planningStartDate,
  academicYearId,
}: {
  rows: AnnualDistributionRow[];
  planningStartDate: string;
  academicYearId: string;
}) {
  let learningUnitNumber = 0;
  return (
    <table className="w-full border-collapse text-right text-xs">
      <thead className="bg-emerald-800 text-white">
        <tr>
          <th className="w-[22%] p-3">التاريخ</th>
          <th className="w-[28%] p-3">الميدان</th>
          <th className="w-[22%] p-3">نوع الحصة</th>
          <th className="w-[28%] p-3">اللقاءات</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          if (row.kind === 'holiday') {
            return (
              <tr key={`holiday-${row.holiday.name}-${row.holiday.startDate}`}>
                <td
                  colSpan={4}
                  className="bg-amber-50 p-3 text-center font-extrabold text-amber-900"
                >
                  {row.holiday.name}:{' '}
                  <span dir="ltr" className="font-mono">
                    {row.holiday.startDate.split('-').reverse().join('/')} –{' '}
                    {row.holiday.endDate.split('-').reverse().join('/')}
                  </span>
                </td>
              </tr>
            );
          }
          return row.week.pedagogicalUnits.map((unit, unitIndex) => (
            <tr key={`${row.week.weekIndex}-${unit.referenceSessionId}`} className="align-top">
              {unitIndex === 0 && (
                <td
                  rowSpan={row.week.pedagogicalUnits.length}
                  className="p-3 font-extrabold text-slate-800"
                >
                  <span className="block font-mono" dir="ltr">
                    {annualDistributionWeekDateRange(
                      planningStartDate,
                      row.week.weekIndex,
                      academicYearId
                    )}
                  </span>
                  {row.week.isIntro && (
                    <span className="mt-1 block text-[10px] font-bold text-slate-500">
                      الأسبوع الأول
                    </span>
                  )}
                </td>
              )}
              <td className="p-3 font-bold text-slate-700">{unit.fieldName}</td>
              <td className="p-3">
                <span className={`rounded-lg px-2 py-1 font-bold ${typeTone(unit)}`}>
                  {unit.sessionTypeLabel}
                </span>
              </td>
              <td className="p-3 font-bold text-slate-700">
                {annualDistributionMeetingLabel(
                  unit,
                  unit.sessionType === 'تعلمية' ? ++learningUnitNumber : undefined
                )}
              </td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

export const AnnualDistributionCalendar: React.FC<AnnualDistributionCalendarProps> = ({
  currentUser,
  selectedLevelId,
  academicYearId,
  planningStartDate,
  loading,
  error,
  annualGeneration,
  onLevelChange,
  onPlanningStartDateChange,
  onInitialize,
  onNavigateToCalendar,
}) => {
  const selectedLevel = annualGeneration?.levels.find((level) => level.levelId === selectedLevelId);
  const weeks = selectedLevel?.weeks || [];
  const rows = useMemo(
    () => buildAnnualDistributionRows(weeks, planningStartDate, academicYearId),
    [academicYearId, planningStartDate, weeks]
  );
  const rebuildStatus = annualGeneration?.status;
  const levelName = selectedLevel ? `السنة ${selectedLevel.grade} ابتدائي` : 'المستوى المحدد';

  return (
    <section className="workspace-section space-y-4" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700">التوزيع السنوي للمستويات</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              التوزيع البيداغوجي الأسبوعي
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              مرجع بيداغوجي موحّد لكل مستوى. يعرض فترات العمل الأسبوعية من الأحد إلى الخميس، بينما
              يحدد توقيت القسم الفعلي جدوله الأسبوعي.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-slate-600">
              بداية التخطيط
              <input
                type="date"
                value={planningStartDate}
                onChange={(event) => onPlanningStartDateChange(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs"
              />
            </label>
            <button
              type="button"
              onClick={onInitialize}
              disabled={loading}
              className="workspace-button-primary flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {annualGeneration ? 'إعادة بناء التوزيع' : 'إنشاء التوزيع السنوي'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!weeks.length || loading}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> طباعة التوزيع
            </button>
            <button
              type="button"
              onClick={onNavigateToCalendar}
              className="workspace-button-outline flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
            >
              <CalendarDays className="h-4 w-4" /> رزنامة العطل
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-bold text-slate-600">اختيار المستوى</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {(annualGeneration?.levels || []).map((level) => (
              <button
                type="button"
                key={level.levelId}
                onClick={() => onLevelChange(level.levelId as PrimaryLevelId)}
                aria-pressed={level.levelId === selectedLevelId}
                className={`rounded-xl border p-3 text-right ${level.levelId === selectedLevelId ? 'border-emerald-500 bg-emerald-700 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'}`}
              >
                <span className="block text-xs font-extrabold">السنة {level.grade} ابتدائي</span>
                <span className="mt-1 block text-[11px] font-bold opacity-80">
                  {level.pedagogicalUnitCount} وحدة · {level.weekCount} أسبوعاً
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {annualGeneration && selectedLevel && (
        <section className="annual-distribution-summary-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">ملخص {levelName}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedLevel.weekCount} أسبوعاً · {selectedLevel.pedagogicalUnitCount} وحدة
                بيداغوجية · {selectedLevel.learningUnitCount} حصة تعلمية ·{' '}
                {selectedLevel.meetingCount} لقاءً تشغيلياً متوقعاً
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700">
              {rebuildStatus === 'partial'
                ? 'تم حفظ المرجع مع وجود حصص تشغيلية محمية'
                : rebuildStatus === 'blocked'
                  ? 'تعذر إكمال المزامنة التشغيلية'
                  : 'مرجع مستوى مستقل عن الأقسام'}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold text-emerald-800">الأسابيع</p>
              <p className="mt-1 text-xl font-black text-emerald-900">{selectedLevel.weekCount}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold text-blue-800">الوحدات البيداغوجية</p>
              <p className="mt-1 text-xl font-black text-blue-900">
                {selectedLevel.pedagogicalUnitCount}
              </p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs font-bold text-violet-800">الحصص التعلمية</p>
              <p className="mt-1 text-xl font-black text-violet-900">
                {selectedLevel.learningUnitCount}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800">الساعات السنوية</p>
              <p className="mt-1 text-xl font-black text-amber-900">{selectedLevel.annualHours}</p>
            </div>
          </div>
        </section>
      )}

      {annualGeneration && selectedLevel && rows.length > 0 && (
        <div className="annual-distribution-print-root rounded-2xl border border-slate-200 bg-white shadow-xs">
          <header className="annual-distribution-document-header hidden border-b border-slate-300 bg-white p-4 text-center print:block">
            <p className="text-[10px] font-bold text-slate-600">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </p>
            <p className="text-[10px] font-bold text-slate-600">وزارة التربية الوطنية</p>
            <h1 className="mt-2 text-xl font-extrabold text-slate-900">
              التوزيع البيداغوجي الأسبوعي
            </h1>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              التربية البدنية والرياضية · {levelName}
            </p>
            <p className="mt-1 text-[10px] font-bold text-slate-600">
              المؤسسة: {currentUser.schoolName || ' '} · الأستاذ:{' '}
              {`${currentUser.firstName} ${currentUser.lastName}`.trim() || ' '} · السنة الدراسية:{' '}
              <AcademicYearLabel value={academicYearId} />
            </p>
          </header>
          <div className="annual-distribution-weekly-table overflow-x-auto p-3 print:p-0">
            <AnnualDistributionTable
              rows={rows}
              planningStartDate={planningStartDate}
              academicYearId={academicYearId}
            />
          </div>
          <footer className="annual-distribution-document-footer hidden border-t border-slate-300 px-4 py-3 text-xs font-bold text-slate-700 print:flex print:justify-between">
            <span>الأستاذ: {`${currentUser.firstName} ${currentUser.lastName}`.trim() || ' '}</span>
            <span>المفتش: </span>
          </footer>
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">جارٍ تحميل التوزيع...</p>
      )}
      {!loading && (!annualGeneration || !selectedLevel) && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          لم يتم إنشاء توزيع المستويات بعد. اختر تاريخ بداية التخطيط ثم ولّد التوزيع.
        </div>
      )}
    </section>
  );
};
