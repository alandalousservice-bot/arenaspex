import {
  Grade4WeeklyScheduleMode,
  LessonPhaseName,
  LessonPlan,
  LessonPlanRow,
  User,
} from '../types/spex';
import { EducationalSituation } from '../types/spex';
import {
  findSuitableSituations,
  referenceSituations,
  selectEducationalSituations,
  snapshotSituation,
} from './educationalSituation.selector.service';
import {
  lessonPhaseBudgetsForDuration,
  resolveOperationalLessonDuration,
} from './lessonTiming.service';

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
  objectiveGroupId?: string | null;
  tools: string[];
}

export interface AutoGenerateContext {
  levelName: string;
  className?: string;
  teacher?: User;
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
  grade4WeeklyScheduleMode?: Grade4WeeklyScheduleMode | null;
  pedagogicalParts?: AutoGenerateSessionSource[];
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

export type LessonMemoGenerationWarningCode =
  | 'NO_ELIGIBLE_SITUATION'
  | 'INTEGRATIVE_COVERAGE_INCOMPLETE'
  | 'ASSESSMENT_COVERAGE_MISSING'
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
  INTEGRATIVE_COVERAGE_INCOMPLETE: {
    message: 'المواقف المتاحة لا تغطي جميع الأهداف الإدماجية المطلوبة.',
    action: 'راجع المواقف المقترحة أو اختر مواقفًا إضافية يدويًا.',
  },
  ASSESSMENT_COVERAGE_MISSING: {
    message: 'لم تتوفر مواقف تقويمية كافية لسياق التقويم المحدد.',
    action: 'اختر موقفًا تقويميًا مناسبًا يدويًا قبل الحفظ النهائي.',
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
  mainMinutes: number,
  ctx: AutoGenerateContext
): { rows: LessonPlanRow[]; warnings: LessonMemoGenerationWarning[] } {
  const pedagogicalParts = ctx.pedagogicalParts?.length ? ctx.pedagogicalParts : [session];
  const objectiveIds = pedagogicalParts
    .map((part) => part.objectiveId)
    .filter((value): value is string => Boolean(value));
  const objectiveTexts = pedagogicalParts.map((part) => part.objective).filter(Boolean);
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
  let selectionWarningCodes: string[] = [];
  let selectionFailureCode: string | undefined;
  const bank =
    pedagogicalParts.length > 1
      ? (() => {
          const selection = selectEducationalSituations(availableSituations, {
            gradeId: grade,
            domainId: session.fieldId,
            lessonType: 'LEARNING',
            objectiveIds,
            objectiveText: session.objective,
            durationMinutes: mainMinutes,
            previousSituationIds: ctx.previousSituationIds,
            maxSituations: 3,
          });
          selectionWarningCodes = selection.warnings;
          selectionFailureCode = selection.failureCode;
          return selection.selectedSituations;
        })()
      : findSuitableSituations(availableSituations, {
          grade,
          fieldId: session.fieldId,
          objectiveId: session.objectiveId || undefined,
          objectiveIds,
          objectiveText: session.objective,
          objectiveTexts,
          previousSituationIds: ctx.previousSituationIds,
        });
  if (!bank.length && !selectionFailureCode) selectionFailureCode = 'NO_ELIGIBLE_SITUATION';
  const warnings = generationWarnings([
    ...selectionWarningCodes,
    ...(selectionFailureCode ? [selectionFailureCode] : []),
  ]);
  if (bank.length) {
    const selected = bank.slice(
      0,
      Math.max(1, Math.min(bank.length, Math.floor(mainMinutes / 20)))
    );
    const minutes = selected.map(
      (_, index) =>
        Math.floor(mainMinutes / selected.length) + (index < mainMinutes % selected.length ? 1 : 0)
    );
    return {
      rows: selected.map((situation, index) => ({
        id: `main-${index + 1}`,
        phase: 'المرحلة الرئيسية',
        learningContent: situation.name,
        executionContent: formatSituationExecution(situation),
        durationMinutes: minutes[index],
        guidance: situation.variations || 'احترام التنظيم والتعليمات.',
        situationSnapshot: snapshotSituation(situation),
      })),
      warnings,
    };
  }
  const count = hasComplexObjective(session.objective) ? 2 : 1;
  const minutes = Array.from(
    { length: count },
    (_, index) => Math.floor(mainMinutes / count) + (index < mainMinutes % count ? 1 : 0)
  );
  const tools = session.tools.length ? session.tools : situationEquipment(session.fieldId);

  return {
    rows: minutes.map((durationMinutes, index) => ({
      id: `main-${index + 1}`,
      phase: 'المرحلة الرئيسية',
      learningContent: `اختيار موقف تربوي يدويًا ${String(index + 1).padStart(2, '0')}`,
      executionContent: `لم يتوفر موقف معتمد مطابق تلقائيًا. اختر موقفًا مناسبًا من بنك المواقف قبل اعتماد هذه المسودة. الوسائل المتوقعة: ${tools.join('، ')}.`,
      durationMinutes,
      guidance: 'تظل هذه الخانة معلقة إلى حين اختيار موقف مطابق والتحقق من التعليمات والسلامة.',
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
  const phaseBudgets = lessonPhaseBudgetsForDuration(durationMinutes);
  const preparationMinutes = phaseBudgets.warmup;
  const closingMinutes = phaseBudgets.final;
  const mainMinutes = phaseBudgets.main;
  const mainResult = buildMainRows(session, mainMinutes, ctx);
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
  return {
    id: ctx.classPlannedSessionId
      ? `lp_session_${ctx.classPlannedSessionId}`
      : `lp_auto_${Date.now()}`,
    dailyNotebookEntryId: ctx.dailyNotebookEntryId,
    classPlannedSessionId: ctx.classPlannedSessionId,
    referenceSessionId: ctx.referenceSessionId,
    academicYearId: ctx.academicYearId,
    classId: ctx.classId,
    plannedStartTime: ctx.plannedStartTime,
    venue: ctx.venue,
    inspectorName: ctx.inspectorName || '',
    teacherId: teacher?.id || '',
    institutionName: teacher?.schoolName || '',
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : '',
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
      totalDurationMinutes: mainRows.reduce((sum, row) => sum + row.durationMinutes, 0),
    },
    finalPhase: phaseDocument(closing),
    signatures: { teacherName: plan.teacherName, inspectorName: plan.inspectorName || '' },
    totalDurationMinutes,
  };
}

/** Compatibility name retained for older callers; new code uses generateLessonMemoDocument. */
export const getLessonMemoPresentation = generateLessonMemoDocument;
