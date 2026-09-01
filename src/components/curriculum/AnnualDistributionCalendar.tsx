import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, NotebookPen, Printer, RefreshCw } from 'lucide-react';
import { PE_FIELDS, PE_LEVELS } from '../../data/algerianCurriculum';
import {
  academicYearForDate,
  getCalendarEventsForDisplay,
  type AcademicCalendarEvent,
} from '../../data/academicCalendars';
import type { ClassRoom, User } from '../../types/spex';
import { normalizePrimaryLevelId } from '../../services/teacherPlanning.service';
import type { PrimaryLevelId } from '../../services/primaryLevel.service';
import type {
  TeacherAnnualDistributionResponse,
  TeacherAnnualDistributionConflict,
  TeacherAnnualDistributionSession,
  TeacherPlanningReference,
} from '../../services/api';
import { AcademicYearLabel } from '../common/AcademicYearLabel';

interface AnnualDistributionCalendarProps {
  currentUser: User;
  selectedClass: ClassRoom | null;
  selectedLevelId: PrimaryLevelId;
  academicYearId: string;
  planningStartDate: string;
  sessions: TeacherAnnualDistributionSession[];
  loading: boolean;
  saving: string | null;
  error: string;
  annualGeneration: TeacherAnnualDistributionResponse | null;
  onLevelChange: (levelId: PrimaryLevelId) => void;
  onPlanningStartDateChange: (value: string) => void;
  onInitialize: () => void;
  onUpdateDate: (session: TeacherAnnualDistributionSession, value: string) => void;
  onMoveProtectedSession: (conflict: TeacherAnnualDistributionConflict) => void;
  onNavigateToCalendar: () => void;
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
  | { kind: 'lesson'; date: string; session: TeacherAnnualDistributionSession }
  | {
      kind: 'holiday';
      date: string;
      holiday: AcademicCalendarEvent;
    };

export type AnnualCompactRow =
  | { kind: 'lesson'; date: string; sessions: TeacherAnnualDistributionSession[] }
  | { kind: 'holiday'; date: string; holiday: AcademicCalendarEvent };

export function buildAnnualCalendarRows(
  sessions: TeacherAnnualDistributionSession[]
): AnnualCalendarRow[] {
  const lessonRows: AnnualCalendarRow[] = sessions.map((session) => ({
    kind: 'lesson',
    date: session.plannedDate,
    session,
  }));
  const firstDate = sessions[0]?.plannedDate || '';
  const lastDate = sessions.at(-1)?.plannedDate || '';
  const holidayRows: AnnualCalendarRow[] = getCalendarEventsForDisplay(
    academicYearForDate(firstDate)
  )
    .filter((holiday) => !lastDate || holiday.startDate <= lastDate)
    .filter((holiday) => !firstDate || holiday.endDate >= firstDate)
    .map((holiday) => ({ kind: 'holiday', date: holiday.startDate, holiday }));
  return [...lessonRows, ...holidayRows].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.kind === 'holiday' ? -1 : 1)
  );
}

function weekStart(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

function dayDistance(first: string, second: string): number {
  return Math.round(
    (new Date(`${second.slice(0, 10)}T00:00:00`).getTime() -
      new Date(`${first.slice(0, 10)}T00:00:00`).getTime()) /
      86400000
  );
}

export function buildAnnualCompactRows(
  sessions: TeacherAnnualDistributionSession[],
  levelId: string
): AnnualCompactRow[] {
  const normalizedLevelId = normalizePrimaryLevelId(levelId);
  const grade = normalizedLevelId ? Number(normalizedLevelId.slice(-1)) : 0;
  const sorted = [...sessions].sort(
    (a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.id.localeCompare(b.id)
  );
  const lessonRows: AnnualCompactRow[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    const canPair =
      grade >= 1 &&
      grade <= 3 &&
      current.reference?.sessionType === 'تعلمية' &&
      next?.reference?.sessionType === 'تعلمية' &&
      current.reference?.objectiveGroupId &&
      current.reference.objectiveGroupId === next.reference?.objectiveGroupId &&
      weekStart(current.plannedDate) === weekStart(next.plannedDate) &&
      dayDistance(current.plannedDate, next.plannedDate) <= 6;
    lessonRows.push({
      kind: 'lesson',
      date: current.plannedDate,
      sessions: canPair ? [current, next] : [current],
    });
    if (canPair) index += 1;
  }
  const holidays = buildAnnualCalendarRows(sessions)
    .filter((row): row is Extract<AnnualCalendarRow, { kind: 'holiday' }> => row.kind === 'holiday')
    .map((row) => ({ kind: 'holiday' as const, date: row.date, holiday: row.holiday }));
  return [...lessonRows, ...holidays].sort(
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

function AnnualDistributionCompactTable({ rows }: { rows: AnnualCompactRow[] }) {
  return (
    <div className="annual-distribution-compact-table hidden print:block">
      <table className="w-full border-collapse text-right">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="w-[14%] p-2">الشهر</th>
            <th className="w-[24%] p-2">الأسبوع / الفترة</th>
            <th className="w-[18%] p-2">الحصص</th>
            <th className="w-[20%] p-2">نوع الحصة</th>
            <th className="w-[24%] p-2">الميدان</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            if (row.kind === 'holiday') {
              return (
                <tr
                  key={`print-holiday-${row.holiday.startDate}`}
                  className={holidayTone(row.holiday.name)}
                >
                  <td colSpan={5} className="border-y border-current/10 p-2 font-extrabold">
                    عطلة: {row.holiday.name} · من {displayDate(row.holiday.startDate)} إلى{' '}
                    {displayDate(row.holiday.endDate)}
                  </td>
                </tr>
              );
            }
            const firstSession = row.sessions[0];
            const fieldId = firstSession.reference?.domainId || 'intro';
            const fieldName =
              fieldId === 'intro'
                ? '—'
                : firstSession.reference?.fieldName ||
                  PE_FIELDS.find((field) => field.id === fieldId)?.name ||
                  '—';
            const previous = rows[index - 1];
            const showMonth =
              !previous ||
              previous.kind === 'holiday' ||
              monthName(previous.date) !== monthName(row.date);
            const showField =
              !previous ||
              previous.kind === 'holiday' ||
              previous.sessions[0].reference?.domainId !== fieldId;
            const monthSpan = showMonth
              ? rows
                  .slice(index)
                  .findIndex(
                    (candidate) =>
                      candidate.kind === 'holiday' ||
                      monthName(candidate.date) !== monthName(row.date)
                  ) || rows.length - index
              : 0;
            const fieldSpan = showField
              ? rows
                  .slice(index)
                  .findIndex(
                    (candidate) =>
                      candidate.kind === 'holiday' ||
                      candidate.sessions[0].reference?.domainId !== fieldId
                  ) || rows.length - index
              : 0;
            return (
              <tr
                key={row.sessions.map((session) => session.id).join('-')}
                className="break-inside-avoid"
              >
                {showMonth && (
                  <td
                    rowSpan={monthSpan}
                    className="border p-2 align-top font-extrabold text-slate-700"
                  >
                    {monthName(row.date)}
                  </td>
                )}
                <td className="border p-2 font-mono font-bold">
                  {displayDate(row.date)}
                  {row.sessions.length > 1
                    ? ` → ${displayDate(row.sessions.at(-1)?.plannedDate || row.date)}`
                    : ''}
                </td>
                <td className="border p-2 font-bold">
                  {row.sessions.map((session) => session.reference?.sequenceIndex || '—').join('-')}
                </td>
                <td className="border p-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold ${typeTone(firstSession.reference)}`}
                  >
                    {firstSession.reference?.sessionTypeLabel || 'نوع حصة غير متاح'}
                  </span>
                </td>
                {showField && (
                  <td
                    rowSpan={fieldSpan}
                    className="border p-2 align-middle font-extrabold text-slate-700"
                  >
                    {fieldName}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const AnnualDistributionCalendar: React.FC<AnnualDistributionCalendarProps> = ({
  currentUser,
  selectedClass,
  selectedLevelId,
  academicYearId,
  planningStartDate,
  sessions,
  loading,
  saving,
  error,
  annualGeneration,
  onLevelChange,
  onPlanningStartDateChange,
  onInitialize,
  onUpdateDate,
  onMoveProtectedSession,
  onNavigateToCalendar,
}) => {
  const [pendingMoveKey, setPendingMoveKey] = useState<string | null>(null);
  const [keptConflictKeys, setKeptConflictKeys] = useState<Set<string>>(() => new Set());
  const calendarRows = useMemo(() => buildAnnualCalendarRows(sessions), [sessions]);
  const compactRows = useMemo(
    () => buildAnnualCompactRows(sessions, selectedLevelId),
    [selectedLevelId, sessions]
  );
  const levelName =
    PE_LEVELS.find((level) => level.id === normalizePrimaryLevelId(selectedLevelId))?.name ||
    selectedClass?.levelName ||
    selectedLevelId ||
    '—';
  const teacherName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
  const rebuildStatus = annualGeneration?.status;
  const rebuildStatusLabel =
    rebuildStatus === 'rebuilt'
      ? 'اكتملت إعادة البناء'
      : rebuildStatus === 'partial'
        ? 'اكتملت المصالحة الجزئية مع بقاء صفوف محمية'
        : rebuildStatus === 'blocked'
          ? 'توقفت إعادة البناء بسبب تعارضات محمية'
          : rebuildStatus === 'unchanged'
            ? 'التوزيع متزامن ولا يحتاج إلى تغيير'
            : null;

  return (
    <section
      className="workspace-page workspace-page--annual-distribution annual-distribution-print space-y-4"
      dir="rtl"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">التوزيع السنوي</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">
              إنشاء التوزيع السنوي للمستويات الخمسة
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              السنة الدراسية: <AcademicYearLabel value={academicYearId} />
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="اختيار مستوى التوزيع السنوي">
            {PE_LEVELS.map((level) => {
              const levelId = normalizePrimaryLevelId(level.id);
              if (!levelId) return null;
              return (
                <button
                  key={levelId}
                  type="button"
                  aria-pressed={selectedLevelId === levelId}
                  onClick={() => onLevelChange(levelId)}
                  className={`workspace-level-selector rounded-xl px-3 py-2 text-xs font-extrabold ${selectedLevelId === levelId ? 'is-selected bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                >
                  {level.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-slate-600">
              بداية الموسم الدراسي
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
              {annualGeneration || sessions.length ? 'إعادة بناء التوزيع' : 'إنشاء التوزيع السنوي'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!sessions.length || loading}
              className="workspace-button-secondary flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> طباعة التوزيع السنوي
            </button>
            <button
              type="button"
              onClick={onNavigateToCalendar}
              className="workspace-button-outline flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"
            >
              <CalendarDays className="h-4 w-4" /> عرض رزنامة العطل والأعياد
            </button>
          </div>
        </div>
      </div>

      {annualGeneration && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">ملخص التوزيع السنوي</h2>
              <p className="mt-1 text-xs text-slate-500">
                من {displayDate(annualGeneration.planningStartDate)} إلى{' '}
                {displayDate(annualGeneration.endDate)} · الأقسام المرتبطة:{' '}
                {annualGeneration.linkedClasses}
              </p>
            </div>
            <span
              className={`text-xs font-bold ${
                rebuildStatus === 'blocked' || rebuildStatus === 'partial'
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {rebuildStatusLabel ||
                (annualGeneration.levels.some((level) => level.status === 'failed')
                  ? 'تعذر توليد بعض المستويات'
                  : 'تم التوليد للمستويات الخمسة')}
            </span>
          </div>
          {rebuildStatus && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-bold">{rebuildStatusLabel}</p>
              <p className="mt-1">
                أُنشئت {annualGeneration.sessionsCreated || 0} · صُححت{' '}
                {annualGeneration.sessionsReconciled || annualGeneration.reconciledSessions || 0} ·
                دون تغيير {annualGeneration.sessionsUnchanged || 0} · محمية{' '}
                {annualGeneration.sessionsProtected || 0} · أزيلت أو أحيلت للتقاعد{' '}
                {annualGeneration.sessionsRemovedOrRetired || 0}.
              </p>
            </div>
          )}
          {annualGeneration.conflicts && annualGeneration.conflicts.length > 0 && (
            <div className="mb-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="font-bold">تعذر إعادة جدولة الحصص المحمية التالية:</p>
              {annualGeneration.conflicts.map((conflict) => {
                const conflictKey =
                  conflict.sessionId || `${conflict.classId}|${conflict.referenceSessionId}`;
                const isPending = pendingMoveKey === conflictKey;
                const isKept = keptConflictKeys.has(conflictKey);
                const reason =
                  conflict.reason === 'execution-dependency'
                    ? 'حصة منجزة ولها بيانات تنفيذ محفوظة'
                    : conflict.reason === 'completed-session'
                      ? 'حصة منجزة'
                      : 'حصة محمية مرتبطة ببيانات تنفيذ';
                return (
                  <div
                    key={conflictKey}
                    className="rounded-lg border border-amber-200 bg-white p-3"
                  >
                    <p className="font-bold">
                      {conflict.className} · {conflict.sessionTypeLabel || 'حصة تنفيذية محمية'}
                    </p>
                    <p className="mt-1">
                      الحالي: {displayDate(conflict.existingDate)}
                      {conflict.currentStartTime ? ` — ${conflict.currentStartTime}` : ''}
                      {' · الموعد الجديد: '}
                      {conflict.requestedDate
                        ? `${displayDate(conflict.requestedDate)}${conflict.requestedStartTime ? ` — ${conflict.requestedStartTime}` : ''}`
                        : 'غير متاح'}
                    </p>
                    <p className="mt-1">السبب: {reason}</p>
                    {isKept ? (
                      <p className="mt-2 font-bold text-slate-600">تم الاحتفاظ بالموعد الحالي.</p>
                    ) : isPending ? (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                        <p>
                          سيتم نقل هذه الحصة إلى الموعد الجديد مع الاحتفاظ بالمذكرة والملاحظات
                          والبيانات المرتبطة بها. لن يتم حذف محتوى الحصة.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingMoveKey(null);
                              onMoveProtectedSession(conflict);
                            }}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white"
                          >
                            تأكيد النقل
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingMoveKey(null)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!conflict.sessionId}
                          onClick={() => setPendingMoveKey(conflictKey)}
                          className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          نقل الحصة إلى الموعد الجديد
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setKeptConflictKeys((current) => {
                              const next = new Set(current);
                              next.add(conflictKey);
                              return next;
                            })
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700"
                        >
                          الاحتفاظ بالموعد الحالي
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {annualGeneration.levels.map((level) => (
              <div
                key={level.levelId}
                className={`annual-distribution-summary-card rounded-xl border p-3 ${level.levelId === selectedLevelId ? 'is-selected' : ''} ${level.status === 'generated' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
              >
                <p className="text-xs font-extrabold text-slate-900">السنة {level.grade}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{level.sessionCount} حصة</p>
                <p className="mt-1 text-[11px] font-bold text-slate-600">
                  {level.annualHours} ساعة
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {level.firstSessionDate || '—'} ← {level.lastSessionDate || '—'}
                </p>
                {level.error && (
                  <p className="mt-1 text-[10px] font-bold text-red-700">{level.error}</p>
                )}
              </div>
            ))}
          </div>
          {annualGeneration.classes.some((item) => item.status === 'skipped') && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
              بعض الأقسام لم تُربط لأن مستوى القسم غير معروف؛ لم يتم إسناد منهج بديل لها.
            </p>
          )}
        </section>
      )}

      {sessions.length > 0 && (
        <div className="annual-distribution-print-root">
          <header className="annual-distribution-document-header hidden border border-slate-300 bg-white p-4 text-center print:block">
            <p className="text-[10px] font-bold text-slate-600">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </p>
            <p className="text-[10px] font-bold text-slate-600">وزارة التربية الوطنية</p>
            <div className="my-2 border-y border-slate-200 py-2">
              <h1 className="text-xl font-extrabold text-slate-900">التوزيع السنوي</h1>
              <p className="mt-1 text-sm font-bold text-blue-800">
                لمادة التربية البدنية والرياضية
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right text-[10px] sm:grid-cols-5">
              {[
                ['المؤسسة', currentUser.schoolName || ''],
                ['الأستاذ', teacherName],
                ['المستوى', levelName],
                ['القسم', selectedClass?.name || 'غير مرتبط بقسم'],
                ['السنة الدراسية', academicYearId],
              ].map(([label, value]) => (
                <div key={label} className="border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <span className="block font-bold text-slate-500">{label}</span>
                  <span className="mt-0.5 block font-extrabold text-slate-900">
                    {label === 'السنة الدراسية' ? (
                      <AcademicYearLabel value={value} />
                    ) : (
                      value || ' '
                    )}
                  </span>
                </div>
              ))}
            </div>
          </header>

          <AnnualDistributionCompactTable rows={compactRows} />

          <div className="annual-distribution-table overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs print:hidden">
            <table className="w-full min-w-[720px] text-right text-xs print:min-w-0">
              <caption className="border-b border-slate-200 bg-slate-50 p-4 text-right text-sm font-extrabold text-slate-900 print:hidden">
                التوزيع السنوي للحصص التعليمية — {selectedClass?.name || 'كل أقسام المستوى'} —{' '}
                {academicYearId}
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
                  return calendarRows.map((row, index) => {
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
                    const fieldId = reference?.domainId || 'intro';
                    const previous = calendarRows[index - 1];
                    const showField =
                      !previous ||
                      previous.kind === 'holiday' ||
                      previous.session.reference?.domainId !== fieldId;
                    const fieldSpan = showField
                      ? calendarRows
                          .slice(index)
                          .findIndex(
                            (candidate) =>
                              candidate.kind === 'holiday' ||
                              candidate.session.reference?.domainId !== fieldId
                          ) || calendarRows.length - index
                      : 0;
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
                              if (
                                event.target.value &&
                                event.target.value !== row.date.slice(0, 10)
                              )
                                onUpdateDate(row.session, event.target.value);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono print:hidden"
                          />
                          {saving === row.session.id && (
                            <span className="mr-2 text-[10px] text-slate-400">يحفظ...</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-lg px-2.5 py-1 font-bold ${typeTone(reference)}`}
                          >
                            {reference?.sessionTypeLabel || 'نوع حصة غير متاح'}
                          </span>
                        </td>
                        {showField && (
                          <td
                            rowSpan={fieldSpan}
                            className="p-3 align-middle font-bold text-slate-700"
                          >
                            {fieldId === 'intro'
                              ? '—'
                              : reference?.fieldName ||
                                PE_FIELDS.find((field) => field.id === fieldId)?.name ||
                                '—'}
                          </td>
                        )}
                        <td className="flex gap-2 p-3 print:hidden">
                          {selectedClass && (
                            <>
                              <a
                                href={`/lesson-plans?classId=${encodeURIComponent(selectedClass.id)}&classPlannedSessionId=${encodeURIComponent(row.session.id)}&academicYearId=${encodeURIComponent(row.session.academicYearId)}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 font-bold text-blue-700"
                              >
                                <BookOpen className="h-3.5 w-3.5" /> المذكرة
                              </a>
                              <a
                                href={`/daily-notebook?classId=${encodeURIComponent(selectedClass.id)}&classPlannedSessionId=${encodeURIComponent(row.session.id)}&academicYearId=${encodeURIComponent(row.session.academicYearId)}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-700"
                              >
                                <NotebookPen className="h-3.5 w-3.5" /> الكراس
                              </a>
                            </>
                          )}
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
          <footer className="annual-distribution-document-footer hidden border-t border-slate-300 pt-3 text-xs font-bold text-slate-700 print:grid">
            <div>الأستاذ: {teacherName || ' '}</div>
            <div className="text-left">المفتش: </div>
            <div className="col-span-2 mt-2 flex justify-between border-t border-slate-200 pt-2 text-[10px] font-normal text-slate-500">
              <span>ArenaSpex</span>
              <span>
                السنة الدراسية <AcademicYearLabel value={academicYearId} />
              </span>
            </div>
          </footer>
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">جارٍ تحميل التوزيع...</p>
      )}
      {!loading && sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          لم يتم إنشاء توزيع المستويات بعد. اختر تاريخ بداية الحصص ثم ولّد التوزيع.
        </div>
      )}
    </section>
  );
};
