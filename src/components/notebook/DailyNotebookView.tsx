import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Printer,
  Target,
} from 'lucide-react';
import type { ClassRoom, DailyNotebookEntry, LessonPlan, User } from '../../types/spex';
import { LEARNING_SEGMENTS, PE_FIELDS, PE_LEVELS } from '../../data/algerianCurriculum';
import {
  fetchTeacherPlanningSessions,
  TeacherPlanningSession,
  TeacherPlanningReference,
  updateTeacherPlanningSession,
} from '../../services/api';
import { canonicalReferenceSessions } from '../../services/teacherPlanning.service';
import {
  calculateExecutionProgress,
  buildLessonMemoPreview,
  countSessionsByDate,
  DAILY_NOTEBOOK_STATUS_META,
  getPairedSessionInfo,
  normalizeClassRooms,
  normalizeDailyNotebookEntries,
  normalizePlanningSession,
  normalizePlanningSessions,
  sortPlanningSessions,
  toDailyNotebookSessionDto,
} from '../../services/dailyNotebook.service';
import { formatLocalDate, getLocalWeekDates, shiftLocalDate } from '../../services/localDate';
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
  const [selectedClassId, setSelectedClassId] = useState(
    safeTeacherClasses.some((item) => item.id === requestedClassId)
      ? requestedClassId
      : safeTeacherClasses[0]?.id || ''
  );
  const [academicYearId, setAcademicYearId] = useState(() => {
    const stored = window.localStorage.getItem(YEAR_KEY) || '';
    return isOperationalAcademicYear(stored) ? stored : getCurrentAcademicYear();
  });
  const [selectedDate, setSelectedDate] = useState(query.get('date') || today());
  const [focusedSessionId, setFocusedSessionId] = useState(requestedSessionId);
  const [sessions, setSessions] = useState<TeacherPlanningSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(() => new Set());
  const statusRequestVersions = useRef<Record<string, number>>({});
  const selectedClass = safeTeacherClasses.find((item) => item.id === selectedClassId);
  const yearOptions = useMemo(() => getOperationalAcademicYearOptions(), []);
  const references = useMemo(
    () =>
      new Map(
        [
          ...(selectedClass ? canonicalReferenceSessions(selectedClass.levelId) : []),
          ...sessions.flatMap((item) => (item.reference ? [item.reference] : [])),
        ].map((item) => [item.referenceSessionId, item])
      ),
    [selectedClass, sessions]
  );
  const entriesBySession = useMemo(
    () =>
      new Map(
        safeNotebookEntries
          .filter(
            (entry) =>
              Boolean(entry.classPlannedSessionId) &&
              entry.classId === selectedClassId &&
              entry.academicYearId === academicYearId
          )
          .map((entry) => [entry.classPlannedSessionId, entry])
      ),
    [safeNotebookEntries, selectedClassId, academicYearId]
  );
  const safeLessonPlans = Array.isArray(lessonPlans) ? lessonPlans : [];
  const memoBySession = useMemo(
    () =>
      new Map(
        safeLessonPlans
          .filter(
            (plan) =>
              plan.teacherId === currentUser.id &&
              Boolean(plan?.classPlannedSessionId) &&
              plan.classId === selectedClassId &&
              plan.academicYearId === academicYearId
          )
          .map((plan) => [plan.classPlannedSessionId!, plan] as const)
      ),
    [safeLessonPlans, currentUser.id, selectedClassId, academicYearId]
  );
  const progress = useMemo(() => calculateExecutionProgress(sessions), [sessions]);
  const weekDates = useMemo(() => getLocalWeekDates(selectedDate), [selectedDate]);
  const weekSessionCounts = useMemo(
    () => countSessionsByDate(sessions, weekDates),
    [sessions, weekDates]
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
    if (!selectedClassId) {
      setSessions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchTeacherPlanningSessions(selectedClassId, academicYearId)
      .then((result) => {
        if (cancelled) return;
        const safeSessions = normalizePlanningSessions(result?.sessions);
        setSessions(safeSessions);
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
  }, [selectedClassId, academicYearId, requestedSessionId]);

  const displayed = useMemo(
    () =>
      focusedSessionId
        ? sessions.filter((item) => item.id === focusedSessionId)
        : sortPlanningSessions(sessions.filter((item) => item.plannedDate === selectedDate)),
    [sessions, selectedDate, focusedSessionId]
  );
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
      await onPersistNotebookEntry({
        teacherId: currentUser.id,
        classPlannedSessionId: session.id,
        academicYearId: session.academicYearId,
        classId: session.classId,
        className: selectedClass?.name || session.classId,
        sessionTitle: references.get(session.referenceSessionId)?.objective,
        segmentTitle: references.get(session.referenceSessionId)?.learningSectionId,
        levelName: selectedClass ? levelLabel(selectedClass.levelId) : undefined,
        executionDate: updatedSession.plannedDate,
        timeSlot: updatedSession.startTime || 'غير محدد',
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
      await onPersistNotebookEntry({
        teacherId: currentUser.id,
        classPlannedSessionId: session.id,
        academicYearId: session.academicYearId,
        classId: session.classId,
        className: selectedClass?.name || session.classId,
        sessionTitle: references.get(session.referenceSessionId)?.objective,
        segmentTitle: references.get(session.referenceSessionId)?.learningSectionId,
        levelName: selectedClass ? levelLabel(selectedClass.levelId) : undefined,
        executionDate: session.plannedDate,
        timeSlot: session.startTime || 'غير محدد',
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
    reference?: PlanningReferenceSummary
  ): SessionRef => ({
    id: session.id,
    classId: session.classId,
    academicYearId: session.academicYearId,
    sessionTitle: reference?.objective,
    fieldName: reference
      ? PE_FIELDS.find((field) => field.id === reference.domainId)?.name
      : undefined,
    levelName: selectedClass ? levelLabel(selectedClass.levelId) : undefined,
  });
  const openMemo = (session: TeacherPlanningSession, entry?: DailyNotebookEntry) => {
    window.location.assign(
      `/lesson-plans?classId=${encodeURIComponent(session.classId)}&classPlannedSessionId=${encodeURIComponent(session.id)}&academicYearId=${encodeURIComponent(session.academicYearId)}${entry?.lessonPlanId ? `&lessonPlanId=${encodeURIComponent(entry.lessonPlanId)}` : ''}`
    );
  };
  const shiftDate = (days: number) => {
    setFocusedSessionId('');
    setSelectedDate(shiftLocalDate(selectedDate, days));
  };
  const selectDate = (date: string) => {
    setFocusedSessionId('');
    setSelectedDate(date);
  };
  const shiftWeek = (weeks: number) => {
    setFocusedSessionId('');
    setSelectedDate(shiftLocalDate(selectedDate, weeks * 7));
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
      <header className="workspace-header workspace-notebook-controls space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
              الوثائق التنفيذية الرسمية
            </span>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <BookMarked className="h-5 w-5 text-blue-600" /> الكراس اليومي
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              تنفيذ الحصص المحفوظة في التوزيع التشغيلي للقسم.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2 text-xs font-bold text-slate-600">
            <label>
              السنة الدراسية
              <select
                value={academicYearId}
                onChange={(event) => {
                  setFocusedSessionId('');
                  setAcademicYearId(event.target.value);
                }}
                dir="ltr"
                className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {formatAcademicYearLabel(year)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              القسم
              <select
                value={selectedClassId}
                onChange={(event) => {
                  setFocusedSessionId('');
                  setSelectedClassId(event.target.value);
                }}
                className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">اختر قسماً</option>
                {safeTeacherClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              التاريخ
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => selectDate(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
              />
            </label>
            <button
              onClick={() => shiftDate(-1)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              السابق
            </button>
            <button
              onClick={() => selectDate(today())}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              اليوم
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              التالي
            </button>
            <button
              type="button"
              disabled={!printModel?.rows.length}
              onClick={() => void printDailyNotebook()}
              className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-3.5 w-3.5" /> طباعة الكراس اليومي
            </button>
          </div>
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
            <span className="font-extrabold text-blue-950">التقدم في تنفيذ البرنامج</span>
            <span className="font-bold text-blue-800" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {progress.completed} / {progress.total} · {progress.percentage}%
            </span>
          </div>
          <div className="workspace-progress-track mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
            <div
              className="workspace-progress-fill h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </header>
      {!selectedClass && (
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
      {selectedClass && error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {selectedClass && loading && (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">
          جارٍ تحميل الجلسات المحفوظة...
        </p>
      )}
      {selectedClass && !loading && sessions.length === 0 && (
        <div className="workspace-empty-state rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BookMarked className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="font-extrabold text-slate-900">
            لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.
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
      {selectedClass && !loading && sessions.length > 0 && displayed.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-600">
            لا توجد حصة محفوظة لهذا القسم في التاريخ المحدد.
          </p>
        </div>
      )}
      <div className="grid gap-4">
        {displayed.map((session) => {
          const reference = references.get(session.referenceSessionId);
          const entry = entriesBySession.get(session.id);
          const field = reference
            ? PE_FIELDS.find((item) => item.id === reference.domainId)
            : undefined;
          const status = session.status;
          const sectionLabel = reference
            ? LEARNING_SEGMENTS.find(
                (segment) =>
                  segment.levelId === selectedClass.levelId &&
                  segment.fieldId === reference.domainId
              )?.title || 'المقطع غير محدد'
            : 'المقطع غير متاح';
          const memoExists = memoBySession.has(session.id);
          const sessionDto = toDailyNotebookSessionDto(session, {
            sessionNumber: reference?.sequenceIndex,
            sessionType: reference?.sessionTypeLabel,
            objective: reference?.objective,
            domain: field?.name || (reference ? 'الميدان غير محدد' : null),
            section: sectionLabel,
            executionNote: entry?.note,
            memoExists,
          });
          const statusMeta = DAILY_NOTEBOOK_STATUS_META[sessionDto.status];
          const pairInfo = getPairedSessionInfo(session, sessions, gradeOf(selectedClass.levelId));
          const memoPlan = memoBySession.get(session.id);
          const memoPreview = buildLessonMemoPreview(memoPlan);
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
              className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-xl bg-indigo-50 px-3 py-1 text-indigo-800">
                      نوع الحصة: {sessionDto.sessionType || 'غير محدد'}
                    </span>
                    <span className={`rounded-xl px-3 py-1 ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                    {pairInfo && (
                      <span className="rounded-xl bg-violet-50 px-3 py-1 text-violet-800">
                        الهدف المشترك — الحصة {pairInfo.position} من {pairInfo.total}
                      </span>
                    )}
                    <span className="rounded-xl bg-indigo-50 px-3 py-1 text-indigo-800">
                      القسم: {selectedClass.name}
                    </span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1">
                      {levelLabel(selectedClass.levelId)}
                    </span>
                    <span className="rounded-xl bg-blue-50 px-3 py-1 text-blue-800">
                      <Calendar className="ml-1 inline h-3.5 w-3.5" /> {sessionDto.plannedDate}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold text-slate-900">
                    {sessionDto.objective || 'تعذر تحميل المرجع البيداغوجي لهذه الحصة.'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {reference
                      ? `${sessionDto.domain} · ${sessionDto.section} · ${sessionDto.sessionType} · الحصة ${sessionDto.sessionNumber ?? '—'}`
                      : 'تعذر تحميل المرجع البيداغوجي لهذه الحصة.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2">
                    <Clock className="h-3.5 w-3.5" /> {sessionDto.startTime || 'غير محدد'}
                  </span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2">
                    {sessionDto.durationMinutes} دقيقة
                  </span>
                  <span className="flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2">
                    <MapPin className="h-3.5 w-3.5" /> {sessionDto.venue || 'غير محدد'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {status === 'مؤجلة' ? (
                  <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                    {statusMeta.description}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">سجل التنفيذ للحصة</span>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'منجزة')}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    منجزة
                  </button>
                  <button
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'مؤجلة')}
                    className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    مؤجلة
                  </button>
                  <button
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'غير منجزة')}
                    className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    غير منجزة
                  </button>
                  <button
                    disabled={savingId === session.id}
                    onClick={() => updateStatus(session, 'مبرمجة')}
                    className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    مبرمجة
                  </button>
                  {status === 'مؤجلة' && (
                    <button
                      onClick={() =>
                        window.location.assign(
                          `/planning?section=annual-distribution&classId=${encodeURIComponent(session.classId)}&classPlannedSessionId=${encodeURIComponent(session.id)}&academicYearId=${encodeURIComponent(session.academicYearId)}`
                        )
                      }
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
                    >
                      إعادة البرمجة
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={noteDrafts[session.id] ?? entry?.note ?? ''}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [session.id]: event.target.value,
                      }))
                    }
                    placeholder="ملاحظة التنفيذ"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                  <button
                    disabled={savingId === session.id}
                    onClick={() => saveNote(session)}
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50"
                  >
                    حفظ الملاحظة
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    المقطع: {sectionLabel}
                  </span>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    المذكرة: {sessionDto.memoExists ? 'موجودة' : 'غير منشأة'}
                  </span>
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
                      {isPreviewExpanded ? 'إخفاء محتوى المذكرة' : 'عرض محتوى المذكرة'}
                    </button>
                  )}
                  <button
                    onClick={() => onOpenAIGeneratorForSession(sessionRef(session, reference))}
                    className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700"
                  >
                    توليد المذكرة
                  </button>
                  <button
                    onClick={() => openMemo(session, entry)}
                    className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <FileText className="h-3.5 w-3.5" /> فتح المذكرة
                  </button>
                  {reference &&
                    (reference.sessionType === 'تقويم تشخيصي' ||
                      reference.sessionType === 'تقويم تحصيلي') && (
                      <button
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
                        className="flex items-center gap-1 rounded-xl bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700"
                      >
                        <Target className="h-3.5 w-3.5" /> فتح التقويم
                      </button>
                    )}
                  {reference &&
                    (reference.sessionType === 'تقويم تشخيصي' ||
                      reference.sessionType === 'تقويم تحصيلي') && (
                      <button
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
                        className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                      >
                        <Target className="h-3.5 w-3.5" /> تسجيل الحضور
                      </button>
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
