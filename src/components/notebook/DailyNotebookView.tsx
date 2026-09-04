import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Printer,
  Target,
} from 'lucide-react';
import type { ClassRoom, DailyNotebookEntry, LessonPlan, User } from '../../types/spex';
import { PE_FIELDS, PE_LEVELS } from '../../data/algerianCurriculum';
import {
  fetchTeacherPlanningSessions,
  fetchTeacherPlanningSessionsForTeacher,
  TeacherPlanningSession,
  TeacherPlanningReference,
  updateTeacherPlanningSession,
} from '../../services/api';
import { basePlanningReferenceId } from '../../services/teacherPlanning.service';
import {
  calculateExecutionProgress,
  buildLessonMemoPreview,
  countSessionsByDate,
  DAILY_NOTEBOOK_STATUS_META,
  getPairedSessionInfo,
  earliestPlanningDate,
  filterPlanningSessions,
  normalizeClassRooms,
  normalizeDailyNotebookEntries,
  normalizePlanningSession,
  normalizePlanningSessions,
  resolveOperationalDate,
  sortPlanningSessions,
  toDailyNotebookSessionDto,
  displayPlanningDomain,
} from '../../services/dailyNotebook.service';
import { formatLocalDate, getLocalWeekDates, shiftLocalDate } from '../../services/localDate';
import { isLessonMemoEligible } from '../../services/lessonPlanWorkflow.service';
import {
  buildDailyNotebookPrintModel,
  DailyNotebookPrintModel,
} from '../../services/dailyNotebookPrint.service';
import { DailyNotebookPrintDocument } from './DailyNotebookPrintDocument';
import {
  formatAcademicYearLabel,
  getCurrentAcademicYear,
  getOperationalAcademicYearOptions,
  isOperationalAcademicYear,
} from '../../services/academicYear';

type NotebookStatus = TeacherPlanningSession['status'];
type SessionRef = {
  id?: string;
  classId?: string;
  academicYearId?: string;
  sessionTitle?: string;
  fieldName?: string;
  levelName?: string;
};
type PlanningReferenceSummary = Pick<TeacherPlanningReference, 'objective' | 'domainId'>;
interface DailyNotebookViewProps {
  currentUser: User;
  teacherClasses: ClassRoom[];
  notebookEntries: DailyNotebookEntry[];
  lessonPlans: LessonPlan[];
  onPersistNotebookEntry: (entry: Omit<DailyNotebookEntry, 'id'>) => void | Promise<void>;
  onOpenAIGeneratorForSession: (sessionRef: SessionRef) => void;
}
const YEAR_KEY = 'arenaspex:selectedAcademicYear';
const WEEKDAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const today = () => formatLocalDate();
const levelLabel = (id: string) => PE_LEVELS.find((level) => level.id === id)?.name || id;
const gradeOf = (levelId: string) => Number(levelId.replace('lvl_p', ''));
const dayNumber = (value: string) => Number(value.slice(8, 10));
const displayDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};
const teacherDisplayName = (user: User) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ');
const sessionTimeLabel = (session: Pick<TeacherPlanningSession, 'startTime' | 'endTime'>) =>
  session.startTime
    ? session.endTime
      ? `${session.startTime} - ${session.endTime}`
      : session.startTime
    : 'غير محدد';
const referenceFieldName = (reference?: { domainId?: string; fieldName?: string } | null) =>
  displayPlanningDomain(reference?.domainId, reference?.fieldName);
const lessonContent = (plan?: LessonPlan) =>
  plan?.lessonRows
    ?.map((row) => (typeof row?.learningContent === 'string' ? row.learningContent.trim() : ''))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index) || [];

export const DailyNotebookView: React.FC<DailyNotebookViewProps> = ({
  currentUser,
  teacherClasses,
  notebookEntries,
  lessonPlans,
  onPersistNotebookEntry,
  onOpenAIGeneratorForSession,
}) => {
  const safeTeacherClasses = normalizeClassRooms(teacherClasses);
  const safeNotebookEntries = normalizeDailyNotebookEntries(notebookEntries, currentUser.id);
  const query = new URLSearchParams(window.location.search);
  const requestedClassId = query.get('classId') || '';
  const requestedSessionId = query.get('classPlannedSessionId') || '';
  const requestedDate = query.get('date') || '';
  const [classFilter, setClassFilter] = useState<'all' | string>(
    safeTeacherClasses.some((item) => item.id === requestedClassId) ? requestedClassId : 'all'
  );
  const [academicYearId, setAcademicYearId] = useState(() => {
    const stored = window.localStorage.getItem(YEAR_KEY) || '';
    return isOperationalAcademicYear(stored) ? stored : getCurrentAcademicYear();
  });
  const [selectedDate, setSelectedDate] = useState(requestedDate || today());
  const [focusedSessionId, setFocusedSessionId] = useState(requestedSessionId);
  const [sessions, setSessions] = useState<TeacherPlanningSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(() => new Set());
  const statusRequestVersions = useRef<Record<string, number>>({});
  const initializedDateYears = useRef<Set<string>>(new Set());
  const selectedClassId = classFilter === 'all' ? '' : classFilter;
  const selectedClass = safeTeacherClasses.find((item) => item.id === selectedClassId);
  const classesById = useMemo(
    () => new Map(safeTeacherClasses.map((item) => [item.id, item] as const)),
    [safeTeacherClasses]
  );
  const yearOptions = useMemo(() => getOperationalAcademicYearOptions(), []);
  const references = useMemo(
    () =>
      new Map(
        [...sessions.flatMap((item) => (item.reference ? [item.reference] : []))].map((item) => [
          item.referenceSessionId,
          item,
        ])
      ),
    [sessions]
  );
  const referenceForSession = useCallback(
    (session: TeacherPlanningSession) =>
      references.get(session.referenceSessionId) ||
      references.get(basePlanningReferenceId(session.referenceSessionId)) ||
      session.reference,
    [references]
  );
  const entriesBySession = useMemo(
    () =>
      new Map(
        safeNotebookEntries
          .filter(
            (entry) =>
              Boolean(entry.classPlannedSessionId) &&
              (classFilter === 'all' || entry.classId === classFilter) &&
              entry.academicYearId === academicYearId
          )
          .map((entry) => [entry.classPlannedSessionId, entry])
      ),
    [safeNotebookEntries, classFilter, academicYearId]
  );
  const safeLessonPlans = useMemo(
    () => (Array.isArray(lessonPlans) ? lessonPlans : []),
    [lessonPlans]
  );
  const memoBySession = useMemo(
    () =>
      new Map(
        safeLessonPlans
          .filter(
            (plan) =>
              plan.teacherId === currentUser.id &&
              Boolean(plan?.classPlannedSessionId) &&
              (classFilter === 'all' || plan.classId === classFilter) &&
              plan.academicYearId === academicYearId
          )
          .map((plan) => [plan.classPlannedSessionId!, plan] as const)
      ),
    [safeLessonPlans, currentUser.id, classFilter, academicYearId]
  );
  const filteredSessions = useMemo(
    () => filterPlanningSessions(sessions, classFilter),
    [classFilter, sessions]
  );
  const operationalMinimumDate = useMemo(
    () => earliestPlanningDate(filteredSessions),
    [filteredSessions]
  );
  const progress = useMemo(() => calculateExecutionProgress(filteredSessions), [filteredSessions]);
  const weekDates = useMemo(() => getLocalWeekDates(selectedDate), [selectedDate]);
  const weekSessionCounts = useMemo(
    () => countSessionsByDate(filteredSessions, weekDates),
    [filteredSessions, weekDates]
  );
  const printModel = useMemo<DailyNotebookPrintModel | null>(
    () =>
      selectedClass
        ? buildDailyNotebookPrintModel({
            currentUser,
            selectedClass,
            academicYearId,
            weekDates,
            sessions,
            notebookEntries: safeNotebookEntries,
            lessonPlans: safeLessonPlans,
          })
        : null,
    [
      academicYearId,
      currentUser,
      safeLessonPlans,
      safeNotebookEntries,
      selectedClass,
      sessions,
      weekDates,
    ]
  );

  useEffect(() => {
    window.localStorage.setItem(YEAR_KEY, academicYearId);
  }, [academicYearId]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const request =
      classFilter === 'all'
        ? fetchTeacherPlanningSessionsForTeacher(academicYearId)
        : selectedClassId
          ? fetchTeacherPlanningSessions(selectedClassId, academicYearId)
          : Promise.resolve({ sessions: [] });
    request
      .then((result) => {
        if (cancelled) return;
        const safeSessions = normalizePlanningSessions(result?.sessions);
        setSessions(safeSessions);
        if (!initializedDateYears.current.has(academicYearId)) {
          const earliest = earliestPlanningDate(safeSessions);
          if (earliest) {
            setSelectedDate((current) =>
              resolveOperationalDate({
                requestedDate: current,
                localToday: today(),
                firstPlannedDate: earliest,
              })
            );
          }
          initializedDateYears.current.add(academicYearId);
        }
        const linked = requestedSessionId
          ? safeSessions.find((item) => item.id === requestedSessionId)
          : undefined;
        if (linked) setSelectedDate(linked.plannedDate);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : 'تعذر تحميل جلسات الكراس.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [academicYearId, classFilter, requestedDate, requestedSessionId, selectedClassId]);

  const displayed = useMemo(
    () =>
      focusedSessionId
        ? filteredSessions.filter((item) => item.id === focusedSessionId)
        : sortPlanningSessions(
            filteredSessions.filter((item) => item.plannedDate === selectedDate),
            new Map(safeTeacherClasses.map((item) => [item.id, item.name]))
          ),
    [filteredSessions, focusedSessionId, safeTeacherClasses, selectedDate]
  );
  const commonDomain = useMemo(() => {
    const domainNames = displayed.map((session) => {
      const reference = referenceForSession(session);
      return referenceFieldName(reference);
    });
    if (domainNames.some((value) => !value)) return null;
    const validDomainNames = domainNames.filter((value): value is string => Boolean(value));
    return new Set(validDomainNames).size === 1 ? validDomainNames[0] : null;
  }, [displayed, referenceForSession]);
  const classForSession = (session: TeacherPlanningSession) => classesById.get(session.classId);
  const updateStatus = async (session: TeacherPlanningSession, status: NotebookStatus) => {
    const requestVersion = (statusRequestVersions.current[session.id] || 0) + 1;
    statusRequestVersions.current[session.id] = requestVersion;
    setSavingId(session.id);
    setError('');
    let updatedSession: TeacherPlanningSession | null = null;
    try {
      const result = await updateTeacherPlanningSession(session.classId, session.id, { status });
      updatedSession = normalizePlanningSession(result?.session);
      if (!updatedSession) throw new Error('استجابة الحصة التشغيلية غير صالحة.');
      if (statusRequestVersions.current[session.id] !== requestVersion) return;
      const old = entriesBySession.get(session.id);
      const sessionClass = classForSession(session);
      await onPersistNotebookEntry({
        teacherId: currentUser.id,
        classPlannedSessionId: session.id,
        academicYearId: session.academicYearId,
        classId: session.classId,
        className: sessionClass?.name || session.classId,
        sessionTitle: referenceForSession(session)?.objective,
        segmentTitle: referenceForSession(session)?.learningSectionId,
        levelName: sessionClass ? levelLabel(sessionClass.levelId) : undefined,
        executionDate: updatedSession.plannedDate,
        timeSlot: sessionTimeLabel(updatedSession),
        status: status === 'مبرمجة' ? old?.status || 'غير منجزة' : status,
        note: old?.note,
        lessonPlanId: old?.lessonPlanId,
      });
      if (statusRequestVersions.current[session.id] !== requestVersion) return;
      setSessions((current) =>
        current.map((item) => (item.id === session.id ? updatedSession! : item))
      );
    } catch (reason: unknown) {
      if (
        updatedSession &&
        updatedSession.status !== session.status &&
        statusRequestVersions.current[session.id] === requestVersion
      ) {
        try {
          const rollback = await updateTeacherPlanningSession(session.classId, session.id, {
            status: session.status,
          });
          const restoredSession = normalizePlanningSession(rollback?.session);
          if (restoredSession) {
            setSessions((current) =>
              current.map((item) => (item.id === session.id ? restoredSession : item))
            );
          }
        } catch {
          setSessions((current) =>
            current.map((item) => (item.id === session.id ? session : item))
          );
        }
      }
      if (statusRequestVersions.current[session.id] === requestVersion) {
        setError(reason instanceof Error ? reason.message : 'تعذر تحديث حالة الحصة.');
      }
    } finally {
      if (statusRequestVersions.current[session.id] === requestVersion) setSavingId(null);
    }
  };
  const saveNote = async (session: TeacherPlanningSession) => {
    setSavingId(session.id);
    setError('');
    const old = entriesBySession.get(session.id);
    const previousNote = old?.note || '';
    try {
      const sessionClass = classForSession(session);
      await onPersistNotebookEntry({
        teacherId: currentUser.id,
        classPlannedSessionId: session.id,
        academicYearId: session.academicYearId,
        classId: session.classId,
        className: sessionClass?.name || session.classId,
        sessionTitle: referenceForSession(session)?.objective,
        segmentTitle: referenceForSession(session)?.learningSectionId,
        levelName: sessionClass ? levelLabel(sessionClass.levelId) : undefined,
        executionDate: session.plannedDate,
        timeSlot: sessionTimeLabel(session),
        status: session.status === 'مبرمجة' ? 'غير منجزة' : session.status,
        note: noteDrafts[session.id] || '',
        lessonPlanId: old?.lessonPlanId,
      });
    } catch (reason: unknown) {
      setNoteDrafts((current) => ({ ...current, [session.id]: previousNote }));
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ ملاحظة الحصة.');
    } finally {
      setSavingId(null);
    }
  };
  const sessionRef = (
    session: TeacherPlanningSession,
    reference: PlanningReferenceSummary | undefined,
    sessionClass?: ClassRoom
  ): SessionRef => ({
    id: session.id,
    classId: session.classId,
    academicYearId: session.academicYearId,
    sessionTitle: reference?.objective,
    fieldName: reference
      ? PE_FIELDS.find((field) => field.id === reference.domainId)?.name
      : undefined,
    levelName: sessionClass ? levelLabel(sessionClass.levelId) : undefined,
  });
  const openMemo = (session: TeacherPlanningSession, entry?: DailyNotebookEntry) => {
    const reference = referenceForSession(session);
    if (!isLessonMemoEligible(reference || {})) {
      setError('هذه الحصة التنظيمية لا تتطلب مذكرة.');
      return;
    }
    window.location.assign(
      `/lesson-plans?classId=${encodeURIComponent(session.classId)}&classPlannedSessionId=${encodeURIComponent(session.id)}&academicYearId=${encodeURIComponent(session.academicYearId)}${entry?.lessonPlanId ? `&lessonPlanId=${encodeURIComponent(entry.lessonPlanId)}` : ''}`
    );
  };
  const resolveDate = (requestedDate: string) =>
    resolveOperationalDate({
      requestedDate,
      localToday: today(),
      firstPlannedDate: operationalMinimumDate,
    });
  const shiftDate = (days: number) => {
    setFocusedSessionId('');
    setSelectedDate(resolveDate(shiftLocalDate(selectedDate, days)));
  };
  const selectDate = (date: string) => {
    setFocusedSessionId('');
    setSelectedDate(resolveDate(date));
  };
  const shiftWeek = (weeks: number) => {
    setFocusedSessionId('');
    setSelectedDate(resolveDate(shiftLocalDate(selectedDate, weeks * 7)));
  };
  const printDailyNotebook = async () => {
    if (!printModel?.rows.length) return;
    if (typeof document.fonts?.ready !== 'undefined') await document.fonts.ready;
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    window.print();
  };

  return (
    <div
      className="workspace-page workspace-page--daily-notebook space-y-5 animate-in fade-in duration-200"
      dir="rtl"
    >
      <header className="workspace-header workspace-notebook-controls space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              السجل التربوي التنفيذي
            </span>
            <h1 className="mt-3 flex items-center gap-2 text-2xl font-extrabold text-slate-950">
              <BookMarked className="h-6 w-6 text-blue-700" /> الكراس اليومي الرقمي
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              سجل تربوي رقمي للحصص المنفذة والمبرمجة والملاحظات اليومية.
            </p>
          </div>
          <div className="grid gap-3 text-xs font-bold text-slate-700 sm:grid-cols-2 xl:min-w-[42rem] xl:grid-cols-3">
            <label className="min-w-0">
              <span className="block">السنة الدراسية</span>
              <select
                value={academicYearId}
                onChange={(event) => {
                  setFocusedSessionId('');
                  setAcademicYearId(event.target.value);
                }}
                dir="ltr"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {formatAcademicYearLabel(year)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="block">القسم</span>
              <select
                value={classFilter}
                onChange={(event) => {
                  setFocusedSessionId('');
                  setClassFilter(event.target.value);
                }}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="all">كل الأقسام</option>
                {safeTeacherClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="block">التاريخ</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => selectDate(event.target.value)}
                min={operationalMinimumDate || undefined}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
              />
            </label>
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-blue-300 hover:text-blue-700"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => selectDate(today())}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 transition hover:border-blue-400"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-blue-300 hover:text-blue-700"
            >
              التالي
            </button>
            <button
              type="button"
              disabled={!printModel?.rows.length}
              onClick={() => void printDailyNotebook()}
              className="workspace-button-secondary flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-3.5 w-3.5" /> طباعة الكراس اليومي
            </button>
            {classFilter === 'all' && (
              <span className="text-[11px] font-normal text-slate-500 sm:col-span-2 xl:col-span-3">
                اختر قسماً محدداً لطباعة الكراس اليومي.
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-3 border-y border-slate-100 py-4 sm:grid-cols-2 lg:grid-cols-4">
          {currentUser.schoolName && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <span className="block text-[11px] font-bold text-slate-500">المؤسسة</span>
              <strong className="mt-1 block text-sm text-slate-900">
                {currentUser.schoolName}
              </strong>
            </div>
          )}
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <span className="block text-[11px] font-bold text-slate-500">السنة الدراسية</span>
            <strong className="mt-1 block text-sm text-slate-900" dir="ltr">
              {formatAcademicYearLabel(academicYearId)}
            </strong>
          </div>
          {teacherDisplayName(currentUser) && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <span className="block text-[11px] font-bold text-slate-500">الأستاذ</span>
              <strong className="mt-1 block text-sm text-slate-900">
                {teacherDisplayName(currentUser)}
              </strong>
            </div>
          )}
          {commonDomain && (
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <span className="block text-[11px] font-bold text-blue-700">الميدان</span>
              <strong className="mt-1 block text-sm text-blue-950">{commonDomain}</strong>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
          <button
            type="button"
            aria-label="الأسبوع السابق"
            title="الأسبوع السابق"
            onClick={() => shiftWeek(-1)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto sm:justify-center">
            {weekDates.map((date, index) => {
              const count = weekSessionCounts.get(date) || 0;
              const isSelected = date === selectedDate && !focusedSessionId;
              const isToday = date === today();
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={`${WEEKDAY_LABELS[index]} ${date}${count ? `، ${count} حصة` : '، لا توجد حصص'}`}
                  aria-current={isSelected ? 'date' : undefined}
                  onClick={() => selectDate(date)}
                  className={`min-w-[4.5rem] rounded-xl px-2 py-2 text-center text-xs transition ${
                    isSelected
                      ? 'bg-blue-700 text-white shadow-sm'
                      : isToday
                        ? 'border border-blue-300 bg-blue-50 text-blue-800'
                        : 'bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                  }`}
                >
                  <span className="block font-extrabold">{WEEKDAY_LABELS[index]}</span>
                  <span className="mt-0.5 block text-[11px]">{dayNumber(date)}</span>
                  <span
                    className={`mt-1 block text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}
                  >
                    {count ? `${count} حصة` : 'فارغ'}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="الأسبوع التالي"
            title="الأسبوع التالي"
            onClick={() => shiftWeek(1)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="workspace-progress rounded-2xl bg-blue-50/70 px-4 py-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-extrabold text-blue-950">
              {classFilter === 'all' ? 'ملخص الحصص اليومية' : 'التقدم في تنفيذ البرنامج'}
            </span>
            {classFilter === 'all' ? (
              <span className="font-bold text-blue-800">حصص اليوم: {displayed.length}</span>
            ) : (
              <span
                className="font-bold text-blue-800"
                dir="ltr"
                style={{ unicodeBidi: 'isolate' }}
              >
                {progress.completed} / {progress.total} · {progress.percentage}%
              </span>
            )}
          </div>
          {classFilter !== 'all' && (
            <div className="workspace-progress-track mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
              <div
                className="workspace-progress-fill h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}
        </div>
      </header>
      {safeTeacherClasses.length === 0 && (
        <div className="workspace-empty-state rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="font-extrabold text-slate-900">لا توجد أقسام مسندة إليك بعد.</h2>
          <p className="mt-2 text-sm text-slate-500">أسنِد قسمًا للأستاذ لبدء تسجيل تنفيذ الحصص.</p>
          <button
            onClick={() => window.location.assign('/gradebook')}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
          >
            فضاء القسم والتلاميذ
          </button>
        </div>
      )}
      {safeTeacherClasses.length > 0 && error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {safeTeacherClasses.length > 0 && loading && (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">
          جارٍ تحميل الجلسات المحفوظة...
        </p>
      )}
      {safeTeacherClasses.length > 0 && !loading && sessions.length === 0 && (
        <div className="workspace-empty-state rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BookMarked className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="font-extrabold text-slate-900">
            {classFilter === 'all'
              ? 'لم يتم إنشاء التوزيع السنوي للأقسام المسندة إليك بعد.'
              : 'لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            أنشئ التوزيع من مساحة التخطيط قبل تسجيل التنفيذ.
          </p>
          <button
            onClick={() => window.location.assign('/planning?section=annual-distribution')}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
          >
            إنشاء التوزيع السنوي
          </button>
        </div>
      )}
      {safeTeacherClasses.length > 0 &&
        !loading &&
        sessions.length > 0 &&
        displayed.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-600">
              {classFilter === 'all'
                ? 'لا توجد حصة محفوظة للأقسام المحددة في التاريخ المحدد.'
                : 'لا توجد حصة محفوظة لهذا القسم في التاريخ المحدد.'}
            </p>
          </div>
        )}
      <div className="grid gap-4">
        {displayed.map((session) => {
          const sessionClass = classForSession(session);
          const reference = referenceForSession(session);
          const memoEligible = isLessonMemoEligible(reference || {});
          const entry = entriesBySession.get(session.id);
          const status = session.status;
          const fieldName = referenceFieldName(reference);
          const memoExists = memoEligible && memoBySession.has(session.id);
          const sessionDto = toDailyNotebookSessionDto(session, {
            sessionNumber: reference?.sequenceIndex,
            sessionType: reference?.sessionTypeLabel,
            objective: reference?.objective,
            domain: fieldName,
            executionNote: entry?.note,
            memoExists,
          });
          const statusMeta = DAILY_NOTEBOOK_STATUS_META[sessionDto.status];
          const pairInfo = getPairedSessionInfo(
            session,
            sessions.filter((item) => item.classId === session.classId),
            sessionClass ? gradeOf(sessionClass.levelId) : reference?.grade || 0
          );
          const memoPlan = memoEligible ? memoBySession.get(session.id) : undefined;
          const memoPreview = buildLessonMemoPreview(memoPlan);
          const content = lessonContent(memoPlan);
          const hasMemoPreview = Boolean(
            memoPreview &&
            (memoPreview.situations.length > 0 ||
              memoPreview.equipment.length > 0 ||
              memoPreview.contentSummary)
          );
          const isPreviewExpanded = expandedPreviews.has(session.id);
          return (
            <article
              key={session.id}
              className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold text-slate-700">
                {sessionDto.sessionType && (
                  <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-indigo-800">
                    {sessionDto.sessionType}
                  </span>
                )}
                <span
                  title={statusMeta.description}
                  className={`rounded-xl px-3 py-1.5 ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
                {pairInfo && (
                  <span className="rounded-xl bg-violet-50 px-3 py-1.5 text-violet-800">
                    الهدف المشترك — الحصة {pairInfo.position} من {pairInfo.total}
                  </span>
                )}
              </div>
              <div className="grid gap-px bg-slate-200 lg:grid-cols-[1.05fr_1.2fr_1.35fr_1.1fr_1.55fr]">
                <section className="bg-white p-4">
                  <h2 className="text-xs font-extrabold text-blue-800">
                    التاريخ / القسم / التوقيت
                  </h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-500">التاريخ</span>
                      <strong className="mt-0.5 block text-slate-950" dir="ltr">
                        {displayDate(sessionDto.plannedDate)}
                      </strong>
                    </div>
                    {sessionClass && (
                      <>
                        <div>
                          <span className="block text-[11px] font-bold text-slate-500">
                            المستوى
                          </span>
                          <strong className="mt-0.5 block text-slate-950">
                            {levelLabel(sessionClass.levelId)}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-slate-500">الفوج</span>
                          <strong className="mt-0.5 block text-slate-950">
                            {sessionClass.name}
                          </strong>
                        </div>
                      </>
                    )}
                    {sessionDto.startTime && (
                      <div>
                        <span className="block text-[11px] font-bold text-slate-500">التوقيت</span>
                        <strong className="mt-0.5 block text-slate-950" dir="ltr">
                          {sessionDto.startTime}{' '}
                          {sessionDto.endTime ? `- ${sessionDto.endTime}` : ''}
                        </strong>
                      </div>
                    )}
                    {sessionDto.durationMinutes > 0 && (
                      <div className="text-xs text-slate-600">
                        المدة: {sessionDto.durationMinutes} دقيقة
                      </div>
                    )}
                    {sessionDto.venue && (
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5" /> {sessionDto.venue}
                      </div>
                    )}
                  </div>
                </section>
                <section className="bg-white p-4">
                  <h2 className="text-xs font-extrabold text-blue-800">التعلمات</h2>
                  {sessionDto.objective && (
                    <p className="mt-3 text-sm font-bold leading-7 text-slate-900">
                      {sessionDto.objective}
                    </p>
                  )}
                </section>
                <section className="bg-white p-4">
                  <h2 className="text-xs font-extrabold text-blue-800">محتوى التعلم</h2>
                  {content.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      {content.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="bg-white p-4">
                  <h2 className="text-xs font-extrabold text-blue-800">المذكرة</h2>
                  <div className="mt-3 space-y-3">
                    {!memoEligible ? (
                      <p className="text-sm font-bold text-slate-700">حصة تنظيمية بدون مذكرة</p>
                    ) : (
                      <>
                        <p
                          className={`text-sm font-bold ${memoExists ? 'text-emerald-700' : 'text-amber-700'}`}
                        >
                          {memoExists ? 'المذكرة جاهزة' : 'لم تُنشأ بعد'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {memoExists ? (
                            <button
                              type="button"
                              onClick={() => openMemo(session, entry)}
                              className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              <FileText className="h-3.5 w-3.5" /> فتح المذكرة
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenAIGeneratorForSession(
                                  sessionRef(session, reference, sessionClass)
                                )
                              }
                              className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white"
                            >
                              إنشاء المذكرة
                            </button>
                          )}
                          {memoPlan && hasMemoPreview && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPreviews((current) => {
                                  const next = new Set(current);
                                  if (next.has(session.id)) next.delete(session.id);
                                  else next.add(session.id);
                                  return next;
                                })
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              {isPreviewExpanded ? 'إخفاء المحتوى' : 'عرض المحتوى'}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </section>
                <section className="bg-white p-4">
                  <h2 className="text-xs font-extrabold text-blue-800">الملاحظات</h2>
                  <textarea
                    aria-label="الملاحظات"
                    value={noteDrafts[session.id] ?? entry?.note ?? ''}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [session.id]: event.target.value,
                      }))
                    }
                    placeholder="أضف ملاحظة التنفيذ"
                    rows={3}
                    className="mt-3 min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingId === session.id}
                    onClick={() => saveNote(session)}
                    className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50"
                  >
                    حفظ الملاحظات
                  </button>
                </section>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-500">إجراءات التنفيذ</span>
                  <button
                    type="button"
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'منجزة')}
                    className="rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white disabled:opacity-50"
                  >
                    منجزة
                  </button>
                  <button
                    type="button"
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'مؤجلة')}
                    className="rounded-xl bg-amber-600 px-3 py-2 font-bold text-white disabled:opacity-50"
                  >
                    مؤجلة
                  </button>
                  <button
                    type="button"
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'غير منجزة')}
                    className="rounded-xl bg-slate-700 px-3 py-2 font-bold text-white disabled:opacity-50"
                  >
                    غير منجزة
                  </button>
                  <button
                    type="button"
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'مبرمجة')}
                    className="rounded-xl bg-blue-700 px-3 py-2 font-bold text-white disabled:opacity-50"
                  >
                    مبرمجة
                  </button>
                  {status === 'مؤجلة' && (
                    <button
                      type="button"
                      onClick={() =>
                        window.location.assign(
                          `/planning?section=annual-distribution&classId=${encodeURIComponent(session.classId)}&classPlannedSessionId=${encodeURIComponent(session.id)}&academicYearId=${encodeURIComponent(session.academicYearId)}`
                        )
                      }
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-bold text-amber-800"
                    >
                      إعادة البرمجة
                    </button>
                  )}
                  {reference &&
                    (reference.sessionType === 'تقويم تشخيصي' ||
                      reference.sessionType === 'تقويم تحصيلي') && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            window.location.assign(
                              '/gradebook?classId=' +
                                encodeURIComponent(session.classId) +
                                '&academicYearId=' +
                                encodeURIComponent(session.academicYearId) +
                                '&classPlannedSessionId=' +
                                encodeURIComponent(session.id)
                            )
                          }
                          className="flex items-center gap-1 rounded-xl bg-purple-50 px-3 py-2 font-bold text-purple-700"
                        >
                          <Target className="h-3.5 w-3.5" /> فتح التقويم
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            window.location.assign(
                              '/attendance?classId=' +
                                encodeURIComponent(session.classId) +
                                '&academicYearId=' +
                                encodeURIComponent(session.academicYearId) +
                                '&classPlannedSessionId=' +
                                encodeURIComponent(session.id)
                            )
                          }
                          className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 font-bold text-blue-700"
                        >
                          <Target className="h-3.5 w-3.5" /> تسجيل الحضور
                        </button>
                      </>
                    )}
                </div>
              </div>
              {isPreviewExpanded && memoPreview && (
                <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-700">
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {memoPreview.equipment.length > 0 && (
                      <p>
                        <span className="font-extrabold text-blue-950">الوسائل:</span>{' '}
                        {memoPreview.equipment.join('، ')}
                      </p>
                    )}
                    {memoPreview.contentSummary && (
                      <p>
                        <span className="font-extrabold text-blue-950">محتوى مختصر:</span>{' '}
                        {memoPreview.contentSummary}
                      </p>
                    )}
                  </div>
                  {memoPreview.situations.length > 0 && (
                    <div>
                      <p className="font-extrabold text-blue-950">المواقف التربوية:</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {memoPreview.situations.map((situation) => (
                          <div key={situation.title} className="rounded-xl bg-white p-3">
                            <p className="font-bold text-slate-800">{situation.title}</p>
                            {situation.summary && (
                              <p className="mt-1 text-slate-500">{situation.summary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {printModel && <DailyNotebookPrintDocument model={printModel} />}
    </div>
  );
};
