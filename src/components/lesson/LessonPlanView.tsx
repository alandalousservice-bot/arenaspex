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
import { getAcademicYearOptions, getCurrentAcademicYear } from '../../services/academicYear';
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
  const [scheduledContext, setScheduledContext] = useState<{
    session: TeacherPlanningSession;
    reference: ReturnType<typeof canonicalReferenceSessions>[number];
    classRoom: ClassRoom;
  } | null>(null);
  const [scheduledError, setScheduledError] = useState('');
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedClassId = query.get('classId') || '';
  const requestedSessionId = query.get('classPlannedSessionId') || '';
  const scheduledMode = Boolean(requestedSessionId);
  const sessions = useMemo(() => sessionsForLevel(levelName), [levelName]);
  const generatorSessions = useMemo<SourceSession[]>(
    () =>
      scheduledContext
        ? [
            {
              fieldId: scheduledContext.reference.domainId,
              fieldName:
                PE_FIELDS.find((field) => field.id === scheduledContext.reference.domainId)?.name ||
                scheduledContext.reference.domainId,
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
            fieldName: scheduled.fieldName,
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
    [scheduledContext, scheduledLessons]
  );
  const selected = scheduledMode
    ? lessonPlans.find((plan) => plan.classPlannedSessionId === scheduledContext?.session.id)
    : lessonPlans.find((plan) => plan.id === selectedId) || lessonPlans[0];

  useEffect(() => {
    setSessionIndex(0);
  }, [levelName]);
  useEffect(() => {
    if (activeLessonId) setSelectedId(activeLessonId);
  }, [activeLessonId]);
  useEffect(() => {
    if (!requestedSessionId) return;
    const classRoom = teacherClasses.find((item) => item.id === requestedClassId);
    if (!classRoom) {
      setScheduledError('تعذر التحقق من القسم المرتبط بالحصة التشغيلية.');
      return;
    }
    let cancelled = false;
    setScheduledLoading(true);
    setScheduledError('');
    const requestedYear =
      query.get('academicYearId') || localStorage.getItem('arenaspex:selectedAcademicYear') || '';
    const years = requestedYear ? [requestedYear] : getAcademicYearOptions();
    Promise.all(years.map((year) => fetchTeacherPlanningSessions(classRoom.id, year)))
      .then((results) => {
        if (cancelled) return;
        const located = results
          .flatMap((result) => result.sessions)
          .find((item) => item.id === requestedSessionId);
        const reference = located
          ? canonicalReferenceSessions(classRoom.levelId).find(
              (item) => item.referenceSessionId === located.referenceSessionId
            )
          : undefined;
        if (!located || !reference || located.classId !== classRoom.id) {
          setScheduledError(
            !located
              ? 'الحصة التشغيلية المطلوبة غير موجودة ضمن أقسامك.'
              : 'تعذر تحميل المرجع البيداغوجي لهذه الحصة.'
          );
          return;
        }
        Promise.all([
          fetchAnnualPlans({
            teacherId: currentUser?.id,
            kind: 'section_wording',
            academicYearId: located.academicYearId,
            levelId: classRoom.levelId,
          }),
          fetchAnnualPlans({
            teacherId: currentUser?.id,
            kind: 'schedule_dates',
            academicYearId: located.academicYearId,
            levelId: classRoom.levelId,
          }),
        ])
          .then(([wordingResponse, scheduleResponse]) => {
            if (cancelled) return;
            const key = reference.domainId + '__' + reference.fieldSessionNumber;
            const wording = wordingResponse.annualPlans?.[0]?.data?.overrides?.[key]?.objective;
            const scheduleWording =
              scheduleResponse.annualPlans?.[0]?.data?.overrides?.[key]?.objective;
            setScheduledContext({
              session: located,
              reference: {
                ...reference,
                objective: wording || scheduleWording || reference.objective,
              },
              classRoom,
            });
          })
          .catch(() => setScheduledContext({ session: located, reference, classRoom }));
        const matchingLevel = Object.entries(LEVEL_KEYS).find(
          ([, id]) => id === classRoom.levelId
        )?.[0];
        if (matchingLevel) setLevelName(matchingLevel);
      })
      .catch(() => {
        if (!cancelled) setScheduledError('تعذر تحميل الحصة التشغيلية المطلوبة.');
      })
      .finally(() => {
        if (!cancelled) setScheduledLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, requestedClassId, requestedSessionId, teacherClasses, query]);

  useEffect(() => {
    if (!showBank) return;
    fetch('/api/educational-situations')
      .then((response) => (response.ok ? response.json() : { situations: [] }))
      .then((body) => setBankSituations(body.situations || []))
      .catch(() => setBankSituations([]));
  }, [showBank]);

  useEffect(() => {
    if (!showGenerator || !currentUser?.id || scheduledContext) return;
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
  }, [showGenerator, levelName, currentUser?.id, scheduledContext]);

  const createPlan = () => {
    const source = (generatorSessions.length ? generatorSessions : sessions)[sessionIndex];
    if (!source) {
      setGenerationError('تعذر العثور على حصة صالحة من التوزيع السنوي. حاول إعادة فتح الحصة.');
      return;
    }
    try {
      const plan = autoGenerateLessonPlan(source, {
        levelName: scheduledContext?.classRoom.levelName || levelName,
        teacher: currentUser,
        className: scheduledContext?.classRoom.name || '',
        classPlannedSessionId: scheduledContext?.session.id,
        academicYearId: scheduledContext?.session.academicYearId,
        classId: scheduledContext?.session.classId,
        plannedStartTime: scheduledContext?.session.startTime,
        venue: scheduledContext?.session.venue,
        inspectorName,
        date: scheduledContext?.session.plannedDate.slice(0, 10),
        durationMinutes: scheduledContext?.session.durationMinutes,
      });
      if (!plan.lessonRows?.length) throw new Error('empty memo');
      onSaveLessonPlan(plan);
      setSelectedId(plan.id);
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

  const generatorModal = showGenerator ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-extrabold">توليد مذكرة من التوزيع السنوي</h3>
          <button onClick={() => setShowGenerator(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
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
        <label className="mb-1 block text-sm font-bold">الحصة</label>
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
          المصدر:{' '}
          {sourceLabel === 'actual'
            ? 'التوزيع السنوي الفعلي للحصص'
            : 'احتياطي المنهاج الثابت (لا يوجد سجل توزيع فعلي)'}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          يؤخذ الهدف والكفاءة والميدان والوسائل من الحصة الحالية؛ يمكن تعديل المذكرة بعد توليدها.
        </p>
        {generationError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700"
          >
            {generationError}
          </p>
        )}
        <button
          onClick={createPlan}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
        >
          إنشاء المذكرة
        </button>
      </div>
    </div>
  ) : null;

  const plan = editing ? draft : selected;
  if (!plan) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        {scheduledLoading && (
          <p className="font-bold text-slate-600">جارٍ تحميل الحصة التشغيلية...</p>
        )}
        {scheduledError && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {scheduledError}
          </p>
        )}
        {scheduledContext && (
          <p className="font-bold text-slate-700">
            حصة مبرمجة · {scheduledContext.classRoom.name} ·{' '}
            {scheduledContext.session.plannedDate.slice(0, 10)} ·{' '}
            {scheduledContext.session.durationMinutes} دقيقة
          </p>
        )}
        {!scheduledError && !scheduledLoading && (
          <p className="font-bold text-slate-600">
            {scheduledContext ? 'لا توجد مذكرة محفوظة لهذه الحصة بعد.' : 'لا توجد مذكرات بعد.'}
          </p>
        )}
        {!scheduledError && (
          <button
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            onClick={() => {
              setGenerationError('');
              setShowGenerator(true);
            }}
          >
            إنشاء المذكرة
          </button>
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <FileText className="h-5 w-5 text-blue-600" />
            مذكرة الحصة
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            قالب موحد مستمد من الحصة المحددة في التوزيع السنوي.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setGenerationError('');
              setShowGenerator(true);
            }}
            className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            توليد مذكرة
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
                    '/assessment-notebook?classId=' +
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

      {!editing && lessonPlans.length > 1 && (
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
            ['الميدان', memoModel.header.field],
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
                `/daily-notebook?classId=${encodeURIComponent(scheduledContext.classRoom.id)}&classPlannedSessionId=${encodeURIComponent(scheduledContext.session.id)}`
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
