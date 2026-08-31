import React, { useEffect, useMemo, useState } from 'react';
import { FileText, PenSquare, Plus, Printer, Save, Trash2, X } from 'lucide-react';
import { ClassRoom, EducationalSituation, LessonPlan, LessonPlanRow, User } from '../../types/spex';
import {
  COMPLETE_ANNUAL_CURRICULUM,
  PE_FIELDS,
  generateAnnualTimeDistribution,
} from '../../data/algerianCurriculum';
import {
  autoGenerateLessonPlan,
  formatSituationExecution,
  generateLessonMemoDocument,
  getUnifiedLessonRows,
  rebalanceLessonRows,
} from '../../services/lessonPlan.generator.service';
import {
  fetchAnnualPlans,
  fetchTeacherPlanningSessions,
  TeacherPlanningSession,
} from '../../services/api';
import { mergeSchedule, MergedScheduledLesson } from '../../services/schedule/scheduleMerge';
import { canonicalReferenceSessions } from '../../services/teacherPlanning.service';
import {
  formatAcademicYearLabel,
  formatAcademicYearSelectLabel,
  getCurrentAcademicYear,
  getOperationalAcademicYearOptions,
  isOperationalAcademicYear,
} from '../../services/academicYear';
import {
  findOperationalLessonPlan,
  isOwnedOperationalSession,
  LessonMemoMode,
  sortOperationalSessions,
} from '../../services/lessonPlanWorkflow.service';
import {
  exportLessonPlanToPdf,
  exportLessonPlanToWord,
} from '../../services/lessonPlanExport.service';
import {
  findSuitableSituations,
  referenceSituations,
  snapshotSituation,
} from '../../services/educationalSituation.selector.service';

interface LessonPlanViewProps {
  lessonPlans: LessonPlan[];
  activeLessonId?: string;
  onSaveLessonPlan: (lesson: LessonPlan) => void;
  onDeleteLessonPlan?: (lessonId: string) => void;
  onUpdateLessonStatus?: (
    lessonId: string,
    status: 'منجزة' | 'مؤجلة' | 'غير منجزة',
    note?: string
  ) => void;
  onOpenCommandCenterForPlan?: (plan: LessonPlan) => void;
  currentUser?: User;
  inspectorName?: string;
  teacherClasses: ClassRoom[];
}

const LEVEL_KEYS: Record<string, string> = {
  'السنة الأولى ابتدائي': 'lvl_p1',
  'السنة الثانية ابتدائي': 'lvl_p2',
  'السنة الثالثة ابتدائي': 'lvl_p3',
  'السنة الرابعة ابتدائي': 'lvl_p4',
  'السنة الخامسة ابتدائي': 'lvl_p5',
};
const LEVELS = Object.keys(LEVEL_KEYS);
const YEAR_KEY = 'arenaspex:selectedAcademicYear';

function displayLevelName(classRoom: ClassRoom): string {
  return (
    classRoom.levelName ||
    Object.entries(LEVEL_KEYS).find(([, levelId]) => levelId === classRoom.levelId)?.[0] ||
    'المستوى الدراسي'
  );
}

function formatLessonDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day} / ${month} / ${year}` : value;
}

function formatSessionSequence(session: TeacherPlanningSession): string {
  return String(session.reference?.sequenceIndex || '—');
}

function sessionStateLabel(session: TeacherPlanningSession, memo?: LessonPlan): string {
  if (memo) return 'مذكرة محفوظة';
  if (session.status === 'منجزة') return 'حصة منجزة — المذكرة غير منشأة';
  if (session.status === 'مؤجلة') return 'حصة مؤجلة — المذكرة غير منشأة';
  return 'مذكرة غير منشأة';
}

function displayFieldName(domainId?: string, fieldName?: string): string {
  if (!fieldName || domainId === 'intro' || fieldName.trim().toLowerCase() === 'intro') return '';
  return fieldName;
}

type SourceSession = Parameters<typeof autoGenerateLessonPlan>[0];

function sessionsForLevel(levelName: string): SourceSession[] {
  const level = COMPLETE_ANNUAL_CURRICULUM[LEVEL_KEYS[levelName]];
  if (!level) return [];
  let globalNumber = 0;
  return Object.values(level.fields).flatMap((field) =>
    field.sessionsList.map((session) => ({
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      finalCompetency: field.finalCompetency,
      segmentGoal: field.finalCompetency,
      sessionNumber: session.sessionNumber,
      globalNumber: ++globalNumber,
      weekNumber: globalNumber,
      type: session.type as LessonPlan['sessionType'],
      typeLabel: session.typeLabel,
      objective: session.objective,
      tools: field.suggestedTools || [],
    }))
  );
}

const editableRow = (
  row: LessonPlanRow,
  key: keyof LessonPlanRow,
  value: string | number
): LessonPlanRow => ({ ...row, [key]: value });

export const LessonPlanView: React.FC<LessonPlanViewProps> = ({
  lessonPlans,
  activeLessonId,
  onSaveLessonPlan,
  onDeleteLessonPlan,
  currentUser,
  teacherClasses,
  onOpenCommandCenterForPlan,
  inspectorName,
}) => {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedClassId = query.get('classId') || '';
  const requestedSessionId = query.get('classPlannedSessionId') || '';
  const [selectedId, setSelectedId] = useState(activeLessonId || lessonPlans[0]?.id || '');
  const [showGenerator, setShowGenerator] = useState(false);
  const [levelName, setLevelName] = useState(LEVELS[0]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [replaceRowId, setReplaceRowId] = useState<string | null>(null);
  const [bankSituations, setBankSituations] = useState<EducationalSituation[]>([]);
  const [scheduledLessons, setScheduledLessons] = useState<MergedScheduledLesson[]>([]);
  const [sourceLabel, setSourceLabel] = useState<'actual' | 'fallback'>('fallback');
  const [generationError, setGenerationError] = useState('');
  const [draft, setDraft] = useState<LessonPlan | null>(null);
  const [memoMode, setMemoMode] = useState<LessonMemoMode>('operational');
  const [screenMode, setScreenMode] = useState<'list' | 'generator' | 'saved'>(
    activeLessonId ? 'saved' : 'list'
  );
  const [activeLessonPlanId, setActiveLessonPlanId] = useState(activeLessonId || '');
  const [generatorReturnMode, setGeneratorReturnMode] = useState<'list' | 'saved'>('list');
  const [deepLinkDismissed, setDeepLinkDismissed] = useState(false);
  const [operationalClassId, setOperationalClassId] = useState(
    requestedClassId || teacherClasses[0]?.id || ''
  );
  const [operationalAcademicYearId, setOperationalAcademicYearId] = useState(() => {
    const requestedYear = query.get('academicYearId') || localStorage.getItem(YEAR_KEY) || '';
    return isOperationalAcademicYear(requestedYear) ? requestedYear : getCurrentAcademicYear();
  });
  const [operationalSessionId, setOperationalSessionId] = useState(requestedSessionId);
  const [operationalSessions, setOperationalSessions] = useState<TeacherPlanningSession[]>([]);
  const [scheduledError, setScheduledError] = useState('');
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const scheduledMode = memoMode === 'operational' && Boolean(operationalClassId);
  const operationalClass = teacherClasses.find((item) => item.id === operationalClassId);
  const operationalSession = operationalSessions.find((item) => item.id === operationalSessionId);
  const scheduledContext = useMemo(() => {
    if (!operationalClass || !operationalSession) return null;
    const canonicalReference = canonicalReferenceSessions(operationalClass.levelId).find(
      (item) => item.referenceSessionId === operationalSession.referenceSessionId
    );
    if (!canonicalReference) return null;
    return {
      session: operationalSession,
      reference: operationalSession.reference
        ? { ...canonicalReference, objective: operationalSession.reference.objective }
        : canonicalReference,
      classRoom: operationalClass,
    };
  }, [operationalClass, operationalSession]);
  const existingOperationalMemo = scheduledContext
    ? findOperationalLessonPlan(lessonPlans, scheduledContext.session, currentUser?.id || '')
    : undefined;
  const activeLessonPlan = lessonPlans.find((plan) => plan.id === activeLessonPlanId);
  const activeLessonPlanForContext =
    scheduledMode && operationalSession
      ? activeLessonPlan?.teacherId === currentUser?.id &&
        activeLessonPlan.classId === operationalSession.classId &&
        activeLessonPlan.academicYearId === operationalSession.academicYearId &&
        activeLessonPlan.classPlannedSessionId === operationalSession.id
        ? activeLessonPlan
        : undefined
      : activeLessonPlan;
  const sessions = useMemo(() => sessionsForLevel(levelName), [levelName]);
  const generatorSessions = useMemo<SourceSession[]>(
    () =>
      memoMode === 'operational' && scheduledContext
        ? [
            {
              fieldId: scheduledContext.reference.domainId,
              fieldName: displayFieldName(
                scheduledContext.reference.domainId,
                PE_FIELDS.find((field) => field.id === scheduledContext.reference.domainId)?.name
              ),
              finalCompetency:
                COMPLETE_ANNUAL_CURRICULUM[scheduledContext.reference.levelId]?.fields[
                  scheduledContext.reference.domainId
                ]?.finalCompetency || '',
              segmentGoal: scheduledContext.reference.objective,
              sessionNumber: scheduledContext.reference.fieldSessionNumber,
              globalNumber: scheduledContext.reference.sequenceIndex,
              weekNumber: Math.ceil(scheduledContext.reference.sequenceIndex / 2),
              type: scheduledContext.reference.sessionType as LessonPlan['sessionType'],
              typeLabel: scheduledContext.reference.sessionTypeLabel,
              objective: scheduledContext.reference.objective,
              tools:
                COMPLETE_ANNUAL_CURRICULUM[scheduledContext.reference.levelId]?.fields[
                  scheduledContext.reference.domainId
                ]?.suggestedTools || [],
            },
          ]
        : scheduledLessons.map((scheduled) => ({
            fieldId: scheduled.fieldId,
            fieldName: displayFieldName(scheduled.fieldId, scheduled.fieldName),
            finalCompetency:
              COMPLETE_ANNUAL_CURRICULUM[scheduled.levelId]?.fields[scheduled.fieldId]
                ?.finalCompetency || '',
            segmentGoal:
              COMPLETE_ANNUAL_CURRICULUM[scheduled.levelId]?.fields[scheduled.fieldId]
                ?.finalCompetency || '',
            sessionNumber: scheduled.fieldSessionNumber,
            globalNumber: scheduled.globalSessionNumber,
            weekNumber: Math.ceil(scheduled.globalSessionNumber / 2),
            type: scheduled.sessionType as LessonPlan['sessionType'],
            typeLabel: scheduled.sessionTypeLabel,
            objective: scheduled.wordingOverride || scheduled.targetObjective,
            tools:
              COMPLETE_ANNUAL_CURRICULUM[scheduled.levelId]?.fields[scheduled.fieldId]
                ?.suggestedTools || [],
          })),
    [memoMode, scheduledContext, scheduledLessons]
  );
  const selected = scheduledMode
    ? screenMode === 'saved'
      ? activeLessonPlanForContext || existingOperationalMemo
      : undefined
    : activeLessonPlanForContext ||
      lessonPlans.find((plan) => plan.id === selectedId) ||
      lessonPlans[0];

  useEffect(() => {
    setSessionIndex(0);
  }, [levelName]);
  useEffect(() => {
    if (activeLessonId) {
      setSelectedId(activeLessonId);
      setActiveLessonPlanId(activeLessonId);
      setScreenMode('saved');
    }
  }, [activeLessonId]);
  useEffect(() => {
    if (!operationalClassId && teacherClasses[0]) setOperationalClassId(teacherClasses[0].id);
  }, [operationalClassId, teacherClasses]);

  useEffect(() => {
    if (deepLinkDismissed || !requestedSessionId || !operationalSession) return;
    const requestedMemo = findOperationalLessonPlan(
      lessonPlans,
      operationalSession,
      currentUser?.id || ''
    );
    if (!requestedMemo) return;
    setSelectedId(requestedMemo.id);
    setActiveLessonPlanId(requestedMemo.id);
    setScreenMode('saved');
  }, [currentUser?.id, deepLinkDismissed, lessonPlans, operationalSession, requestedSessionId]);

  useEffect(() => {
    const shouldLoad =
      memoMode === 'operational' &&
      Boolean(operationalClassId) &&
      Boolean(operationalAcademicYearId);
    if (!shouldLoad) return;
    let cancelled = false;
    setScheduledLoading(true);
    setScheduledError('');
    fetchTeacherPlanningSessions(operationalClassId, operationalAcademicYearId)
      .then((result) => {
        if (cancelled) return;
        const nextSessions = sortOperationalSessions(result.sessions);
        setOperationalSessions(nextSessions);
        const requested = requestedSessionId || operationalSessionId;
        const matchedById = nextSessions.find((item) => item.id === requested);
        const matchedByReference = matchedById
          ? undefined
          : nextSessions.find((item) => item.referenceSessionId === requested);
        const resolvedRequested = matchedById || matchedByReference;
        const nextId = resolvedRequested?.id || nextSessions[0]?.id || '';
        if (requestedSessionId && !resolvedRequested) {
          setScheduledError('الحصة التشغيلية المطلوبة غير موجودة ضمن أقسامك.');
          setOperationalSessionId('');
          return;
        }
        setOperationalSessionId(nextId);
        const located = nextSessions.find((item) => item.id === nextId);
        const matchingLevel = Object.entries(LEVEL_KEYS).find(
          ([, id]) => id === operationalClass?.levelId
        )?.[0];
        if (matchingLevel) setLevelName(matchingLevel);
        if (
          located &&
          !canonicalReferenceSessions(operationalClass?.levelId || '').some(
            (item) => item.referenceSessionId === located.referenceSessionId
          )
        ) {
          setScheduledError('تعذر تحميل المرجع البيداغوجي لهذه الحصة.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOperationalSessions([]);
          setOperationalSessionId('');
          setScheduledError('تعذر تحميل الحصص التشغيلية للقسم المحدد.');
        }
      })
      .finally(() => {
        if (!cancelled) setScheduledLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    memoMode,
    operationalAcademicYearId,
    operationalClassId,
    operationalClass?.levelId,
    requestedSessionId,
    showGenerator,
  ]);

  useEffect(() => {
    if (!showBank) return;
    fetch('/api/educational-situations')
      .then((response) => (response.ok ? response.json() : { situations: [] }))
      .then((body) => setBankSituations(body.situations || []))
      .catch(() => setBankSituations([]));
  }, [showBank]);

  useEffect(() => {
    if (!showGenerator || !currentUser?.id || memoMode === 'operational') return;
    const levelId = LEVEL_KEYS[levelName];
    const base = generateAnnualTimeDistribution(
      levelId,
      `${getCurrentAcademicYear().slice(0, 4)}-09-01`,
      0,
      ''
    );
    Promise.all([
      fetchAnnualPlans({ teacherId: currentUser.id, kind: 'schedule_dates', levelId }),
      fetchAnnualPlans({ teacherId: currentUser.id, kind: 'section_wording', levelId }),
    ])
      .then(([scheduleResponse, wordingResponse]) => {
        const schedule = scheduleResponse.annualPlans?.[0];
        const wording = wordingResponse.annualPlans?.[0];
        if (!schedule) {
          setScheduledLessons([]);
          setSourceLabel('fallback');
          return;
        }
        setScheduledLessons(
          mergeSchedule(base, schedule.data?.overrides || {}, wording?.data?.overrides || {})
        );
        setSourceLabel('actual');
      })
      .catch(() => {
        setScheduledLessons([]);
        setSourceLabel('fallback');
      });
  }, [showGenerator, levelName, currentUser?.id, memoMode, scheduledContext]);

  const createPlan = () => {
    if (memoMode === 'operational') {
      if (
        !scheduledContext ||
        !isOwnedOperationalSession(scheduledContext.session, {
          teacherId: currentUser?.id || '',
          classId: operationalClassId,
          academicYearId: operationalAcademicYearId,
        })
      ) {
        setGenerationError('اختر حصة مبرمجة صحيحة ضمن القسم والسنة الدراسية المحددين.');
        return;
      }
      if (existingOperationalMemo) {
        setSelectedId(existingOperationalMemo.id);
        setActiveLessonPlanId(existingOperationalMemo.id);
        setScreenMode('saved');
        setShowGenerator(false);
        setGenerationError('');
        return;
      }
    }
    const operationalContext = memoMode === 'operational' ? scheduledContext : null;
    const source = (generatorSessions.length ? generatorSessions : sessions)[sessionIndex];
    if (!source) {
      setGenerationError(
        memoMode === 'operational'
          ? 'لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.'
          : 'تعذر العثور على حصة صالحة من المنهاج.'
      );
      return;
    }
    try {
      const plan = autoGenerateLessonPlan(source, {
        levelName: operationalContext?.classRoom.levelName || levelName,
        teacher: currentUser,
        className: operationalContext?.classRoom.name || '',
        classPlannedSessionId: operationalContext?.session.id,
        referenceSessionId: operationalContext?.session.referenceSessionId,
        academicYearId: operationalContext?.session.academicYearId,
        classId: operationalContext?.session.classId,
        plannedStartTime: operationalContext?.session.startTime,
        venue: operationalContext?.session.venue,
        inspectorName,
        date: operationalContext?.session.plannedDate.slice(0, 10),
        durationMinutes: operationalContext?.session.durationMinutes,
      });
      if (!plan.lessonRows?.length) throw new Error('empty memo');
      onSaveLessonPlan(plan);
      setSelectedId(plan.id);
      setActiveLessonPlanId(plan.id);
      setScreenMode('saved');
      setGenerationError('');
      setShowGenerator(false);
    } catch {
      setGenerationError('تعذر توليد المذكرة. حاول إعادة فتح الحصة.');
    }
  };

  const beginEdit = () => {
    if (!selected) return;
    setDraft({
      ...selected,
      lessonRows: getUnifiedLessonRows(selected).map((row) => ({ ...row })),
      equipmentNeeded: [...selected.equipmentNeeded],
    });
    setEditing(true);
  };
  const saveEdit = () => {
    if (!draft) return;
    const lessonRows = rebalanceLessonRows(
      draft.lessonRows || [],
      draft.classPlannedSessionId && scheduledContext
        ? scheduledContext.session.durationMinutes
        : draft.durationMinutes
    );
    const equipmentNeeded = [
      ...new Set(draft.equipmentNeeded.map((item) => item.trim()).filter(Boolean)),
    ];
    onSaveLessonPlan({
      ...draft,
      lessonRows,
      equipmentNeeded,
      equipmentChecklist: equipmentNeeded.map((name) => ({ name, available: true })),
      version: Math.max(draft.version || 1, 2),
    });
    setEditing(false);
    setDraft(null);
  };

  const closeSavedMemo = () => {
    setEditing(false);
    setDraft(null);
    setActiveLessonPlanId('');
    setDeepLinkDismissed(true);
    setScreenMode('list');
  };

  const generatorModal = showGenerator ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-extrabold">
            {memoMode === 'operational' ? 'مذكرة حصة مبرمجة' : 'مذكرة مستقلة'}
          </h3>
          <button
            onClick={() => {
              setShowGenerator(false);
              setScreenMode(generatorReturnMode);
            }}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMemoMode('operational');
              setGenerationError('');
            }}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${memoMode === 'operational' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
          >
            مذكرة حصة مبرمجة
          </button>
          <button
            type="button"
            onClick={() => {
              setMemoMode('standalone');
              setGenerationError('');
            }}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${memoMode === 'standalone' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'}`}
          >
            مذكرة مستقلة
          </button>
        </div>
        {memoMode === 'operational' ? (
          <>
            <label className="mb-1 block text-sm font-bold">القسم</label>
            <select
              value={operationalClassId}
              onChange={(event) => {
                setOperationalClassId(event.target.value);
                setOperationalSessionId('');
                closeSavedMemo();
              }}
              className="mb-3 w-full rounded-xl border p-2"
            >
              <option value="">اختر قسماً</option>
              {teacherClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || displayLevelName(item)}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-sm font-bold">السنة الدراسية</label>
            <select
              dir="ltr"
              value={operationalAcademicYearId}
              onChange={(event) => {
                setOperationalAcademicYearId(event.target.value);
                setOperationalSessionId('');
                closeSavedMemo();
              }}
              className="mb-3 w-full rounded-xl border p-2"
            >
              {getOperationalAcademicYearOptions().map((year) => (
                <option key={year} value={year}>
                  {formatAcademicYearSelectLabel(year)}
                </option>
              ))}
            </select>
            {scheduledLoading ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                جارٍ تحميل الحصص المبرمجة...
              </p>
            ) : operationalSessions.length ? (
              <>
                <label className="mb-1 block text-sm font-bold">الحصة المبرمجة</label>
                <select
                  value={operationalSessionId}
                  onChange={(event) => {
                    setOperationalSessionId(event.target.value);
                    setGenerationError('');
                  }}
                  className="w-full rounded-xl border p-2 text-sm"
                >
                  {operationalSessions.map((session) => {
                    const memo = findOperationalLessonPlan(
                      lessonPlans,
                      session,
                      currentUser?.id || ''
                    );
                    return (
                      <option key={session.id} value={session.id}>
                        {formatLessonDate(session.plannedDate)} ·{' '}
                        {session.reference?.sessionTypeLabel || 'حصة'} · الحصة{' '}
                        {formatSessionSequence(session)} · {memo ? 'مذكرة محفوظة' : 'غير منشأة'}
                      </option>
                    );
                  })}
                </select>
                {scheduledContext && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <span>
                      <strong className="text-slate-800">التاريخ:</strong>{' '}
                      <bdi dir="ltr">{formatLessonDate(scheduledContext.session.plannedDate)}</bdi>
                    </span>
                    <span>
                      <strong className="text-slate-800">النوع:</strong>{' '}
                      {scheduledContext.reference.sessionTypeLabel}
                    </span>
                    <span>
                      <strong className="text-slate-800">السنة الدراسية:</strong>{' '}
                      <bdi dir="ltr">{formatAcademicYearLabel(operationalAcademicYearId)}</bdi>
                    </span>
                    <span className="col-span-2">
                      <strong className="text-slate-800">الهدف:</strong>{' '}
                      {scheduledContext.reference.objective}
                    </span>
                    <span>
                      <strong className="text-slate-800">المدة:</strong>{' '}
                      {scheduledContext.session.durationMinutes} دقيقة
                    </span>
                    <span>
                      <strong className="text-slate-800">التوقيت:</strong>{' '}
                      {scheduledContext.session.startTime || 'غير محدد'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-sm font-bold text-slate-700">
                  لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    window.location.assign(
                      `/planning?section=annual-distribution&classId=${encodeURIComponent(operationalClassId)}&academicYearId=${encodeURIComponent(operationalAcademicYearId)}`
                    )
                  }
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
                >
                  إنشاء / فتح التوزيع السنوي
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              تُبنى المذكرة على الحصة المحددة وقسمها وسنتها وتاريخها الفعلي.
            </p>
          </>
        ) : (
          <>
            <label className="mb-1 block text-sm font-bold">المستوى</label>
            <select
              value={levelName}
              onChange={(event) => setLevelName(event.target.value)}
              className="mb-4 w-full rounded-xl border p-2"
            >
              {LEVELS.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
            <label className="mb-1 block text-sm font-bold">الحصة المرجعية</label>
            <select
              value={sessionIndex}
              onChange={(event) => setSessionIndex(Number(event.target.value))}
              className="w-full rounded-xl border p-2"
            >
              {(generatorSessions.length ? generatorSessions : sessions).map((session, index) => (
                <option key={`${session.fieldId}-${session.sessionNumber}`} value={index}>
                  الحصة {session.globalNumber}: {session.objective}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-bold text-slate-600">
              المصدر: {sourceLabel === 'actual' ? 'التوزيع السنوي المرجعي' : 'المنهاج المرجعي'}
            </p>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              هذه المذكرة غير مرتبطة بحصة مبرمجة في الكراس اليومي.
            </p>
          </>
        )}
        {generationError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700"
          >
            {generationError}
          </p>
        )}
        <button
          type="button"
          disabled={memoMode === 'operational' && (!scheduledContext || scheduledLoading)}
          onClick={createPlan}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {memoMode === 'operational' && existingOperationalMemo ? 'فتح المذكرة' : 'توليد المذكرة'}
        </button>
      </div>
    </div>
  ) : null;

  const selectedOperationalSession = operationalSessions.find(
    (session) => session.id === operationalSessionId
  );
  const selectOperationalSession = (sessionId: string) => {
    setOperationalSessionId(sessionId);
    setGenerationError('');
    setScheduledError('');
  };
  const createOperationalMemo = (sessionId: string) => {
    selectOperationalSession(sessionId);
    setMemoMode('operational');
    setGeneratorReturnMode('list');
    setScreenMode('generator');
    setShowGenerator(true);
  };
  const openOperationalMemo = (session: TeacherPlanningSession, memo?: LessonPlan) => {
    if (!memo) {
      setScheduledError('تعذر فتح المذكرة المحفوظة. أعد تحميل البيانات وحاول مرة أخرى.');
      return;
    }
    selectOperationalSession(session.id);
    setSelectedId(memo.id);
    setActiveLessonPlanId(memo.id);
    setDeepLinkDismissed(false);
    setMemoMode('operational');
    setScreenMode('saved');
    setShowGenerator(false);
  };
  const openGenerator = (mode: LessonMemoMode, returnMode: 'list' | 'saved') => {
    setMemoMode(mode);
    setGeneratorReturnMode(returnMode);
    setScreenMode('generator');
    setGenerationError('');
    setShowGenerator(true);
  };
  const workspaceHeader = (
    <header className="workspace-header lesson-memo-workspace-header flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
            الوثائق التنفيذية
          </span>
          <span className="text-xs font-semibold text-slate-500">مذكرات الحصص</span>
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
          <FileText className="h-6 w-6 text-emerald-700" />
          مذكرات الحصص
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          إدارة مذكرات الحصص المرتبطة بالتوزيع السنوي والكراس اليومي
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2 xl:max-w-xl">
        <label className="text-xs font-bold text-slate-700">
          القسم
          <select
            aria-label="القسم"
            value={operationalClassId}
            onChange={(event) => {
              setOperationalClassId(event.target.value);
              setOperationalSessionId('');
              setScheduledError('');
              closeSavedMemo();
            }}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          >
            <option value="">اختر قسماً</option>
            {teacherClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || displayLevelName(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          السنة الدراسية
          <select
            aria-label="السنة الدراسية"
            dir="ltr"
            value={operationalAcademicYearId}
            onChange={(event) => {
              setOperationalAcademicYearId(event.target.value);
              setOperationalSessionId('');
              setScheduledError('');
              closeSavedMemo();
            }}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          >
            {getOperationalAcademicYearOptions().map((year) => (
              <option key={year} value={year}>
                {formatAcademicYearSelectLabel(year)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
  const plannedSessionsList = (
    <section
      className="workspace-card rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs"
      aria-labelledby="planned-sessions-heading"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 id="planned-sessions-heading" className="text-lg font-bold text-slate-900">
            الحصص المبرمجة والمذكرات
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            اختر حصة مرتبطة بالتوزيع السنوي لفتح المذكرة أو إنشائها.
          </p>
        </div>
        {operationalClass && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            {operationalClass.name || displayLevelName(operationalClass)} ·{' '}
            <bdi dir="ltr">{formatAcademicYearLabel(operationalAcademicYearId)}</bdi>
          </span>
        )}
      </div>
      {scheduledError && (
        <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
          {scheduledError}
        </p>
      )}
      {!operationalClassId ? (
        <div className="workspace-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-700">اختر قسماً لعرض الحصص المبرمجة</p>
        </div>
      ) : scheduledLoading ? (
        <div className="workspace-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-600">جارٍ تحميل الحصص المبرمجة...</p>
        </div>
      ) : operationalSessions.length === 0 ? (
        <div className="workspace-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-700">لا توجد حصص مبرمجة لهذا القسم</p>
          <button
            type="button"
            onClick={() =>
              window.location.assign(
                `/planning?section=annual-distribution&classId=${encodeURIComponent(operationalClassId)}&academicYearId=${encodeURIComponent(operationalAcademicYearId)}`
              )
            }
            className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
          >
            فتح التوزيع السنوي
          </button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {operationalSessions.map((session) => {
            const memo = findOperationalLessonPlan(lessonPlans, session, currentUser?.id || '');
            const reference = session.reference;
            const fieldName = displayFieldName(reference?.domainId, reference?.fieldName);
            const isSelected = selectedOperationalSession?.id === session.id;
            return (
              <article
                key={session.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-emerald-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      <bdi dir="ltr">{formatLessonDate(session.plannedDate)}</bdi> · الحصة{' '}
                      {formatSessionSequence(session)}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {reference?.sessionTypeLabel || 'حصة مبرمجة'}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      memo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {sessionStateLabel(session, memo)}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="font-bold text-slate-800">الهدف</dt>
                    <dd className="mt-0.5 line-clamp-2">
                      {reference?.objective || 'هدف غير محدد'}
                    </dd>
                  </div>
                  {fieldName && (
                    <div>
                      <dt className="font-bold text-slate-800">الميدان</dt>
                      <dd className="mt-0.5">{fieldName}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-bold text-slate-800">المدة والتوقيت</dt>
                    <dd className="mt-0.5">
                      {session.durationMinutes} دقيقة · {session.startTime || 'غير محدد'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      memo ? openOperationalMemo(session, memo) : createOperationalMemo(session.id)
                    }
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    {memo ? 'فتح المذكرة' : 'إنشاء المذكرة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOperationalSession(session.id)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const plan = editing ? draft : selected;
  if (!plan) {
    return (
      <div className="space-y-5">
        {workspaceHeader}
        {screenMode !== 'saved' && plannedSessionsList}
        {screenMode === 'saved' && (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            تعذر تحميل المذكرة المحفوظة. أعد تحميل البيانات وحاول مرة أخرى.
            <button
              type="button"
              onClick={() => {
                setActiveLessonPlanId('');
                setScreenMode('list');
              }}
              className="mr-3 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900"
            >
              العودة إلى الحصص
            </button>
          </div>
        )}
        {generatorModal}
      </div>
    );
  }
  const isScheduled = Boolean(plan.classPlannedSessionId);
  const effectiveDuration =
    isScheduled && scheduledContext
      ? scheduledContext.session.durationMinutes
      : plan.durationMinutes;
  const rows = editing ? draft?.lessonRows || [] : getUnifiedLessonRows(plan);
  const presentationPlan = inspectorName && !plan.inspectorName ? { ...plan, inspectorName } : plan;
  const memoModel = generateLessonMemoDocument(
    editing ? { ...presentationPlan, lessonRows: rows } : presentationPlan,
    { durationMinutes: effectiveDuration }
  );
  const visibleFieldName = displayFieldName('', memoModel.header.field);
  const setRows = (lessonRows: LessonPlanRow[]) =>
    setDraft((previous) => previous && { ...previous, lessonRows });
  const grade = LEVELS.indexOf(plan.levelName) + 1;
  const fieldId =
    PE_FIELDS.find((field) => field.name === plan.fieldName)?.id ||
    sessionsForLevel(plan.levelName).find((s) => s.fieldName === plan.fieldName)?.fieldId ||
    '';
  const matchingSituations = findSuitableSituations(
    bankSituations.length ? bankSituations : referenceSituations,
    {
      grade,
      fieldId,
      objectiveText: plan.sessionTitle,
    }
  );
  const privateMatchingSituations = bankSituations.filter(
    (situation) =>
      situation.ownerId === currentUser?.id &&
      ['PRIVATE', 'REJECTED'].includes(situation.status) &&
      situation.grade === grade &&
      situation.fieldId === fieldId &&
      situation.objectiveTexts.includes(plan.sessionTitle)
  );
  const availableSituations = [
    ...matchingSituations,
    ...privateMatchingSituations.filter(
      (item) => !matchingSituations.some((match) => match.id === item.id)
    ),
  ];
  const mainSituationCount = memoModel.mainPhase.situations.length;
  const addSituation = (situation: EducationalSituation) => {
    const main = {
      id: `main-${Date.now()}`,
      phase: 'المرحلة الرئيسية' as const,
      learningContent: situation.name,
      executionContent: formatSituationExecution(situation),
      durationMinutes: 1,
      guidance: situation.variations || 'احترام التعليمات.',
      situationSnapshot: snapshotSituation(situation),
    };
    const candidateRows = replaceRowId
      ? rows.map((row) => (row.id === replaceRowId ? { ...main, id: replaceRowId } : row))
      : [...rows, main];
    const next = rebalanceLessonRows(candidateRows, effectiveDuration);
    const equipmentNeeded = [
      ...new Set(next.flatMap((row) => row.situationSnapshot?.equipment || [])),
    ];
    if (editing) {
      setDraft((previous) => previous && { ...previous, lessonRows: next, equipmentNeeded });
    } else {
      onSaveLessonPlan({ ...plan, lessonRows: next, equipmentNeeded });
    }
    setReplaceRowId(null);
  };

  const removeSituation = (rowId: string) => {
    const next = rebalanceLessonRows(
      rows.filter((row) => row.id !== rowId),
      effectiveDuration
    );
    const equipmentNeeded = [
      ...new Set(next.flatMap((row) => row.situationSnapshot?.equipment || [])),
    ];
    if (editing)
      setDraft((previous) => previous && { ...previous, lessonRows: next, equipmentNeeded });
    else onSaveLessonPlan({ ...plan, lessonRows: next, equipmentNeeded });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {workspaceHeader}
      {screenMode !== 'saved' && plannedSessionsList}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <FileText className="h-5 w-5 text-blue-600" />
            مذكرة الحصة
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {isScheduled
              ? 'قالب موحد مستمد من الحصة المحددة في التوزيع السنوي.'
              : 'هذه المذكرة غير مرتبطة بحصة مبرمجة في الكراس اليومي.'}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${isScheduled ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}
          >
            {isScheduled ? 'مذكرة حصة مبرمجة' : 'مذكرة مستقلة'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {screenMode === 'saved' && (
            <button
              type="button"
              onClick={closeSavedMemo}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
            >
              العودة إلى الحصص
            </button>
          )}
          <button
            onClick={() => {
              openGenerator('operational', 'saved');
            }}
            className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            مذكرة حصة مبرمجة
          </button>
          <button
            type="button"
            onClick={() => {
              openGenerator('standalone', 'saved');
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
          >
            <FileText className="h-4 w-4" />
            مذكرة مستقلة
          </button>
          {!editing && onOpenCommandCenterForPlan && (
            <button
              onClick={() => onOpenCommandCenterForPlan(plan)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
            >
              تشغيل في مركز القيادة
            </button>
          )}{' '}
          {!editing &&
            plan.classPlannedSessionId &&
            plan.classId &&
            plan.academicYearId &&
            (plan.sessionType === 'تقويم تشخيصي' || plan.sessionType === 'تقويم تحصيلي') && (
              <button
                onClick={() =>
                  window.location.assign(
                    '/gradebook?classId=' +
                      encodeURIComponent(plan.classId || '') +
                      '&academicYearId=' +
                      encodeURIComponent(plan.academicYearId || '') +
                      '&classPlannedSessionId=' +
                      encodeURIComponent(plan.classPlannedSessionId || '')
                  )
                }
                className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white"
              >
                فتح دفتر التقويم
              </button>
            )}
          {!editing && (
            <>
              <button
                onClick={beginEdit}
                className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
              >
                <PenSquare className="h-4 w-4" />
                تعديل
              </button>
              <button
                onClick={() => exportLessonPlanToPdf(plan)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                <Printer className="ml-1 inline h-4 w-4" />
                طباعة
              </button>
              <button
                onClick={() => exportLessonPlanToWord(plan)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                Word
              </button>
            </>
          )}
          <button
            onClick={() => setShowBank(true)}
            className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-bold text-blue-800"
          >
            اختيار من بنك المواقف
          </button>
          {editing && (
            <>
              <button
                onClick={saveEdit}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Save className="h-4 w-4" />
                حفظ
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(null);
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                إلغاء
              </button>
            </>
          )}
          {!editing && onDeleteLessonPlan && (
            <button
              onClick={() => onDeleteLessonPlan(plan.id)}
              className="rounded-xl border border-rose-200 p-2 text-rose-700"
              title="حذف المذكرة"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!editing && !scheduledMode && lessonPlans.length > 1 && (
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white p-2 text-sm font-bold"
        >
          {lessonPlans.map((item) => (
            <option key={item.id} value={item.id}>
              الحصة {item.sessionGlobalNumber || '—'} — {item.sessionTitle}
            </option>
          ))}
        </select>
      )}

      <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-50 px-5 py-3 text-center font-extrabold text-slate-900">
          مذكرة حصة تعلمية
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
          {[
            ['المؤسسة', memoModel.header.institution],
            ['المستوى', memoModel.header.grade],
            ['التاريخ', memoModel.header.date],
            ...(visibleFieldName ? [['الميدان', visibleFieldName]] : []),
            ['الوسائل', memoModel.header.equipment.join('، ')],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <strong className="block rounded-t-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                {label}
              </strong>
              {editing && label === 'الوسائل' ? (
                <input
                  value={draft?.equipmentNeeded.join('، ')}
                  onChange={(event) =>
                    setDraft((previous) =>
                      previous
                        ? { ...previous, equipmentNeeded: event.target.value.split(/[,،]/) }
                        : previous
                    )
                  }
                  className="w-full rounded-b-xl p-3 outline-none"
                />
              ) : (
                <span className="block min-h-9 p-2">{value}</span>
              )}
            </div>
          ))}
          <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 md:col-span-2">
            <h3 className="text-xs font-black text-indigo-900">الكفاءة الختامية</h3>
            <p className="mt-1 text-sm font-bold text-indigo-950">{memoModel.header.competency}</p>
          </section>
          <section className="rounded-xl border border-purple-200 bg-purple-50 p-3 md:col-span-2">
            <h3 className="text-xs font-black text-purple-900">الهدف التعليمي</h3>
            {editing ? (
              <textarea
                value={draft?.sessionTitle}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          sessionTitle: event.target.value,
                          generalObjective: event.target.value,
                        }
                      : previous
                  )
                }
                className="mt-1 min-h-14 w-full rounded-lg border border-purple-200 bg-white p-2 outline-none"
              />
            ) : (
              <p className="mt-2 text-sm font-bold text-purple-950">{memoModel.header.objective}</p>
            )}
          </section>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-right text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-500 p-3">المراحل</th>
                <th className="border border-slate-500 p-3">محتوى التعلم</th>
                <th className="border border-slate-500 p-3">محتوى الإنجاز</th>
                <th className="border border-slate-500 p-3">الوقت</th>
                <th className="border border-slate-500 p-3">التوجيهات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isMain = row.phase === 'المرحلة الرئيسية';
                const mainIndex = isMain
                  ? rows.slice(0, index + 1).filter((item) => item.phase === 'المرحلة الرئيسية')
                      .length
                  : 0;
                const firstMain = isMain && mainIndex === 1;
                return (
                  <tr
                    key={row.id}
                    className={`align-top ${
                      row.phase === 'المرحلة التحضيرية'
                        ? 'bg-blue-50/50'
                        : row.phase === 'المرحلة الختامية'
                          ? 'bg-green-50/50'
                          : 'bg-orange-50/40'
                    }`}
                  >
                    {(!isMain || firstMain) && (
                      <th
                        rowSpan={isMain ? mainSituationCount : 1}
                        className={`border border-slate-300 p-3 font-bold ${
                          row.phase === 'المرحلة التحضيرية'
                            ? 'bg-blue-100 text-blue-900'
                            : row.phase === 'المرحلة الختامية'
                              ? 'bg-green-100 text-green-900'
                              : 'bg-orange-100 text-orange-900'
                        }`}
                      >
                        {isMain ? 'المرحلة الرئيسية' : row.phase}
                      </th>
                    )}
                    {(!isMain || firstMain) && (
                      <td
                        rowSpan={isMain ? mainSituationCount : 1}
                        className="border border-slate-300 p-3"
                      >
                        {editing && isMain ? (
                          <textarea
                            value={row.learningContent}
                            onChange={(event) =>
                              setRows(
                                rows.map((item) =>
                                  item.phase === 'المرحلة الرئيسية'
                                    ? editableRow(item, 'learningContent', event.target.value)
                                    : item
                                )
                              )
                            }
                            className="min-h-32 w-full resize-y p-2 outline-none"
                          />
                        ) : (
                          <span className="whitespace-pre-line">
                            {isMain ? memoModel.mainPhase.learningContent : row.learningContent}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="border border-slate-300 p-1">
                      {editing ? (
                        <div className="space-y-2">
                          {isMain && (
                            <strong className="block p-2 text-orange-900">
                              الموقف {String(mainIndex).padStart(2, '0')}
                            </strong>
                          )}
                          <textarea
                            value={row.executionContent}
                            onChange={(event) =>
                              setRows(
                                rows.map((item, i) =>
                                  i === index
                                    ? editableRow(item, 'executionContent', event.target.value)
                                    : item
                                )
                              )
                            }
                            className="min-h-32 w-full resize-y p-2 outline-none"
                          />
                        </div>
                      ) : (
                        <div className="whitespace-pre-line p-3">
                          {isMain && (
                            <strong className="mb-2 block text-orange-900">
                              الموقف {String(mainIndex).padStart(2, '0')}
                            </strong>
                          )}
                          {row.executionContent}
                          {row.illustrationUrl && (
                            <img
                              src={row.illustrationUrl}
                              alt="رسم توضيحي للموقف"
                              className="mt-3 max-h-40 rounded"
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 font-bold">
                      {editing ? (
                        <input
                          type="number"
                          min="1"
                          value={row.durationMinutes}
                          onChange={(event) =>
                            setRows(
                              rows.map((item, i) =>
                                i === index
                                  ? editableRow(item, 'durationMinutes', Number(event.target.value))
                                  : item
                              )
                            )
                          }
                          className="w-20 p-2 outline-none"
                        />
                      ) : (
                        `${row.durationMinutes} د`
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 whitespace-pre-line">
                      {editing ? (
                        <textarea
                          value={row.guidance}
                          onChange={(event) =>
                            setRows(
                              rows.map((item, i) =>
                                i === index
                                  ? editableRow(item, 'guidance', event.target.value)
                                  : item
                              )
                            )
                          }
                          className="min-h-32 w-full resize-y p-2 outline-none"
                        />
                      ) : (
                        <span className="block p-3">{row.guidance}</span>
                      )}
                      {editing && isMain && row.situationSnapshot && (
                        <div className="p-2">
                          <button
                            type="button"
                            onClick={() => removeSituation(row.id)}
                            className="ml-2 rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                          >
                            إزالة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceRowId(row.id);
                              setShowBank(true);
                            }}
                            className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700"
                          >
                            استبدال
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-white p-4 text-sm font-bold text-slate-800">
          <span>الأستاذ: {memoModel.signatures.teacherName}</span>
          {memoModel.signatures.inspectorName && (
            <span>المفتش: {memoModel.signatures.inspectorName}</span>
          )}
        </footer>
      </article>
      <p className="text-xs text-slate-500">
        مجموع الزمن: {rows.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0)} دقيقة.
      </p>
      {isScheduled && scheduledContext && (
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() =>
              window.location.assign(
                `/planning?section=annual-distribution&classId=${encodeURIComponent(scheduledContext.classRoom.id)}&academicYearId=${encodeURIComponent(scheduledContext.session.academicYearId)}`
              )
            }
            className="rounded-xl border border-slate-300 px-3 py-2"
          >
            التوزيع السنوي
          </button>
          <button
            onClick={() =>
              window.location.assign(
                `/daily-notebook?classId=${encodeURIComponent(scheduledContext.classRoom.id)}&classPlannedSessionId=${encodeURIComponent(scheduledContext.session.id)}&academicYearId=${encodeURIComponent(scheduledContext.session.academicYearId)}`
              )
            }
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700"
          >
            الكراس اليومي
          </button>
        </div>
      )}

      {generatorModal}
      {showBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex justify-between">
              <h3 className="font-extrabold">
                {replaceRowId
                  ? 'استبدال الموقف من بنك المواقف'
                  : 'بنك المواقف التربوية المطابقة للهدف'}
              </h3>
              <button onClick={() => setShowBank(false)}>✕</button>
            </div>
            {availableSituations.length ? (
              availableSituations.map((situation) => (
                <div key={situation.id} className="mt-3 rounded-xl border p-3">
                  <strong>{situation.name}</strong>
                  <p className="mt-1 text-xs">{situation.organization}</p>
                  <p className="mt-1 text-xs text-slate-500">{situation.equipment.join('، ')}</p>
                  <button
                    onClick={() => addSituation(situation)}
                    className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
                  >
                    اختيار
                  </button>
                </div>
              ))
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                لا يوجد موقف بنكي مطابق؛ تبقى المذكرة على مسودة fallback المحلية.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
