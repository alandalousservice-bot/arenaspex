import {
  Grade4WeeklyScheduleMode,
  LessonPhaseName,
  LessonPlan,
  LessonPlanRow,
} from '../types/spex';
import { EducationalSituation } from '../types/spex';
import {
  referenceSituations,
  selectEducationalSituations,
  snapshotSituation,
} from './educationalSituation.selector.service';
import type { EducationalSituationLessonType } from './educationalSituation.selector.service';
import { lessonPhaseBudgets, sequenceLessonSituations } from './lessonSituationSequencing.service';
import { resolveOperationalLessonDuration } from './lessonTiming.service';
import {
  assessmentScopeRequirementLabels,
  type CanonicalAssessmentScope,
} from '../domain/pedagogicalKnowledge/assessmentScopeAdapter';
import {
  manualStandaloneLessonMemoIdFor,
  scheduledLessonMemoIdFor,
  standaloneLessonMemoIdFor,
} from './lessonMemoIdentity.service';

let independentMemoSequence = 0;

export interface AutoGenerateSessionSource {
  referenceSessionId?: string;
  fieldId: string;
  fieldName: string;
  finalCompetency: string;
  segmentGoal: string;
  sessionNumber: number;
  globalNumber: number;
  weekNumber: number;
  type: LessonPlan['sessionType'];
  typeLabel: string;
  /** الهدف المعتمد في التوزيع السنوي؛ لا يعاد توليده أو استبداله هنا. */
  objective: string;
  objectiveId?: string | null;
  teacherObjectiveId?: string | null;
  objectiveGroupId?: string | null;
  relatedObjectiveIds?: string[];
  tools: string[];
}

export interface AutoGenerateContext {
  levelName: string;
  className?: string;
  teacher?: LessonMemoTeacherIdentity;
  dailyNotebookEntryId?: string;
  classPlannedSessionId?: string;
  referenceSessionId?: string;
  academicYearId?: string;
  classId?: string;
  plannedStartTime?: string | null;
  venue?: string | null;
  inspectorName?: string;
  date?: string;
  durationMinutes?: number;
  previousSituationIds?: string[];
  situations?: EducationalSituation[];
  assessmentScope?: CanonicalAssessmentScope;
  grade4WeeklyScheduleMode?: Grade4WeeklyScheduleMode | null;
  pedagogicalParts?: AutoGenerateSessionSource[];
}

export interface IndependentLessonMemoInput {
  teacher?: LessonMemoTeacherIdentity;
  inspectorName?: string;
  levelName: string;
  fieldId: string;
  fieldName: string;
  sessionType: LessonPlan['sessionType'];
  objective: string;
  learningContent: string;
  executionContent: string;
  successCriteria: string;
  observationIndicators: string;
  equipment: string[];
  durationMinutes: number;
  teacherNotes: string;
}

/** Minimal trusted profile required to render a memo; auth/session claims are not profile data. */
export interface LessonMemoTeacherIdentity {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  schoolName?: string | null;
}

function teacherDisplayName(teacher?: LessonMemoTeacherIdentity): string {
  return [teacher?.firstName, teacher?.lastName]
    .filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

function optionalDisplayValue(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const lessonDurationForLevel = (
  levelName: string,
  grade4WeeklyScheduleMode?: Grade4WeeklyScheduleMode | null
): number =>
  resolveOperationalLessonDuration({
    gradeId: levelName,
    classPlanningMode: grade4WeeklyScheduleMode,
  });

export interface LessonPlanTimingValidation {
  valid: boolean;
  expectedMinutes: number;
  actualMinutes: number;
  phaseTotals: Record<LessonPhaseName, number>;
}

export function validateLessonPlanTiming(
  rows: LessonPlanRow[],
  expectedMinutes: number
): LessonPlanTimingValidation {
  const phaseTotals: Record<LessonPhaseName, number> = {
    'المرحلة التحضيرية': 0,
    'المرحلة الرئيسية': 0,
    'المرحلة الختامية': 0,
  };
  let validRows = true;
  for (const row of rows) {
    const duration = Number(row.durationMinutes);
    if (!Number.isFinite(duration) || duration < 1) validRows = false;
    phaseTotals[row.phase] += Number.isFinite(duration) ? duration : 0;
  }
  const actualMinutes = Object.values(phaseTotals).reduce((sum, value) => sum + value, 0);
  return {
    valid: validRows && actualMinutes === expectedMinutes,
    expectedMinutes,
    actualMinutes,
    phaseTotals,
  };
}

/** يوزع الزمن المتاح على صفوف المرحلة الرئيسية مع إبقاء التحضيرية والختامية كما هي. */
export function rebalanceLessonRows(rows: LessonPlanRow[], totalMinutes: number): LessonPlanRow[] {
  const main = rows.filter((row) => row.phase === 'المرحلة الرئيسية');
  if (!main.length) return rows;
  const fixed = rows
    .filter((row) => row.phase !== 'المرحلة الرئيسية')
    .reduce((sum, row) => sum + Math.max(0, Number(row.durationMinutes) || 0), 0);
  const available = Math.max(main.length, totalMinutes - fixed);
  const base = Math.floor(available / main.length);
  const remainder = available % main.length;
  let mainIndex = 0;
  return rows.map((row) => {
    if (row.phase !== 'المرحلة الرئيسية') return row;
    const durationMinutes = base + (mainIndex < remainder ? 1 : 0);
    mainIndex += 1;
    return { ...row, durationMinutes };
  });
}

const hasComplexObjective = (objective: string) =>
  /يربط|يجمع|سلسلة|مركب|توظيف|تطبيق.*ألعاب|عدة/.test(objective);

function situationEquipment(fieldId: string): string[] {
  if (fieldId === 'f_fundamentals') return ['أقماع', 'كرات', 'شواخص'];
  if (fieldId === 'f_structuring') return ['صدريات', 'كرات', 'أقماع'];
  return ['أقماع', 'شواخص', 'سلم أرضي'];
}

function canonicalLessonTypeFor(
  type: AutoGenerateSessionSource['type']
): EducationalSituationLessonType | null {
  if (type === 'تشخيصية' || type === 'تقويم تشخيصي') return 'DIAGNOSTIC';
  if (type === 'تقويمية' || type === 'تقويم تحصيلي') return 'SUMMATIVE';
  if (type === 'إدماجية') return 'INTEGRATIVE';
  if (type === 'تعلمية') return 'LEARNING';
  return null;
}

export type LessonMemoGenerationWarningCode =
  | 'NO_ELIGIBLE_SITUATION'
  | 'NO_DIRECT_MATCH'
  | 'INTEGRATIVE_COVERAGE_INCOMPLETE'
  | 'ASSESSMENT_COVERAGE_MISSING'
  | 'INSUFFICIENT_DURATION_COVERAGE'
  | 'PHASE_BUDGET_UNFILLED'
  | 'NO_MAIN_DIRECT_ACTIVITY'
  | 'DURATION_UNKNOWN'
  | 'REQUIREMENT_COVERAGE_INCOMPLETE';

export interface LessonMemoGenerationWarning {
  code: LessonMemoGenerationWarningCode;
  message: string;
  action?: string;
}

export const LESSON_MEMO_WARNING_MESSAGES: Record<
  LessonMemoGenerationWarningCode,
  { message: string; action?: string }
> = {
  NO_ELIGIBLE_SITUATION: {
    message: 'لم يتوفر موقف تربوي معتمد ومطابق لهذه الحصة.',
    action: 'يمكنك اختيار موقف مناسب يدويًا من بنك المواقف.',
  },
  NO_DIRECT_MATCH: {
    message: 'لم يتوفر موقف مباشر مطابق للهدف التعلمي.',
    action: 'اختر موقفًا مباشرًا مطابقًا من بنك المواقف أو راجع الهدف المعتمد.',
  },
  INTEGRATIVE_COVERAGE_INCOMPLETE: {
    message: 'المواقف المتاحة لا تغطي جميع الأهداف الإدماجية المطلوبة.',
    action: 'راجع المواقف المقترحة أو اختر مواقفًا إضافية يدويًا.',
  },
  ASSESSMENT_COVERAGE_MISSING: {
    message: 'لم تتوفر مواقف تقويمية كافية لسياق التقويم المحدد.',
    action: 'اختر موقفًا تقويميًا مناسبًا يدويًا قبل الحفظ النهائي.',
  },
  INSUFFICIENT_DURATION_COVERAGE: {
    message: 'لا يكفي الزمن التشغيلي للمواقف المطابقة المتاحة.',
    action: 'راجع المواقف المختارة أو أعد توزيع زمن الحصة يدويًا.',
  },
  PHASE_BUDGET_UNFILLED: {
    message: 'التسلسل المولد لا يستعمل كامل زمن الحصة.',
    action: 'راجع أزمنة المواقف قبل الحفظ.',
  },
  NO_MAIN_DIRECT_ACTIVITY: {
    message: 'لا يوجد موقف رئيسي مباشر يطابق الهدف التعلمي.',
    action: 'اختر موقفًا مباشرًا مطابقًا من البنك.',
  },
  DURATION_UNKNOWN: {
    message: 'زمن أحد المواقف غير محدد، لذلك يحتاج التوزيع إلى مراجعة.',
  },
  REQUIREMENT_COVERAGE_INCOMPLETE: {
    message: 'لا يغطي التسلسل كل المتطلبات الحركية المطلوبة.',
    action: 'راجع المواقف المختارة وأضف ما يلزم يدويًا.',
  },
};

function generationWarnings(codes: string[]): LessonMemoGenerationWarning[] {
  return [...new Set(codes)].flatMap((code) => {
    const descriptor = LESSON_MEMO_WARNING_MESSAGES[code as LessonMemoGenerationWarningCode];
    return descriptor ? [{ code: code as LessonMemoGenerationWarningCode, ...descriptor }] : [];
  });
}

export function formatSituationExecution(situation: EducationalSituation): string {
  const equipment = situation.equipment.length
    ? ` الوسائل المستعملة: ${situation.equipment.join('، ')}.`
    : '';
  return `${situation.organization.trim()}${equipment}`.trim();
}

function buildMainRows(
  session: AutoGenerateSessionSource,
  durationMinutes: number,
  ctx: AutoGenerateContext
): { rows: LessonPlanRow[]; warnings: LessonMemoGenerationWarning[] } {
  const pedagogicalParts = ctx.pedagogicalParts?.length ? ctx.pedagogicalParts : [session];
  const objectiveIds = pedagogicalParts
    .flatMap((part) => [part.objectiveId, ...(part.relatedObjectiveIds || [])])
    .filter((value): value is string => Boolean(value));
  const grade =
    Number(
      (ctx.levelName.match(/(الأولى|الثانية|الثالثة|الرابعة|الخامسة)/)?.[1] || '')
        .replace('الأولى', '1')
        .replace('الثانية', '2')
        .replace('الثالثة', '3')
        .replace('الرابعة', '4')
        .replace('الخامسة', '5')
    ) || 0;
  const availableSituations = ctx.situations || referenceSituations;
  const phaseBudgets = lessonPhaseBudgets(ctx.levelName, durationMinutes);
  const mainMinutes = phaseBudgets.main;
  const canonicalLessonType = canonicalLessonTypeFor(pedagogicalParts[0]?.type) || 'LEARNING';
  const assessmentScope =
    canonicalLessonType === 'DIAGNOSTIC' || canonicalLessonType === 'SUMMATIVE'
      ? ctx.assessmentScope
      : undefined;
  const scopeRequirements = assessmentScope
    ? assessmentScopeRequirementLabels(assessmentScope)
    : [];
  const selection = selectEducationalSituations(availableSituations, {
    gradeId: grade,
    domainId: session.fieldId,
    lessonType: canonicalLessonType,
    objectiveIds,
    objectiveText: session.objective,
    durationMinutes,
    requirements: scopeRequirements,
    assessmentScope,
    previousSituationIds: ctx.previousSituationIds,
    availableEquipment: session.tools,
    maxSituations: Math.max(1, Math.min(3, Math.floor(mainMinutes / 20))),
    ownerId: ctx.teacher?.id,
  });
  const hasExplicitObjectiveMatch =
    objectiveIds.length > 0 ||
    pedagogicalParts.some((part) =>
      availableSituations.some(
        (situation) =>
          situation.objectiveTexts.includes(part.objective) ||
          situation.objectiveIds.includes(part.objectiveId || '')
      )
    );
  const selectedIds = new Set(
    hasExplicitObjectiveMatch ? selection.selectedSituations.map((situation) => situation.id) : []
  );
  const selectedCandidates = selection.candidates.filter((candidate) =>
    selectedIds.has(candidate.situation.id)
  );
  const sequence = sequenceLessonSituations({
    gradeId: grade,
    fieldId: session.fieldId,
    objectiveId: objectiveIds[0],
    lessonType: canonicalLessonType,
    lessonDurationMinutes: durationMinutes,
    selectedSituations: selectedCandidates,
    selectionWarnings: selection.warnings,
    integratedObjectiveIds: canonicalLessonType === 'INTEGRATIVE' ? objectiveIds : undefined,
  });
  let selectionFailureCode = selection.failureCode;
  if (!selectedCandidates.length && !selectionFailureCode) {
    selectionFailureCode = 'NO_ELIGIBLE_SITUATION';
  }
  const warnings = generationWarnings([
    ...selection.warnings,
    ...(selectedCandidates.length ? sequence.warnings : []),
    ...(selectionFailureCode ? [selectionFailureCode] : []),
  ]);
  if (selectedCandidates.length) {
    return {
      rows: sequence.orderedActivities
        .filter((activity) => activity.situationId)
        .map<LessonPlanRow | null>((activity, index) => {
          const situation = selectedCandidates.find(
            (candidate) => candidate.situation.id === activity.situationId
          )?.situation;
          if (!situation) return null;
          return {
            id: `main-${index + 1}`,
            phase: activity.phase,
            learningContent: situation.name,
            executionContent: formatSituationExecution(situation),
            durationMinutes: activity.allocatedDurationMinutes,
            guidance: situation.variations || 'احترام التنظيم والتعليمات.',
            situationSnapshot: snapshotSituation(situation),
          };
        })
        .filter((row): row is LessonPlanRow => row !== null),
      warnings,
    };
  }
  const isLearning = canonicalLessonType === 'LEARNING';
  const count = isLearning
    ? mainMinutes < 40
      ? 1
      : hasComplexObjective(session.objective)
        ? 3
        : 2
    : 1;
  const minutes = Array.from(
    { length: count },
    (_, index) => Math.floor(mainMinutes / count) + (index < mainMinutes % count ? 1 : 0)
  );
  const tools = session.tools.length ? session.tools : situationEquipment(session.fieldId);
  const fallbackDescriptions = [
    'تفكيك عناصر الهدف والتعرف عليها ثم تنفيذها وفق التعليمات.',
    'توظيف عناصر الهدف في وضعية منظمة والاستجابة للتعليمات مع تثبيت الأداء.',
    'تثبيت الأداء وربط عناصر الهدف في تطبيق مركب قابل للملاحظة.',
  ];

  return {
    rows: minutes.map((durationMinutes, index) => ({
      id: `main-${index + 1}`,
      phase: 'المرحلة الرئيسية',
      learningContent: isLearning
        ? `مسودة مكملة ${String(index + 1).padStart(2, '0')} لهدف الحصة`
        : `اختيار موقف تربوي يدويًا ${String(index + 1).padStart(2, '0')}`,
      executionContent: isLearning
        ? `${fallbackDescriptions[index]} الهدف المقصود: ${session.objective} الوسائل المتوقعة: ${tools.join('، ')}.`
        : `لم يتوفر موقف معتمد مطابق تلقائيًا. اختر موقفًا مناسبًا من بنك المواقف قبل اعتماد هذه المسودة. الوسائل المتوقعة: ${tools.join('، ')}.`,
      durationMinutes,
      guidance: isLearning
        ? 'مسودة قابلة للتحرير والمراجعة؛ لا تعد موقفًا معتمدًا ولا تُنشر تلقائيًا.'
        : 'تظل هذه الخانة معلقة إلى حين اختيار موقف مطابق والتحقق من التعليمات والسلامة.',
    })),
    warnings,
  };
}

/** ينشئ قالباً واحداً مطابقاً لجدول المذكرة المرجعي. */
export function autoGenerateLessonPlan(
  session: AutoGenerateSessionSource,
  ctx: AutoGenerateContext
): LessonPlan {
  const pedagogicalParts = ctx.pedagogicalParts?.length ? ctx.pedagogicalParts : [session];
  const lessonTypes = new Set(pedagogicalParts.map((part) => part.type));
  if (lessonTypes.size > 1) {
    const error = new Error('Combined pedagogical parts must use one lesson type.') as Error & {
      code?: string;
    };
    error.code = 'COMBINED_SESSION_LESSON_TYPE_CONFLICT';
    throw error;
  }
  const combinedObjective = [
    ...new Set(pedagogicalParts.map((part) => part.objective).filter(Boolean)),
  ].join('؛ ');
  const durationMinutes =
    Number.isFinite(ctx.durationMinutes) && (ctx.durationMinutes || 0) > 0
      ? Math.round(ctx.durationMinutes as number)
      : lessonDurationForLevel(ctx.levelName, ctx.grade4WeeklyScheduleMode);
  const phaseBudgets = lessonPhaseBudgets(ctx.levelName, durationMinutes);
  const preparationMinutes = phaseBudgets.warmup;
  const mainMinutes = phaseBudgets.main;
  const closingMinutes = phaseBudgets.final;
  const mainResult = buildMainRows(session, durationMinutes, ctx);
  const mainRows = mainResult.rows;
  const equipmentNeeded = [
    ...new Set([
      ...session.tools,
      ...mainRows.flatMap(
        (row) => row.situationSnapshot?.equipment || situationEquipment(session.fieldId)
      ),
    ]),
  ];
  const teacher = ctx.teacher;
  const lessonRows: LessonPlanRow[] = [
    {
      id: 'preparation',
      phase: 'المرحلة التحضيرية',
      learningContent: 'تنظيم المتعلمين وتهيئة الجسم والميدان للنشاط.',
      executionContent:
        'ينظم الأستاذ المتعلمين في أفواج، يتأكد من سلامة الميدان والمسافات، ثم يقود إحماءً تدريجياً وتحريكاً للمفاصل قبل شرح الإشارة وقواعد التنفيذ.',
      durationMinutes: preparationMinutes,
      guidance: 'التنظيم الجيد، التأكد من السلامة، احترام المسافة، والإنصات للإشارة.',
    },
    ...mainRows,
    {
      id: 'closing',
      phase: 'المرحلة الختامية',
      learningContent: 'العودة التدريجية للحالة الطبيعية وتقويم التعلم.',
      executionContent:
        'يمشي المتعلمون ببطء ويؤدون تمارين تنفس واسترخاء، ثم يجيبون عن سؤال تقويمي مرتبط بهدف الحصة قبل تنظيم الصف وجمع الوسائل.',
      durationMinutes: closingMinutes,
      guidance: 'التهدئة التدريجية، مشاركة الجميع، جمع الوسائل بأمان، واحترام آراء الزملاء.',
    },
  ];

  // الحقول القديمة محفوظة للتوافق مع قرّاء السجلات والوحدات المشتركة فقط؛ الواجهة الجديدة لا تعرضها.
  const id = ctx.classPlannedSessionId
    ? scheduledLessonMemoIdFor(ctx.classPlannedSessionId)
    : ctx.teacher?.id && session.referenceSessionId
      ? standaloneLessonMemoIdFor({
          teacherId: ctx.teacher.id,
          classId: ctx.classId,
          academicYearId: ctx.academicYearId,
          referenceSessionId: session.referenceSessionId,
        })
      : `lp_auto_${Date.now()}`;
  return {
    id,
    dailyNotebookEntryId: ctx.dailyNotebookEntryId,
    classPlannedSessionId: ctx.classPlannedSessionId,
    referenceSessionId: ctx.referenceSessionId,
    academicYearId: ctx.academicYearId,
    classId: ctx.classId,
    plannedStartTime: ctx.plannedStartTime,
    venue: ctx.venue,
    inspectorName: ctx.inspectorName || '',
    teacherId: teacher?.id || '',
    institutionName: optionalDisplayValue(teacher?.schoolName),
    teacherName: teacherDisplayName(teacher),
    levelName: ctx.levelName,
    className: ctx.className || '',
    fieldName: session.fieldName,
    competencyTitle: session.finalCompetency,
    segmentTitle: session.fieldName,
    sessionTitle: combinedObjective || session.objective,
    sessionType: session.type,
    sessionTypeNumber: session.typeLabel,
    sessionGlobalNumber: session.globalNumber,
    annualSessionRef: `التوزيع السنوي - الأسبوع ${String(session.weekNumber).padStart(2, '0')} / الحصة ${String(session.globalNumber).padStart(2, '0')}`,
    segmentGoal: session.segmentGoal,
    pedagogicalPartReferences: pedagogicalParts.map((part) => ({
      referenceSessionId: part.referenceSessionId || '',
      objectiveId: part.objectiveId,
      objectiveGroupId: part.objectiveGroupId,
      objective: part.objective,
      sessionType: part.type,
      sequenceIndex: part.globalNumber,
      fieldName: part.fieldName,
    })),
    generatedAt: new Date().toISOString(),
    generationWarnings: mainResult.warnings,
    date: ctx.date || new Date().toISOString().split('T')[0],
    durationMinutes,
    equipmentNeeded,
    equipmentChecklist: equipmentNeeded.map((name) => ({ name, available: true })),
    lessonRows,
    generalObjective: combinedObjective || session.objective,
    proceduralObjectives: { motor: '', cognitive: '' },
    warmupPhase: {
      duration: `${preparationMinutes} دقيقة`,
      generalWarmup: '',
      specificWarmup: '',
      organization: '',
    },
    mainPhase: {
      duration: `${mainMinutes} دقيقة`,
      problemSituation: '',
      learningSituation1: { title: '', description: '', dosing: '', criteria: '' },
      learningSituation2: { title: '', description: '', dosing: '', criteria: '' },
      guidedApplication: { title: '', description: '', rules: '' },
    },
    coolDownPhase: {
      duration: `${closingMinutes} دقائق`,
      activities: '',
      assessmentAndDialogue: '',
    },
    safetyRules: [],
    aiGenerated: false,
    version: 2,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a genuinely teacher-authored memo. It deliberately has no class,
 * ClassPlannedSession, annual reference, or execution status, so it cannot
 * enter the operational Daily Notebook flow.
 */
export function createIndependentLessonPlan(input: IndependentLessonMemoInput): LessonPlan {
  const createdAt = new Date().toISOString();
  const identityTimestamp = `${createdAt}-${++independentMemoSequence}`;
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes || 60));
  const budgets = lessonPhaseBudgets(input.levelName, durationMinutes);
  const objective = input.objective.trim();
  const learningContent = input.learningContent.trim() || 'محتوى التعلم الذي يحدده الأستاذ.';
  const executionContent =
    input.executionContent.trim() || 'تعليمات التنفيذ التي يحددها الأستاذ أثناء إعداد المذكرة.';
  const successCriteria = input.successCriteria.trim();
  const observationIndicators = input.observationIndicators.trim();
  const guidance = [
    successCriteria ? `معيار النجاح: ${successCriteria}` : '',
    observationIndicators ? `مؤشرات الملاحظة: ${observationIndicators}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const mainGuidance = guidance || 'يحدد الأستاذ التوجيهات ومعايير الملاحظة المناسبة.';
  const teacher = input.teacher;
  const levelIdMatch = input.levelName.match(/(الأولى|الثانية|الثالثة|الرابعة|الخامسة)/);
  const levelNumber = levelIdMatch
    ? ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'].indexOf(levelIdMatch[1]) + 1
    : 0;
  const equipment = [...new Set(input.equipment.map((item) => item.trim()).filter(Boolean))];
  const mainRow: LessonPlanRow = {
    id: 'main-1',
    phase: 'المرحلة الرئيسية',
    learningContent,
    executionContent,
    durationMinutes: budgets.main,
    guidance: mainGuidance,
  };
  return {
    id: manualStandaloneLessonMemoIdFor(teacher?.id || 'teacher', identityTimestamp),
    memoSource: 'standalone',
    inspectorName: input.inspectorName || '',
    teacherId: teacher?.id || '',
    institutionName: optionalDisplayValue(teacher?.schoolName),
    teacherName: teacherDisplayName(teacher),
    levelId: levelNumber ? `lvl_p${levelNumber}` : undefined,
    levelName: input.levelName,
    className: '',
    fieldName: input.fieldName.trim(),
    competencyTitle: '',
    segmentTitle: 'مذكرة مستقلة',
    sessionTitle: objective || 'هدف الحصة المستقلة',
    sessionType: input.sessionType,
    sessionTypeNumber: 'حصة مستقلة',
    segmentGoal: '',
    generatedAt: createdAt,
    date: createdAt.slice(0, 10),
    durationMinutes,
    equipmentNeeded: equipment,
    equipmentChecklist: equipment.map((name) => ({ name, available: true })),
    lessonRows: [
      {
        id: 'preparation',
        phase: 'المرحلة التحضيرية',
        learningContent: 'تهيئة المتعلمين وتنظيم الميدان.',
        executionContent: 'تهيئة تدريجية وتنظيم آمن قبل بداية النشاط.',
        durationMinutes: budgets.warmup,
        guidance: 'التنظيم والسلامة والإنصات للتعليمات.',
      },
      mainRow,
      {
        id: 'closing',
        phase: 'المرحلة الختامية',
        learningContent: 'تقويم التعلم والعودة التدريجية للحالة الطبيعية.',
        executionContent: 'تهدئة قصيرة وحوار تقويمي حول الهدف.',
        durationMinutes: budgets.final,
        guidance: 'مشاركة الجميع واحترام آراء المتعلمين.',
      },
    ],
    generalObjective: objective,
    proceduralObjectives: { motor: objective, cognitive: '', affective: '' },
    learningContent,
    executionInstructions: executionContent,
    successCriteria,
    observationIndicators,
    teacherNotes: input.teacherNotes.trim(),
    warmupPhase: {
      duration: `${budgets.warmup} دقيقة`,
      generalWarmup: 'تهيئة تدريجية.',
      specificWarmup: '',
      organization: 'تنظيم آمن للميدان.',
    },
    mainPhase: {
      duration: `${budgets.main} دقيقة`,
      problemSituation: '',
      learningSituation1: {
        title: learningContent,
        description: executionContent,
        dosing: '',
        criteria: successCriteria,
      },
      learningSituation2: { title: '', description: '', dosing: '', criteria: '' },
      guidedApplication: { title: '', description: '', rules: observationIndicators },
    },
    coolDownPhase: {
      duration: `${budgets.final} دقيقة`,
      activities: 'تهدئة واسترجاع.',
      assessmentAndDialogue: observationIndicators,
    },
    safetyRules: [],
    generationWarnings: [],
    aiGenerated: false,
    version: 2,
    createdAt,
  };
}

/** يعرض السجلات المنشأة قبل القالب الموحد دون تعديلها في قاعدة البيانات. */
export function getUnifiedLessonRows(plan: LessonPlan): LessonPlanRow[] {
  if (plan.lessonRows?.length) return plan.lessonRows;
  return [
    {
      id: 'preparation',
      phase: 'المرحلة التحضيرية',
      learningContent: plan.warmupPhase.generalWarmup || 'تهيئة الجسم والاستعداد للنشاط.',
      executionContent: [
        plan.warmupPhase.pedagogicalWarmupGame?.rules,
        plan.warmupPhase.specificWarmup,
      ]
        .filter(Boolean)
        .join(' '),
      durationMinutes: Math.round(plan.durationMinutes * 0.17),
      guidance: plan.warmupPhase.organization || 'الإنصات للتوجيهات والتنظيم الجيد.',
    },
    ...[plan.mainPhase.learningSituation1, plan.mainPhase.learningSituation2]
      .filter((s) => s?.description)
      .map((s, index) => ({
        id: `main-${index + 1}`,
        phase: 'المرحلة الرئيسية' as const,
        learningContent: plan.generalObjective || plan.sessionTitle,
        executionContent: s.description,
        durationMinutes: Math.round(
          (plan.durationMinutes * 0.66) /
            Math.max(
              1,
              [plan.mainPhase.learningSituation1, plan.mainPhase.learningSituation2].filter(
                (x) => x?.description
              ).length
            )
        ),
        guidance: s.criteria || 'احترام التعليمات وقواعد السلامة.',
      })),
    {
      id: 'closing',
      phase: 'المرحلة الختامية',
      learningContent: 'العودة إلى الحالة الطبيعية.',
      executionContent: plan.coolDownPhase.activities || 'مشي هادئ وتمارين تنفس.',
      durationMinutes:
        plan.durationMinutes -
        Math.round(plan.durationMinutes * 0.17) -
        Math.round(plan.durationMinutes * 0.66),
      guidance: plan.coolDownPhase.assessmentAndDialogue || 'مشاركة الجميع واحترام الآراء.',
    },
  ];
}

export interface LegacyLessonMemoDisplayRow {
  source: LessonPlanRow;
  phaseLabel: string;
  content: string;
}

/** Maps persisted rows to the single four-column memo presentation model. */
export function getLessonMemoDisplayRows(rows: LessonPlanRow[]): LegacyLessonMemoDisplayRow[] {
  let situationNumber = 0;
  return rows.map((row) => {
    const phaseLabel =
      row.phase === 'المرحلة الرئيسية'
        ? `الموقف ${String(++situationNumber).padStart(2, '0')}`
        : row.phase;
    return {
      source: row,
      phaseLabel,
      content: [row.learningContent, row.executionContent].filter(Boolean).join('\n'),
    };
  });
}

export interface LessonMemoSituation {
  id: string;
  number: number;
  executionContent: string;
  durationMinutes: number;
  guidance: string;
  sourceRow: LessonPlanRow;
}

export interface LessonMemoPhase {
  learningContent: string;
  executionContent: string;
  durationMinutes: number;
  guidance: string;
  sourceRow: LessonPlanRow;
}

export interface LessonMemoDocument {
  header: {
    institution: string;
    grade: string;
    sessionNumber: string;
    date: string;
    field: string;
    competency: string;
    objective: string;
    equipment: string[];
    durationMinutes: number;
  };
  preparatoryPhase: LessonMemoPhase;
  mainPhase: {
    learningContent: string;
    situations: LessonMemoSituation[];
    presentationMode: 'LEARNING_SITUATIONS' | 'ASSESSMENT_CIRCUIT';
    totalDurationMinutes: number;
  };
  finalPhase: LessonMemoPhase;
  signatures: { teacherName: string; inspectorName: string };
  totalDurationMinutes: number;
}

function phaseDocument(row: LessonPlanRow): LessonMemoPhase {
  return {
    learningContent: row.learningContent,
    executionContent: row.executionContent,
    durationMinutes: row.durationMinutes,
    guidance: row.guidance,
    sourceRow: row,
  };
}

/** One normalized presentation model shared by screen, print, PDF, and Word. */
export function generateLessonMemoDocument(
  plan: LessonPlan,
  overrides: { durationMinutes?: number } = {}
): LessonMemoDocument {
  const rows = getUnifiedLessonRows(plan);
  const preparation = rows.find((row) => row.phase === 'المرحلة التحضيرية') || rows[0];
  const closing =
    [...rows].reverse().find((row) => row.phase === 'المرحلة الختامية') || rows.at(-1);
  const mainRows = rows.filter((row) => row.phase === 'المرحلة الرئيسية');
  const totalDurationMinutes = overrides.durationMinutes ?? plan.durationMinutes;
  return {
    header: {
      institution: plan.institutionName,
      grade: plan.levelName,
      sessionNumber: plan.sessionGlobalNumber ? String(plan.sessionGlobalNumber) : '',
      date: plan.date,
      field: plan.fieldName,
      competency: plan.competencyTitle,
      objective: plan.sessionTitle,
      equipment: [...new Set(plan.equipmentNeeded.filter(Boolean))],
      durationMinutes: totalDurationMinutes,
    },
    preparatoryPhase: phaseDocument(preparation),
    mainPhase: {
      learningContent: [
        ...new Set(mainRows.map((row) => row.learningContent).filter(Boolean)),
      ].join('، '),
      situations: mainRows.map((row, index) => ({
        id: row.id,
        number: index + 1,
        executionContent: row.executionContent,
        durationMinutes: row.durationMinutes,
        guidance: row.guidance,
        sourceRow: row,
      })),
      presentationMode:
        plan.sessionType === 'تشخيصية' ||
        plan.sessionType === 'تقويم تشخيصي' ||
        plan.sessionType === 'تقويمية' ||
        plan.sessionType === 'تقويم تحصيلي'
          ? 'ASSESSMENT_CIRCUIT'
          : 'LEARNING_SITUATIONS',
      totalDurationMinutes: mainRows.reduce((sum, row) => sum + row.durationMinutes, 0),
    },
    finalPhase: phaseDocument(closing),
    signatures: { teacherName: plan.teacherName, inspectorName: plan.inspectorName || '' },
    totalDurationMinutes,
  };
}

/** Compatibility name retained for older callers; new code uses generateLessonMemoDocument. */
export const getLessonMemoPresentation = generateLessonMemoDocument;
