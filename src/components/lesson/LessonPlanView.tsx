import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, PenSquare, Printer, Save, Target, Trash2, X } from 'lucide-react';
import { ClassRoom, EducationalSituation, LessonPlan, LessonPlanRow, User } from '../../types/spex';
import {
  COMPLETE_ANNUAL_CURRICULUM,
  PE_FIELDS,
  generateAnnualTimeDistribution,
} from '../../data/algerianCurriculum';
import {
  autoGenerateLessonPlan,
  createIndependentLessonPlan,
  formatSituationExecution,
  generateLessonMemoDocument,
  getUnifiedLessonRows,
  rebalanceLessonRows,
  validateLessonPlanTiming,
} from '../../services/lessonPlan.generator.service';
import {
  generateLessonMemoDraft,
  regenerateLessonMemo,
  saveLessonMemo,
} from '../../services/lessonMemoGeneration.service';
import type { LessonMemoGenerationContext } from '../../services/lessonMemoGeneration.service';
import {
  fetchAnnualPlans,
  fetchTeacherAnnualMemoSources,
  fetchTeacherPlanningSessions,
  initializeTeacherPlanningSessions,
  requestPedagogicalSituationGeneration,
  TeacherAnnualMemoSource,
  TeacherPlanningSession,
} from '../../services/api';
import { getAcademicCalendar } from '../../data/academicCalendars';
import { mergeSchedule, MergedScheduledLesson } from '../../services/schedule/scheduleMerge';
import {
  formatAcademicYearLabel,
  formatAcademicYearSelectLabel,
  getCurrentAcademicYear,
  getOperationalAcademicYearOptions,
  isOperationalAcademicYear,
} from '../../services/academicYear';
import {
  findOperationalLessonPlan,
  isLessonMemoEligible,
  isOwnedOperationalSession,
  LessonMemoMode,
  sortOperationalSessions,
} from '../../services/lessonPlanWorkflow.service';
import {
  annualDistributionLessonMemoIdFor,
  isAnnualDistributionLessonMemo,
} from '../../services/lessonMemoIdentity.service';
import {
  exportLessonPlanToPdf,
  exportLessonPlanToWord,
} from '../../services/lessonPlanExport.service';
import type { GeneratedPedagogicalSituationCandidate } from '../../services/pedagogicalGeneration.service';
import {
  findSuitableSituations,
  hasOrdinaryLearningRelation,
  isAutoGenerationEligible,
  referenceSituations,
  selectEducationalSituations,
  snapshotSituation,
} from '../../services/educationalSituation.selector.service';
import { detailText } from '../educationalSituations/EducationalSituationsBankView';
import { resolveAssessmentScope } from '../../domain/pedagogicalKnowledge/assessmentScopeAdapter';

interface LessonPlanViewProps {
  lessonPlans: LessonPlan[];
  activeLessonId?: string;
  onSaveLessonPlan: (lesson: LessonPlan) => Promise<void>;
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

function annualDistributionPath(academicYearId: string, levelId?: string): string {
  const params = new URLSearchParams({
    section: 'annual-distribution',
    academicYearId,
  });
  if (levelId) params.set('levelId', levelId);
  return `/planning?${params.toString()}`;
}

function formatLessonDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day} / ${month} / ${year}` : value;
}

function formatSessionSequence(session: TeacherPlanningSession): string {
  return String(session.reference?.sequenceIndex || '—');
}

function sessionStateLabel(
  session: TeacherPlanningSession,
  memo?: LessonPlan,
  memoEligible = true
): string {
  if (!memoEligible) return 'لا تتطلب مذكرة';
  if (memo) return 'مذكرة محفوظة';
  if (session.status === 'منجزة') return 'حصة منجزة — المذكرة غير منشأة';
  if (session.status === 'مؤجلة') return 'حصة مؤجلة — المذكرة غير منشأة';
  return 'مذكرة غير منشأة';
}

function displayFieldName(domainId?: string, fieldName?: string): string {
  if (!fieldName || domainId === 'intro' || fieldName.trim().toLowerCase() === 'intro') return '';
  return fieldName;
}

function canonicalLessonTypeForPlan(
  sessionType: LessonPlan['sessionType']
): 'LEARNING' | 'DIAGNOSTIC' | 'INTEGRATIVE' | 'SUMMATIVE' {
  if (sessionType === 'تشخيصية' || sessionType === 'تقويم تشخيصي') return 'DIAGNOSTIC';
  if (sessionType === 'إدماجية') return 'INTEGRATIVE';
  if (sessionType === 'تقويمية' || sessionType === 'تقويم تحصيلي') return 'SUMMATIVE';
  return 'LEARNING';
}

function relationLabel(value: string): string {
  if (value === 'DIRECT') return 'مباشر';
  if (value === 'SUPPORTIVE') return 'داعم';
  if (value === 'INTEGRATIVE') return 'إدماجي';
  if (value === 'ASSESSMENT') return 'تقويمي';
  return value;
}

type SourceSession = Parameters<typeof autoGenerateLessonPlan>[0];

function sourceFromPlanningReference(
  reference: NonNullable<TeacherPlanningSession['reference']>,
  classRoom?: ClassRoom
): SourceSession {
  const levelId = classRoom?.levelId || `lvl_p${reference.grade}`;
  const field = COMPLETE_ANNUAL_CURRICULUM[levelId]?.fields[reference.domainId];
  return {
    fieldId: reference.domainId,
    fieldName: displayFieldName(reference.domainId, field?.fieldName || reference.fieldName),
    finalCompetency: reference.finalCompetency || field?.finalCompetency || '',
    segmentGoal: reference.objective,
    sessionNumber: reference.fieldSessionNumber,
    globalNumber: reference.sequenceIndex,
    weekNumber: Math.ceil(reference.sequenceIndex / 2),
    type: reference.sessionType as LessonPlan['sessionType'],
    typeLabel: reference.sessionTypeLabel,
    objective: reference.objective,
    objectiveId: reference.objectiveId,
    objectiveGroupId: reference.objectiveGroupId,
    relatedObjectiveIds: reference.relatedObjectiveIds,
    referenceSessionId: reference.referenceSessionId,
    tools: field?.suggestedTools || [],
  };
}

function assessmentScopeForSource(source: SourceSession, gradeId: string) {
  const lessonType = canonicalLessonTypeForPlan(source.type);
  if (lessonType !== 'DIAGNOSTIC' && lessonType !== 'SUMMATIVE') return undefined;
  return resolveAssessmentScope({
    gradeId,
    domainId: source.fieldId,
    finalCompetencyId: `fc_${gradeId}_${source.fieldId}`,
    kind: lessonType === 'DIAGNOSTIC' ? 'diagnostic' : 'summative',
  });
}

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
      referenceSessionId: `${LEVEL_KEYS[levelName]}:${field.fieldId}:sequence:${globalNumber}`,
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
  const [generatedSituation, setGeneratedSituation] =
    useState<GeneratedPedagogicalSituationCandidate | null>(null);
  const [generatedSituationError, setGeneratedSituationError] = useState('');
  const [generatedSituationSaving, setGeneratedSituationSaving] = useState(false);
  const [scheduledLessons, setScheduledLessons] = useState<MergedScheduledLesson[]>([]);
  const [generationError, setGenerationError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [memoSaveStatus, setMemoSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>(
    'IDLE'
  );
  const [showRegenerationConfirm, setShowRegenerationConfirm] = useState(false);
  const [draft, setDraft] = useState<LessonPlan | null>(null);
  const [memoMode, setMemoMode] = useState<LessonMemoMode>('operational');
  const [screenMode, setScreenMode] = useState<'list' | 'generator' | 'saved'>(
    activeLessonId && !requestedSessionId ? 'saved' : 'list'
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
  const [annualLevelId, setAnnualLevelId] = useState(() => {
    const requestedLevelId = query.get('levelId') || '';
    if (Object.values(LEVEL_KEYS).includes(requestedLevelId)) return requestedLevelId;
    return (
      teacherClasses.find((item) => Object.values(LEVEL_KEYS).includes(item.levelId))?.levelId ||
      'lvl_p1'
    );
  });
  const [operationalSessionId, setOperationalSessionId] = useState(requestedSessionId);
  const [operationalSessions, setOperationalSessions] = useState<TeacherPlanningSession[]>([]);
  const [scheduledError, setScheduledError] = useState('');
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [initializingOperationalSessions, setInitializingOperationalSessions] = useState(false);
  const [annualMemoSources, setAnnualMemoSources] = useState<TeacherAnnualMemoSource[]>([]);
  const [annualMemoSourceId, setAnnualMemoSourceId] = useState('');
  const [annualGrade4WeeklyScheduleMode, setAnnualGrade4WeeklyScheduleMode] = useState<
    'TWO_45' | 'ONE_90' | undefined
  >();
  const [annualMemoLoading, setAnnualMemoLoading] = useState(false);
  const [annualMemoError, setAnnualMemoError] = useState('');
  const [independentFieldId, setIndependentFieldId] = useState(PE_FIELDS[0]?.id || '');
  const [independentSessionType, setIndependentSessionType] =
    useState<LessonPlan['sessionType']>('تعلمية');
  const [independentObjective, setIndependentObjective] = useState('');
  const [independentLearningContent, setIndependentLearningContent] = useState('');
  const [independentExecutionContent, setIndependentExecutionContent] = useState('');
  const [independentSuccessCriteria, setIndependentSuccessCriteria] = useState('');
  const [independentObservationIndicators, setIndependentObservationIndicators] = useState('');
  const [independentEquipment, setIndependentEquipment] = useState('');
  const [independentDuration, setIndependentDuration] = useState(60);
  const [independentTeacherNotes, setIndependentTeacherNotes] = useState('');
  const [wordExporting, setWordExporting] = useState(false);
  const [wordExportError, setWordExportError] = useState('');
  const wordExportInFlight = useRef(false);
  const scheduledMode = memoMode === 'operational' && Boolean(operationalClassId);
  const operationalClass = teacherClasses.find((item) => item.id === operationalClassId);
  const operationalSession = operationalSessions.find((item) => item.id === operationalSessionId);
  const scheduledContext = useMemo(() => {
    if (!operationalClass || !operationalSession) return null;
    const reference = operationalSession.reference;
    if (!reference) return null;
    return {
      session: operationalSession,
      reference,
      classRoom: operationalClass,
    };
  }, [operationalClass, operationalSession]);
  const operationalMemoEligible = scheduledContext
    ? isLessonMemoEligible(scheduledContext.session)
    : true;
  const existingOperationalMemo =
    scheduledContext && operationalMemoEligible
      ? findOperationalLessonPlan(lessonPlans, scheduledContext.session, currentUser?.id || '')
      : undefined;
  const annualMemoSource = annualMemoSources.find(
    (item) => item.referenceSessionId === annualMemoSourceId
  );
  const existingAnnualMemo =
    annualMemoSource && currentUser
      ? lessonPlans.find(
          (item) =>
            item.teacherId === currentUser.id &&
            item.academicYearId === operationalAcademicYearId &&
            item.referenceSessionId === annualMemoSource.referenceSessionId &&
            !item.classId &&
            isAnnualDistributionLessonMemo(item)
        )
      : undefined;
  const activeLessonPlan = lessonPlans.find((plan) => plan.id === activeLessonPlanId);
  const activeLessonPlanForContext =
    scheduledMode && operationalSession && operationalMemoEligible
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
        ? [sourceFromPlanningReference(scheduledContext.reference, operationalClass)]
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
  const annualActiveLessonPlan =
    memoMode === 'annual' && screenMode === 'saved' && annualMemoSource && currentUser
      ? lessonPlans.find(
          (item) =>
            item.id === activeLessonPlanId &&
            item.teacherId === currentUser.id &&
            item.academicYearId === operationalAcademicYearId &&
            item.referenceSessionId === annualMemoSource.referenceSessionId &&
            !item.classId &&
            isAnnualDistributionLessonMemo(item)
        )
      : undefined;
  const selected = scheduledMode
    ? screenMode === 'saved'
      ? activeLessonPlanForContext || existingOperationalMemo
      : undefined
    : memoMode === 'annual'
      ? screenMode === 'saved'
        ? annualActiveLessonPlan || existingAnnualMemo
        : undefined
      : activeLessonPlanForContext ||
        lessonPlans.find((plan) => plan.id === selectedId) ||
        lessonPlans[0];

  useEffect(() => {
    setSessionIndex(0);
  }, [levelName]);
  useEffect(() => {
    if (activeLessonId && !requestedSessionId) {
      setSelectedId(activeLessonId);
      setActiveLessonPlanId(activeLessonId);
      setScreenMode('saved');
    }
  }, [activeLessonId, requestedSessionId]);
  useEffect(() => {
    if (!operationalClassId && teacherClasses[0]) setOperationalClassId(teacherClasses[0].id);
  }, [operationalClassId, teacherClasses]);

  useEffect(() => {
    if (memoMode !== 'annual') return;
    const matchingLevel = Object.entries(LEVEL_KEYS).find(([, id]) => id === annualLevelId)?.[0];
    if (matchingLevel) setLevelName(matchingLevel);
  }, [annualLevelId, memoMode]);

  useEffect(() => {
    if (deepLinkDismissed || !requestedSessionId || !operationalSession) return;
    if (!isLessonMemoEligible(operationalSession)) {
      setActiveLessonPlanId('');
      setScreenMode('list');
      setShowGenerator(false);
      setDeepLinkDismissed(true);
      return;
    }
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
        if (resolvedRequested && !isLessonMemoEligible(resolvedRequested)) {
          setOperationalSessionId(resolvedRequested.id);
          setActiveLessonPlanId('');
          setScreenMode('list');
          setShowGenerator(false);
          setDeepLinkDismissed(true);
          return;
        }
        setOperationalSessionId(nextId);
        const located = nextSessions.find((item) => item.id === nextId);
        const matchingLevel = Object.entries(LEVEL_KEYS).find(
          ([, id]) => id === operationalClass?.levelId
        )?.[0];
        if (matchingLevel) setLevelName(matchingLevel);
        if (located && !located.reference) {
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
    const shouldLoad =
      showGenerator &&
      memoMode === 'annual' &&
      Boolean(annualLevelId) &&
      Boolean(operationalAcademicYearId);
    if (!shouldLoad) return;
    let cancelled = false;
    setAnnualMemoLoading(true);
    setAnnualMemoError('');
    fetchTeacherAnnualMemoSources(annualLevelId, operationalAcademicYearId)
      .then((result) => {
        if (cancelled) return;
        setAnnualMemoSources(result.sources);
        setAnnualGrade4WeeklyScheduleMode(result.grade4WeeklyScheduleMode);
        setAnnualMemoSourceId((current) =>
          result.sources.some((item) => item.referenceSessionId === current)
            ? current
            : result.sources[0]?.referenceSessionId || ''
        );
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setAnnualMemoSources([]);
        setAnnualMemoSourceId('');
        setAnnualGrade4WeeklyScheduleMode(undefined);
        setAnnualMemoError(
          reason instanceof Error ? reason.message : 'تعذر تحميل التوزيع السنوي لهذا القسم.'
        );
      })
      .finally(() => {
        if (!cancelled) setAnnualMemoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [annualLevelId, memoMode, operationalAcademicYearId, showGenerator]);

  useEffect(() => {
    if (!showBank) return;
    fetch('/api/educational-situations')
      .then((response) => (response.ok ? response.json() : { situations: [] }))
      .then((body) => setBankSituations(body.situations || []))
      .catch(() => setBankSituations([]));
  }, [showBank]);

  useEffect(() => {
    if (!showGenerator || !currentUser?.id || memoMode !== 'annual') return;
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
          return;
        }
        setScheduledLessons(
          mergeSchedule(base, schedule.data?.overrides || {}, wording?.data?.overrides || {})
        );
      })
      .catch(() => {
        setScheduledLessons([]);
      });
  }, [showGenerator, levelName, currentUser?.id, memoMode, scheduledContext]);

  const operationalGenerationContext = (): LessonMemoGenerationContext | null => {
    if (!scheduledContext || !currentUser) return null;
    const source = sourceFromPlanningReference(
      scheduledContext.reference,
      scheduledContext.classRoom
    );
    const previousSituationIds = lessonPlans
      .filter(
        (item) =>
          item.teacherId === currentUser.id &&
          item.classId === scheduledContext.session.classId &&
          item.academicYearId === scheduledContext.session.academicYearId &&
          (item.sessionGlobalNumber || 0) < source.globalNumber
      )
      .flatMap((item) =>
        (item.lessonRows || []).flatMap((row) =>
          row.situationSnapshot?.situationId ? [row.situationSnapshot.situationId] : []
        )
      );
    return {
      levelName: scheduledContext.classRoom.levelName || levelName,
      teacher: currentUser,
      className: scheduledContext.classRoom.name,
      classPlannedSessionId: scheduledContext.session.id,
      academicYearId: scheduledContext.session.academicYearId,
      classId: scheduledContext.session.classId,
      plannedStartTime: scheduledContext.session.startTime,
      venue: scheduledContext.session.venue,
      inspectorName,
      plannedDate: scheduledContext.session.plannedDate.slice(0, 10),
      durationMinutes: scheduledContext.session.durationMinutes,
      grade4WeeklyScheduleMode: scheduledContext.session.grade4WeeklyScheduleMode,
      source,
      situations: bankSituations.length ? bankSituations : undefined,
      assessmentScope: assessmentScopeForSource(
        source,
        scheduledContext.classRoom.levelId || LEVEL_KEYS[levelName]
      ),
      previousSituationIds,
      pedagogicalParts: scheduledContext.session.pedagogicalPartReferences?.map((reference) =>
        sourceFromPlanningReference(reference, scheduledContext.classRoom)
      ),
    };
  };

  const annualGenerationContext = (): LessonMemoGenerationContext | null => {
    if (!annualMemoSource || !currentUser) return null;
    const source = sourceFromPlanningReference(annualMemoSource.reference);
    const previousSituationIds = lessonPlans
      .filter(
        (item) =>
          item.teacherId === currentUser.id &&
          item.academicYearId === operationalAcademicYearId &&
          !item.classId &&
          (item.sessionGlobalNumber || 0) < source.globalNumber
      )
      .flatMap((item) =>
        (item.lessonRows || []).flatMap((row) =>
          row.situationSnapshot?.situationId ? [row.situationSnapshot.situationId] : []
        )
      );
    return {
      levelName,
      teacher: currentUser,
      className: '',
      academicYearId: operationalAcademicYearId,
      inspectorName,
      plannedDate: annualMemoSource.plannedDate.slice(0, 10),
      durationMinutes: annualMemoSource.durationMinutes,
      grade4WeeklyScheduleMode: annualGrade4WeeklyScheduleMode,
      source,
      situations: bankSituations.length ? bankSituations : undefined,
      assessmentScope: assessmentScopeForSource(source, annualLevelId),
      previousSituationIds,
      pedagogicalParts: annualMemoSource.pedagogicalPartReferences?.map((reference) =>
        sourceFromPlanningReference(reference)
      ),
    };
  };

  const persistLessonPlan = async (nextPlan: LessonPlan): Promise<boolean> => {
    setMemoSaveStatus('SAVING');
    setSaveError('');
    try {
      await onSaveLessonPlan(nextPlan);
      setMemoSaveStatus('SAVED');
      return true;
    } catch {
      setMemoSaveStatus('ERROR');
      setSaveError('تعذر حفظ المذكرة. لم تضِع التعديلات، ويمكنك إعادة المحاولة.');
      return false;
    }
  };

  const createPlan = async () => {
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
      if (!isLessonMemoEligible(scheduledContext.session)) {
        setGenerationError('هذه الحصة التنظيمية لا تتطلب مذكرة.');
        setShowGenerator(false);
        setScreenMode('list');
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
    if (memoMode === 'annual') {
      if (!annualMemoSource) {
        setGenerationError('اختر حصة صالحة من التوزيع السنوي لهذا المستوى أولاً.');
        return;
      }
      if (existingAnnualMemo) {
        setSelectedId(existingAnnualMemo.id);
        setActiveLessonPlanId(existingAnnualMemo.id);
        setScreenMode('saved');
        setShowGenerator(false);
        setGenerationError('');
        return;
      }
    }
    const operationalContext = memoMode === 'operational' ? scheduledContext : null;
    const source =
      memoMode === 'annual' && annualMemoSource
        ? sourceFromPlanningReference(annualMemoSource.reference)
        : memoMode === 'standalone'
          ? undefined
          : (generatorSessions.length ? generatorSessions : sessions)[sessionIndex];
    if (!source && memoMode !== 'standalone') {
      setGenerationError(
        memoMode === 'operational'
          ? 'لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.'
          : 'تعذر العثور على حصة صالحة من المنهاج.'
      );
      return;
    }
    try {
      const operationalContextForGeneration = operationalContext
        ? operationalGenerationContext()
        : null;
      const annualContextForGeneration = memoMode === 'annual' ? annualGenerationContext() : null;
      const generatedPlan =
        memoMode === 'standalone'
          ? createIndependentLessonPlan({
              teacher: currentUser,
              inspectorName,
              levelName,
              fieldId: independentFieldId,
              fieldName:
                PE_FIELDS.find((field) => field.id === independentFieldId)?.name ||
                independentFieldId,
              sessionType: independentSessionType,
              objective: independentObjective,
              learningContent: independentLearningContent,
              executionContent: independentExecutionContent,
              successCriteria: independentSuccessCriteria,
              observationIndicators: independentObservationIndicators,
              equipment: independentEquipment.split(/[,،]/),
              durationMinutes: independentDuration,
              teacherNotes: independentTeacherNotes,
            })
          : operationalContextForGeneration
            ? generateLessonMemoDraft(operationalContextForGeneration)
            : annualContextForGeneration
              ? generateLessonMemoDraft(annualContextForGeneration)
              : autoGenerateLessonPlan(source, {
                  levelName,
                  teacher: currentUser,
                  assessmentScope: assessmentScopeForSource(source, LEVEL_KEYS[levelName]),
                });
      const plan =
        memoMode === 'annual' && annualMemoSource
          ? {
              ...generatedPlan,
              id: annualDistributionLessonMemoIdFor({
                teacherId: currentUser?.id || '',
                academicYearId: operationalAcademicYearId,
                referenceSessionId: annualMemoSource.referenceSessionId,
              }),
              levelId: annualLevelId,
              memoSource: 'annual-distribution' as const,
            }
          : generatedPlan;
      if (!plan.lessonRows?.length) throw new Error('empty memo');
      if (!(await persistLessonPlan(saveLessonMemo(plan, existingOperationalMemo)))) return;
      setSelectedId(plan.id);
      setActiveLessonPlanId(plan.id);
      setScreenMode('saved');
      setGenerationError('');
      setSaveError('');
      setShowGenerator(false);
    } catch {
      setGenerationError('تعذر توليد المذكرة. حاول إعادة فتح الحصة.');
    }
  };

  const beginEdit = () => {
    if (!selected) return;
    setMemoSaveStatus('IDLE');
    setSaveError('');
    setDraft({
      ...selected,
      lessonRows: getUnifiedLessonRows(selected).map((row) => ({ ...row })),
      equipmentNeeded: [...selected.equipmentNeeded],
    });
    setEditing(true);
  };
  const saveEdit = async () => {
    if (!draft) return;
    const expectedDuration =
      draft.classPlannedSessionId && scheduledContext
        ? scheduledContext.session.durationMinutes
        : draft.durationMinutes;
    const lessonRows = draft.lessonRows || [];
    const timing = validateLessonPlanTiming(lessonRows, expectedDuration);
    if (!timing.valid) {
      setSaveError(
        `لا يمكن حفظ المذكرة: مجموع أزمنة الصفوف ${timing.actualMinutes} دقيقة، والمطلوب ${timing.expectedMinutes} دقيقة.`
      );
      return;
    }
    const equipmentNeeded = [
      ...new Set(draft.equipmentNeeded.map((item) => item.trim()).filter(Boolean)),
    ];
    const savedPlan = saveLessonMemo({
      ...draft,
      lessonRows,
      equipmentNeeded,
      equipmentChecklist: equipmentNeeded.map((name) => ({ name, available: true })),
      version: Math.max(draft.version || 1, 2),
      manualEdits: true,
    });
    if (!(await persistLessonPlan(savedPlan))) return;
    setSaveError('');
    setEditing(false);
    setDraft(null);
  };

  const regenerateSelectedMemo = async (confirmed = false) => {
    if (!selected || (!isScheduled && selected.memoSource !== 'annual-distribution')) return;
    if (editing) {
      setSaveError('احفظ التعديلات الحالية أو ألغِها قبل إعادة التوليد.');
      return;
    }
    const context = isScheduled ? operationalGenerationContext() : annualGenerationContext();
    if (!context) {
      setGenerationError('تعذر تحديد المرجع البيداغوجي لإعادة التوليد.');
      return;
    }
    if (!confirmed && selected.manualEdits) {
      setShowRegenerationConfirm(true);
      return;
    }
    try {
      const regenerated = regenerateLessonMemo(context, selected, confirmed);
      if (!(await persistLessonPlan(saveLessonMemo(regenerated, selected)))) return;
      setSelectedId(regenerated.id);
      setActiveLessonPlanId(regenerated.id);
      setShowRegenerationConfirm(false);
      setGenerationError('');
      setSaveError('');
      setScreenMode('saved');
    } catch {
      setGenerationError('تعذر إعادة توليد المذكرة. لم يتم تغيير النسخة المحفوظة.');
    }
  };

  const closeSavedMemo = () => {
    setEditing(false);
    setDraft(null);
    setActiveLessonPlanId('');
    setDeepLinkDismissed(true);
    setScreenMode('list');
  };

  const handleWordExport = async (plan: LessonPlan) => {
    if (wordExportInFlight.current) return;
    wordExportInFlight.current = true;
    setWordExporting(true);
    setWordExportError('');
    try {
      await exportLessonPlanToWord(plan);
    } catch {
      setWordExportError('تعذر تصدير المذكرة بصيغة Word. حاول مرة أخرى.');
    } finally {
      wordExportInFlight.current = false;
      setWordExporting(false);
    }
  };

  const generatorModal = showGenerator ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-extrabold">
            {memoMode === 'operational'
              ? 'توليد مذكرة حصة مبرمجة'
              : memoMode === 'annual'
                ? 'مذكرة من التوزيع السنوي'
                : 'مذكرة مستقلة'}
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
            disabled={!teacherClasses.length}
            onClick={() => {
              setMemoMode('operational');
              setGenerationError('');
            }}
            className={`rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${memoMode === 'operational' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
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
            إنشاء مذكرة مستقلة
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
                  لم يتم إنشاء الحصص التشغيلية لهذا القسم بعد.
                </p>
                {scheduledError && (
                  <p className="mt-2 text-xs font-semibold text-rose-700">{scheduledError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void initializeSelectedClassSessions()}
                  disabled={initializingOperationalSessions}
                  className="action-primary mt-3 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {initializingOperationalSessions ? 'جارٍ إنشاء حصص القسم...' : 'إنشاء حصص القسم'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.location.assign(
                      annualDistributionPath(operationalAcademicYearId, operationalClass?.levelId)
                    )
                  }
                  className="mt-2 rounded-xl border border-emerald-700 px-4 py-2 text-xs font-bold text-emerald-800"
                >
                  إنشاء / فتح التوزيع السنوي
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              تُبنى المذكرة على الحصة المحددة وقسمها وسنتها وتاريخها الفعلي.
            </p>
          </>
        ) : memoMode === 'annual' ? (
          <>
            <label className="mb-1 block text-sm font-bold">المستوى الدراسي</label>
            <select
              value={annualLevelId}
              onChange={(event) => {
                setAnnualLevelId(event.target.value);
                setAnnualMemoSourceId('');
                setAnnualMemoSources([]);
                closeSavedMemo();
              }}
              className="mb-3 w-full rounded-xl border p-2"
            >
              {Object.entries(LEVEL_KEYS).map(([label, id]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-sm font-bold">السنة الدراسية</label>
            <select
              dir="ltr"
              value={operationalAcademicYearId}
              onChange={(event) => {
                setOperationalAcademicYearId(event.target.value);
                setAnnualMemoSourceId('');
                setAnnualMemoSources([]);
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
            {annualMemoLoading ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                جارٍ تحميل حصص التوزيع السنوي...
              </p>
            ) : annualMemoSources.length ? (
              <>
                <label className="mb-1 block text-sm font-bold">الحصة من التوزيع السنوي</label>
                <select
                  value={annualMemoSourceId}
                  onChange={(event) => {
                    setAnnualMemoSourceId(event.target.value);
                    setGenerationError('');
                  }}
                  className="w-full rounded-xl border p-2 text-sm"
                >
                  {annualMemoSources.map((source) => (
                    <option key={source.referenceSessionId} value={source.referenceSessionId}>
                      {formatLessonDate(source.plannedDate)} · {source.reference.sessionTypeLabel} ·{' '}
                      {source.reference.objective}
                    </option>
                  ))}
                </select>
                {annualMemoSource && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-slate-700">
                    <span>
                      <strong>التاريخ:</strong>{' '}
                      <bdi dir="ltr">{formatLessonDate(annualMemoSource.plannedDate)}</bdi>
                    </span>
                    <span>
                      <strong>المدة:</strong> {annualMemoSource.durationMinutes} دقيقة
                    </span>
                    <span className="col-span-2">
                      <strong>هدف المقطع:</strong> {annualMemoSource.reference.objective}
                    </span>
                    <span className="col-span-2">
                      <strong>الميدان:</strong> {annualMemoSource.reference.fieldName}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-sm font-bold text-slate-700">
                  {annualMemoError || 'لم يتم إنشاء التوزيع السنوي لهذا المستوى بعد.'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    window.location.assign(
                      annualDistributionPath(operationalAcademicYearId, annualLevelId)
                    )
                  }
                  className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
                >
                  فتح التوزيع السنوي
                </button>
              </div>
            )}
            <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
              محتوى المذكرة وأهدافها من التوزيع السنوي؛ أما التوقيت والتنفيذ اليومي فيديرهما الكراس
              اليومي.
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
            <label className="mb-1 block text-sm font-bold">الميدان</label>
            <select
              value={independentFieldId}
              onChange={(event) => setIndependentFieldId(event.target.value)}
              className="mb-3 w-full rounded-xl border p-2"
            >
              {PE_FIELDS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-sm font-bold">نوع الحصة</label>
            <select
              value={independentSessionType}
              onChange={(event) =>
                setIndependentSessionType(event.target.value as LessonPlan['sessionType'])
              }
              className="mb-3 w-full rounded-xl border p-2"
            >
              <option value="تعلمية">حصة تعلمية</option>
              <option value="تشخيصية">تقويم تشخيصي</option>
              <option value="إدماجية">حصة إدماجية</option>
              <option value="تقويمية">تقويم تحصيلي</option>
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                الهدف
                <textarea
                  value={independentObjective}
                  onChange={(event) => setIndependentObjective(event.target.value)}
                  className="mt-1 min-h-16 w-full rounded-xl border p-2 text-sm"
                  placeholder="اكتب هدف الحصة"
                />
              </label>
              <label className="block text-sm font-bold">
                المدة بالدقائق
                <input
                  type="number"
                  min="1"
                  value={independentDuration}
                  onChange={(event) => setIndependentDuration(Number(event.target.value) || 60)}
                  className="mt-1 w-full rounded-xl border p-2 text-sm"
                />
              </label>
            </div>
            {[
              ['محتوى التعلم', independentLearningContent, setIndependentLearningContent],
              [
                'محتوى الإنجاز / تعليمات التنفيذ',
                independentExecutionContent,
                setIndependentExecutionContent,
              ],
              ['معيار النجاح', independentSuccessCriteria, setIndependentSuccessCriteria],
              [
                'مؤشرات الملاحظة',
                independentObservationIndicators,
                setIndependentObservationIndicators,
              ],
              ['الوسائل', independentEquipment, setIndependentEquipment],
              ['ملاحظات الأستاذ', independentTeacherNotes, setIndependentTeacherNotes],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="mt-3 block text-sm font-bold">
                {label as string}
                <textarea
                  value={value as string}
                  onChange={(event) =>
                    (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)
                  }
                  className="mt-1 min-h-14 w-full rounded-xl border p-2 text-sm"
                />
              </label>
            ))}
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              هذه مذكرة مستقلة يحررها الأستاذ، ولا تُضاف إلى التوزيع السنوي أو الكراس اليومي.
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
        {saveError && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700"
          >
            {saveError}
          </p>
        )}
        <button
          type="button"
          disabled={
            (memoMode === 'operational' && (!scheduledContext || scheduledLoading)) ||
            (memoMode === 'annual' && (!annualMemoSource || annualMemoLoading)) ||
            memoSaveStatus === 'SAVING'
          }
          aria-busy={memoSaveStatus === 'SAVING'}
          onClick={createPlan}
          className="action-primary mt-5 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {(memoMode === 'operational' && existingOperationalMemo) ||
          (memoMode === 'annual' && existingAnnualMemo)
            ? 'فتح المذكرة'
            : 'توليد المذكرة'}
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
    const session = operationalSessions.find((item) => item.id === sessionId);
    if (session && !isLessonMemoEligible(session)) {
      setScheduledError('هذه الحصة التنظيمية لا تتطلب مذكرة.');
      setScreenMode('list');
      setShowGenerator(false);
      return;
    }
    selectOperationalSession(sessionId);
    setMemoMode('operational');
    setGeneratorReturnMode('list');
    setScreenMode('generator');
    setShowGenerator(true);
  };
  const openOperationalMemo = (session: TeacherPlanningSession, memo?: LessonPlan) => {
    if (!isLessonMemoEligible(session)) {
      setScheduledError('هذه الحصة التنظيمية لا تتطلب مذكرة.');
      setScreenMode('list');
      setShowGenerator(false);
      setActiveLessonPlanId('');
      return;
    }
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
  const initializeSelectedClassSessions = async () => {
    if (!operationalClassId) return;
    setInitializingOperationalSessions(true);
    setScheduledError('');
    try {
      const result = await initializeTeacherPlanningSessions(
        operationalClassId,
        operationalAcademicYearId,
        getAcademicCalendar(operationalAcademicYearId).schoolStart
      );
      const nextSessions = sortOperationalSessions(result.sessions);
      setOperationalSessions(nextSessions);
      setOperationalSessionId(nextSessions[0]?.id || '');
      setGenerationError('');
    } catch (reason: unknown) {
      setScheduledError(reason instanceof Error ? reason.message : 'تعذر إنشاء حصص القسم.');
    } finally {
      setInitializingOperationalSessions(false);
    }
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
        <button
          type="button"
          onClick={() => openGenerator('standalone', 'list')}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
        >
          إنشاء مذكرة مستقلة
        </button>
      </div>
      {scheduledError && (
        <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
          {scheduledError}
        </p>
      )}
      {!operationalClassId ? (
        <div className="workspace-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-700">
            {teacherClasses.length
              ? 'اختر قسماً لعرض الحصص المبرمجة'
              : 'لا توجد أقسام مسندة إليك بعد'}
          </p>
          {!teacherClasses.length && (
            <>
              <p className="mt-2 text-sm text-slate-500">
                يمكنك إنشاء مذكرة مستقلة الآن. أما المذكرة المبرمجة فتحتاج إلى قسم وحصة مبرمجة.
              </p>
              <button
                type="button"
                onClick={() => openGenerator('standalone', 'list')}
                className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700"
              >
                إنشاء مذكرة مستقلة
              </button>
            </>
          )}
        </div>
      ) : scheduledLoading ? (
        <div className="workspace-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-600">جارٍ تحميل الحصص المبرمجة...</p>
        </div>
      ) : operationalSessions.length === 0 ? (
        <div className="workspace-empty-state rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-700">لا توجد حصص مبرمجة لهذا القسم</p>
          <p className="mt-2 text-sm text-slate-500">
            يمكنك إنشاء مذكرة مستقلة الآن، بينما تتطلب المذكرة المبرمجة توزيعاً أسبوعياً وحصة
            مبرمجة.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => openGenerator('standalone', 'list')}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700"
            >
              إنشاء مذكرة مستقلة
            </button>
            <button
              type="button"
              onClick={() =>
                window.location.assign(
                  annualDistributionPath(operationalAcademicYearId, operationalClass?.levelId)
                )
              }
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
            >
              فتح التوزيع السنوي
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {operationalSessions.map((session) => {
            const memoEligible = isLessonMemoEligible(session);
            const savedMemo = findOperationalLessonPlan(
              lessonPlans,
              session,
              currentUser?.id || ''
            );
            const memo = memoEligible ? savedMemo : undefined;
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
                      !memoEligible
                        ? 'bg-slate-100 text-slate-700'
                        : memo
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {sessionStateLabel(session, memo, memoEligible)}
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
                  {memoEligible ? (
                    <button
                      type="button"
                      onClick={() =>
                        memo
                          ? openOperationalMemo(session, memo)
                          : createOperationalMemo(session.id)
                      }
                      className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      {memo ? 'فتح المذكرة' : 'توليد مذكرة حصة مبرمجة'}
                    </button>
                  ) : (
                    <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                      حصة تنظيمية بدون مذكرة
                    </span>
                  )}
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
              onClick={closeSavedMemo}
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
  const isAnnualDistributionMemo = plan.memoSource === 'annual-distribution';
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
      objectiveIds: plan.pedagogicalPartReferences
        ?.map((part) => part.objectiveId)
        .filter((value): value is string => Boolean(value)),
      previousSituationIds: plan.lessonRows?.flatMap((row) =>
        row.situationSnapshot?.situationId ? [row.situationSnapshot.situationId] : []
      ),
    }
  );
  const situationPool = bankSituations.length ? bankSituations : referenceSituations;
  const domainFallbackSituations = situationPool.filter(
    (situation) =>
      (isAutoGenerationEligible(situation) ||
        (situation.ownerId === currentUser?.id &&
          ['PRIVATE', 'REJECTED'].includes(situation.status))) &&
      hasOrdinaryLearningRelation(situation) &&
      situation.grade === grade &&
      situation.fieldId === fieldId
  );
  const privateMatchingSituations = bankSituations.filter(
    (situation) =>
      situation.ownerId === currentUser?.id &&
      ['PRIVATE', 'REJECTED'].includes(situation.status) &&
      situation.grade === grade &&
      situation.fieldId === fieldId &&
      situation.objectiveTexts.includes(plan.sessionTitle)
  );
  const exactSituations = [
    ...matchingSituations,
    ...privateMatchingSituations.filter(
      (item) => !matchingSituations.some((match) => match.id === item.id)
    ),
  ];
  const availableSituations = [
    ...exactSituations,
    ...domainFallbackSituations.filter(
      (item) => !exactSituations.some((match) => match.id === item.id)
    ),
  ];
  const targetObjectiveIds = Array.from(
    new Set(
      (plan.pedagogicalPartReferences || [])
        .map((part) => part.objectiveId)
        .filter((value): value is string => Boolean(value))
    )
  );
  const selectedSituationRows = rows.filter(
    (row) => row.phase === 'المرحلة الرئيسية' && row.situationSnapshot
  );
  const coveredObjectiveIds = Array.from(
    new Set(selectedSituationRows.flatMap((row) => row.situationSnapshot?.objectiveIds || []))
  );
  const missingObjectiveIds = targetObjectiveIds.filter((id) => !coveredObjectiveIds.includes(id));
  const coverageState =
    selectedSituationRows.length === 0
      ? 'لم يُختر موقف بعد'
      : targetObjectiveIds.length && missingObjectiveIds.length === 0
        ? 'التغطية مكتملة'
        : targetObjectiveIds.length
          ? 'التغطية جزئية'
          : 'موقف مرتبط بالمذكرة';
  const coverageLessonType = canonicalLessonTypeForPlan(plan.sessionType);
  const coverageSelection = selectEducationalSituations(situationPool, {
    gradeId: grade,
    domainId: fieldId,
    lessonType: coverageLessonType,
    objectiveIds: targetObjectiveIds,
    objectiveText: plan.sessionTitle,
    durationMinutes: effectiveDuration,
    previousSituationIds: plan.lessonRows?.flatMap((row) =>
      row.situationSnapshot?.situationId ? [row.situationSnapshot.situationId] : []
    ),
  });
  const mainSituationCount = memoModel.mainPhase.situations.length;
  const addSituation = (situation: EducationalSituation) => {
    const main = {
      id: `main-${Date.now()}`,
      phase: 'المرحلة الرئيسية' as const,
      learningContent: situation.name,
      executionContent:
        situation.executionConditions ||
        situation.instructions ||
        formatSituationExecution(situation),
      durationMinutes: 1,
      guidance:
        [
          situation.successCriteria ? `معيار النجاح: ${situation.successCriteria}` : '',
          detailText(situation.observationIndicators)
            ? `مؤشرات الملاحظة: ${detailText(situation.observationIndicators)}`
            : '',
          situation.variations || '',
        ]
          .filter(Boolean)
          .join('\n') || 'احترام التعليمات.',
      situationSnapshot: snapshotSituation(situation),
    };
    const pendingRow = rows.find(
      (row) =>
        row.phase === 'المرحلة الرئيسية' &&
        !row.situationSnapshot &&
        row.learningContent.startsWith('اختيار موقف تربوي يدويًا')
    );
    const candidateRows = replaceRowId
      ? rows.map((row) => (row.id === replaceRowId ? { ...main, id: replaceRowId } : row))
      : pendingRow
        ? rows.map((row) => (row.id === pendingRow.id ? { ...main, id: pendingRow.id } : row))
        : [...rows, main];
    const next = rebalanceLessonRows(candidateRows, effectiveDuration);
    const equipmentNeeded = [
      ...new Set([
        ...plan.equipmentNeeded,
        ...next.flatMap((row) => row.situationSnapshot?.equipment || []),
      ]),
    ];
    if (editing) {
      setDraft((previous) => previous && { ...previous, lessonRows: next, equipmentNeeded });
    } else {
      void persistLessonPlan(
        saveLessonMemo({ ...plan, lessonRows: next, equipmentNeeded, manualEdits: true })
      );
    }
    setReplaceRowId(null);
  };

  const generateSituationSuggestion = async () => {
    try {
      setGeneratedSituationError('');
      setGeneratedSituation(
        await requestPedagogicalSituationGeneration({
          intent: targetObjectiveIds.length ? 'GENERATE_FOR_OBJECTIVE' : 'GENERATE_SITUATION',
          gradeId: plan.levelId || `lvl_p${grade}`,
          domainId: fieldId,
          finalCompetencyId: `fc_${plan.levelId || `lvl_p${grade}`}_${fieldId}`,
          objectiveIds: targetObjectiveIds,
          lessonType: coverageLessonType,
          motorSkills: [plan.proceduralObjectives.motor].filter(Boolean),
          requirements: [
            plan.proceduralObjectives.motor,
            plan.proceduralObjectives.cognitive,
            plan.proceduralObjectives.affective || '',
          ].filter(Boolean),
          equipment: plan.equipmentNeeded,
          availableEquipment: plan.equipmentNeeded,
          durationMinutes: effectiveDuration,
          recentSituationIds: selectedSituationRows.flatMap((row) =>
            row.situationSnapshot?.situationId ? [row.situationSnapshot.situationId] : []
          ),
          recentSituationTitles: selectedSituationRows.flatMap((row) =>
            row.situationSnapshot?.name ? [row.situationSnapshot.name] : []
          ),
        })
      );
    } catch {
      setGeneratedSituationError('تعذر إعداد الموقف المقترح. راجع هدف الحصة ثم حاول مرة أخرى.');
    }
  };

  const generateAlternativeSituationSuggestion = async () => {
    const sourceSituationId =
      selectedSituationRows[0]?.situationSnapshot?.situationId || availableSituations[0]?.id;
    const sourceSituation = availableSituations.find((item) => item.id === sourceSituationId);
    if (!sourceSituationId) {
      setGeneratedSituationError('اختر موقفًا مرجعيًا أولًا لإعداد بديل تربوي.');
      return;
    }
    try {
      setGeneratedSituationError('');
      setGeneratedSituation(
        await requestPedagogicalSituationGeneration({
          intent: 'GENERATE_ALTERNATIVE',
          gradeId: plan.levelId || `lvl_p${grade}`,
          domainId: fieldId,
          finalCompetencyId: `fc_${plan.levelId || `lvl_p${grade}`}_${fieldId}`,
          objectiveIds: targetObjectiveIds,
          lessonType: coverageLessonType,
          motorSkills: [plan.proceduralObjectives.motor].filter(Boolean),
          requirements: [
            plan.proceduralObjectives.motor,
            plan.proceduralObjectives.cognitive,
            plan.proceduralObjectives.affective || '',
          ].filter(Boolean),
          equipment: plan.equipmentNeeded,
          availableEquipment: plan.equipmentNeeded,
          durationMinutes: effectiveDuration,
          recentSituationIds: selectedSituationRows.flatMap((row) =>
            row.situationSnapshot?.situationId ? [row.situationSnapshot.situationId] : []
          ),
          sourceSituationId,
          sourceSituation: sourceSituation
            ? {
                id: sourceSituation.id,
                title: sourceSituation.name,
                executionContent:
                  sourceSituation.executionConditions || sourceSituation.instructions || '',
              }
            : undefined,
        })
      );
    } catch {
      setGeneratedSituationError('تعذر إعداد البديل التربوي وفق السياق المحدد.');
    }
  };

  const saveGeneratedSituation = async () => {
    if (!generatedSituation || !currentUser) return;
    setGeneratedSituationSaving(true);
    setGeneratedSituationError('');
    try {
      const response = await fetch('/api/educational-situations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generatedSituation.title,
          grade,
          fieldId,
          fieldName: plan.fieldName,
          objectiveIds: targetObjectiveIds,
          objectiveTexts: plan.sessionTitle ? [plan.sessionTitle] : [],
          sourceGoal: plan.sessionTitle,
          organization: generatedSituation.organization,
          equipment: generatedSituation.equipment,
          variations: generatedSituation.variants,
          gradeId: plan.levelId || `lvl_p${grade}`,
          domainId: fieldId,
          lessonTypes: [coverageLessonType],
          executionConditions: generatedSituation.executionConditions,
          successCriteria: generatedSituation.successCriteria,
          observationIndicators: generatedSituation.observationIndicators,
          motorActions: generatedSituation.motorSkills,
          pedagogicalTags: generatedSituation.tags,
          difficulty: generatedSituation.difficulty,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'save failed');
      const saved = body.situation as EducationalSituation;
      setBankSituations((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      addSituation(saved);
      setGeneratedSituation(null);
      setShowBank(false);
    } catch {
      setGeneratedSituationError('تعذر حفظ الموقف. بقيت المسودة متاحة للمراجعة ولم تتغير المذكرة.');
    } finally {
      setGeneratedSituationSaving(false);
    }
  };

  const useGeneratedSituationWithoutSaving = () => {
    if (!generatedSituation) return;
    const draftSituation: EducationalSituation = {
      id: `generated-${plan.id}-${Date.now()}`,
      name: generatedSituation.title,
      grade,
      gradeId: plan.levelId || `lvl_p${grade}`,
      fieldId,
      domainId: fieldId,
      fieldName: plan.fieldName,
      objectiveIds: targetObjectiveIds,
      objectiveTexts: plan.sessionTitle ? [plan.sessionTitle] : [],
      sourceGoal: plan.sessionTitle,
      organization: generatedSituation.organization,
      equipment: generatedSituation.equipment,
      variations: generatedSituation.variants,
      lessonTypes: [coverageLessonType],
      durationMinutes: generatedSituation.durationMinutes,
      executionConditions: generatedSituation.executionConditions,
      instructions: generatedSituation.instructions,
      successCriteria: generatedSituation.successCriteria,
      observationIndicators: generatedSituation.observationIndicators,
      motorActions: generatedSituation.motorSkills,
      pedagogicalTags: generatedSituation.tags,
      difficulty: generatedSituation.difficulty,
      origin: 'TEACHER',
      status: 'PRIVATE',
    };
    addSituation(draftSituation);
    setGeneratedSituation(null);
    setShowBank(false);
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
    else
      void persistLessonPlan(
        saveLessonMemo({ ...plan, lessonRows: next, equipmentNeeded, manualEdits: true })
      );
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
              ? 'قالب موحد مستمد من الحصة المحددة في التوزيع السنوي والكراس اليومي.'
              : isAnnualDistributionMemo
                ? 'قالب موحد مستمد من التوزيع السنوي وأهداف المقطع.'
                : 'هذه المذكرة غير مرتبطة بحصة مبرمجة في الكراس اليومي.'}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${isScheduled ? 'bg-blue-50 text-blue-700' : isAnnualDistributionMemo ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          >
            {isScheduled
              ? 'مذكرة حصة مبرمجة'
              : isAnnualDistributionMemo
                ? 'مذكرة من التوزيع السنوي'
                : 'مذكرة مستقلة'}
          </span>
          <span className="mr-2 mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            {plan.manualEdits ? 'معدلة' : plan.generatedAt ? 'مسودة مولدة' : 'محفوظة'}
          </span>
          {memoSaveStatus === 'SAVING' && (
            <span
              role="status"
              className="mr-2 mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"
            >
              جارٍ حفظ المذكرة على الخادم...
            </span>
          )}
          {memoSaveStatus === 'SAVED' && (
            <span
              role="status"
              className="mr-2 mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
            >
              تم حفظ المذكرة على الخادم
            </span>
          )}
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
              {(isScheduled || isAnnualDistributionMemo) && (
                <button
                  type="button"
                  onClick={() => regenerateSelectedMemo()}
                  disabled={memoSaveStatus === 'SAVING'}
                  aria-busy={memoSaveStatus === 'SAVING'}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
                >
                  إعادة توليد المذكرة
                </button>
              )}
              <button
                onClick={() => exportLessonPlanToPdf(plan)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                <Printer className="ml-1 inline h-4 w-4" />
                طباعة
              </button>
              <button
                type="button"
                onClick={() => void handleWordExport(plan)}
                disabled={wordExporting}
                aria-busy={wordExporting}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
              >
                {wordExporting ? 'جارٍ تجهيز Word...' : 'Word'}
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
                disabled={memoSaveStatus === 'SAVING'}
                aria-busy={memoSaveStatus === 'SAVING'}
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
      {wordExportError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
          {wordExportError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
          {saveError}
        </p>
      )}
      {plan.generationWarnings && plan.generationWarnings.length > 0 && (
        <aside
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <h3 className="font-bold">تنبيهات إعداد المذكرة</h3>
          <ul className="mt-2 list-disc space-y-1 pr-5">
            {plan.generationWarnings.map((warning) => (
              <li key={warning.code}>
                <span>{warning.message}</span>
                {warning.action && <span className="mr-1">{warning.action}</span>}
              </li>
            ))}
          </ul>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setReplaceRowId(null);
                setShowBank(true);
              }}
              className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900"
            >
              اختيار المواقف يدويًا
            </button>
          )}
        </aside>
      )}

      <section
        className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-950">
              <Target className="h-4 w-4" /> تغطية الموقف داخل المذكرة
            </h3>
            <p className="mt-1 text-xs text-emerald-900">
              {coverageState}. الاختيار يعتمد على بنك المواقف المعتمد وسياق هذه الحصة.
            </p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setReplaceRowId(null);
                setShowBank(true);
              }}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900"
            >
              اختيار موقف من البنك
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-xl bg-white/80 p-3">
            <strong className="block text-emerald-950">المواقف المتصلة</strong>
            <span>{selectedSituationRows.length}</span>
          </div>
          <div className="rounded-xl bg-white/80 p-3">
            <strong className="block text-emerald-950">الأهداف المغطاة</strong>
            <span>
              {targetObjectiveIds.length
                ? `${coveredObjectiveIds.length} من ${targetObjectiveIds.length}`
                : 'حسب هدف الحصة'}
            </span>
          </div>
          <div className="rounded-xl bg-white/80 p-3">
            <strong className="block text-emerald-950">مرشحون مطابقون</strong>
            <span>{coverageSelection.candidates.length}</span>
          </div>
        </div>
        {selectedSituationRows.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            {Array.from(
              new Map(
                selectedSituationRows
                  .flatMap((row) => row.situationSnapshot?.objectiveRelations || [])
                  .map((relation) => [`${relation.objectiveId}-${relation.relationType}`, relation])
              ).values()
            ).map((relation) => (
              <span
                key={`${relation.objectiveId}-${relation.relationType}`}
                className="rounded-full bg-white px-2.5 py-1 text-emerald-900"
              >
                {relationLabel(relation.relationType)} · {relation.objectiveId}
              </span>
            ))}
          </div>
        )}
      </section>

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
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
            <h3 className="text-xs font-black text-slate-800">ملاحظات الأستاذ</h3>
            {editing ? (
              <textarea
                value={draft?.teacherNotes || ''}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous ? { ...previous, teacherNotes: event.target.value } : previous
                  )
                }
                placeholder="أضف ملاحظاتك حول تنفيذ الحصة..."
                className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 bg-white p-2 outline-none"
              />
            ) : (
              <p className="mt-1 min-h-6 whitespace-pre-line text-sm text-slate-700">
                {plan.teacherNotes || 'لا توجد ملاحظات محفوظة.'}
              </p>
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
      {(isScheduled || isAnnualDistributionMemo) && (
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() =>
              window.location.assign(
                annualDistributionPath(
                  plan.academicYearId || operationalAcademicYearId,
                  plan.levelId || annualLevelId || operationalClass?.levelId
                )
              )
            }
            className="rounded-xl border border-slate-300 px-3 py-2"
          >
            التوزيع السنوي
          </button>
          {isScheduled && scheduledContext && (
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
          )}
        </div>
      )}

      {showRegenerationConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="regeneration-confirmation-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 id="regeneration-confirmation-title" className="text-base font-extrabold">
              إعادة توليد المذكرة
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              سيؤدي ذلك إلى استبدال التعديلات الحالية في هذه المذكرة. هل تريد المتابعة؟
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegenerationConfirm(false)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => regenerateSelectedMemo(true)}
                className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white"
              >
                متابعة وإعادة التوليد
              </button>
            </div>
          </div>
        </div>
      )}
      {generatorModal}
      {showBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="memo-situation-bank-title"
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
          >
            <div className="flex justify-between gap-3">
              <div>
                <h3 id="memo-situation-bank-title" className="font-extrabold">
                  {replaceRowId
                    ? 'استبدال الموقف من بنك المواقف'
                    : 'بنك المواقف التربوية المطابقة للهدف'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  تظهر المطابقات أولًا، ثم مرشحون من نفس المستوى والميدان عند الحاجة للمراجعة
                  اليدوية.
                </p>
              </div>
              <button aria-label="إغلاق بنك المواقف" onClick={() => setShowBank(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="text-sm text-emerald-950">لم تجد موقفًا مناسبًا؟</strong>
                  <p className="mt-1 text-xs text-emerald-900">
                    يمكنك إعداد اقتراح منظم وفق هدف هذه الحصة ثم مراجعته قبل الاستخدام.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void generateSituationSuggestion()}
                  className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                >
                  اقتراح موقف مناسب للهدف
                </button>
              </div>
            </div>
            {generatedSituationError && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"
              >
                {generatedSituationError}
              </p>
            )}
            {generatedSituation && (
              <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-sm text-sky-950">مراجعة الاقتراح</strong>
                    <p className="mt-1 text-xs text-sky-900">
                      هذا الاقتراح خاص بك ولا يصبح موقفًا عامًا معتمدًا تلقائيًا.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedSituation(null)}
                    className="rounded-lg p-1 text-slate-500"
                    aria-label="إلغاء الاقتراح"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <input
                    value={generatedSituation.title}
                    onChange={(event) =>
                      setGeneratedSituation(
                        (previous) => previous && { ...previous, title: event.target.value }
                      )
                    }
                    className="w-full rounded-lg border border-sky-200 bg-white p-2 text-sm font-bold"
                    aria-label="عنوان الموقف المقترح"
                  />
                  {[
                    ['الوصف', 'description'],
                    ['التنظيم', 'organization'],
                    ['التعليمة', 'instructions'],
                    ['شروط الإنجاز', 'executionConditions'],
                    ['معيار النجاح', 'successCriteria'],
                    ['مؤشرات الملاحظة', 'observationIndicators'],
                    ['التنويعات', 'variants'],
                  ].map(([label, key]) => (
                    <label key={key} className="block text-xs font-bold text-slate-700">
                      {label}
                      <textarea
                        value={
                          generatedSituation[
                            key as keyof GeneratedPedagogicalSituationCandidate
                          ] as string
                        }
                        onChange={(event) =>
                          setGeneratedSituation(
                            (previous) => previous && { ...previous, [key]: event.target.value }
                          )
                        }
                        className="mt-1 min-h-12 w-full rounded-lg border border-sky-200 bg-white p-2 text-xs font-normal"
                      />
                    </label>
                  ))}
                  <label className="block text-xs font-bold text-slate-700">
                    الوسائل
                    <input
                      value={generatedSituation.equipment.join('، ')}
                      onChange={(event) =>
                        setGeneratedSituation(
                          (previous) =>
                            previous && {
                              ...previous,
                              equipment: event.target.value
                                .split(/[,،]/)
                                .map((item) => item.trim())
                                .filter(Boolean),
                            }
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-sky-200 bg-white p-2 text-xs font-normal"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={useGeneratedSituationWithoutSaving}
                    className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900"
                  >
                    استخدام في المذكرة فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveGeneratedSituation()}
                    disabled={generatedSituationSaving}
                    className="rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {generatedSituationSaving ? 'جارٍ الحفظ...' : 'حفظ كموقف خاص واستخدامه'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateAlternativeSituationSuggestion()}
                    className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900"
                  >
                    اقتراح بديل
                  </button>
                </div>
              </section>
            )}
            {availableSituations.length ? (
              availableSituations.map((situation) => (
                <div
                  key={situation.id}
                  className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{situation.name}</strong>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${exactSituations.some((item) => item.id === situation.id) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
                    >
                      {exactSituations.some((item) => item.id === situation.id)
                        ? 'مطابق للسياق'
                        : 'مرشح للمراجعة'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {situation.sourceGoal ||
                      situation.executionConditions ||
                      situation.organization}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    الوسائل: {situation.equipment.join('، ') || 'غير محددة'} · المدة:{' '}
                    {situation.durationMinutes ? `${situation.durationMinutes} دقيقة` : 'غير محددة'}
                  </p>
                  {!!situation.successCriteria && (
                    <p className="mt-1 text-xs text-slate-500">
                      معيار النجاح: {situation.successCriteria}
                    </p>
                  )}
                  <button
                    onClick={() => addSituation(situation)}
                    className="action-primary mt-2 rounded-lg px-3 py-1 text-xs font-bold text-white"
                  >
                    اختيار
                  </button>
                </div>
              ))
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                لا يوجد موقف معتمد أو مرشح متاح لهذا المستوى والميدان. يمكنك تحرير المسودة يدويًا أو
                إضافة موقف إلى البنك من محرك المعرفة.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
