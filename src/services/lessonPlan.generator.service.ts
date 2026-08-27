import { LessonPlan, LessonPlanRow, User } from '../types/spex';
import { EducationalSituation } from '../types/spex';
import {
  findSuitableSituations,
  referenceSituations,
  snapshotSituation,
} from './educationalSituation.selector.service';

export interface AutoGenerateSessionSource {
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
  tools: string[];
}

export interface AutoGenerateContext {
  levelName: string;
  className?: string;
  teacher?: User;
  dailyNotebookEntryId?: string;
  classPlannedSessionId?: string;
  academicYearId?: string;
  classId?: string;
  plannedStartTime?: string | null;
  venue?: string | null;
  date?: string;
  durationMinutes?: number;
  previousSituationIds?: string[];
  situations?: EducationalSituation[];
}

export const lessonDurationForLevel = (levelName: string): number =>
  levelName.includes('الرابعة') ? 90 : 60;

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

function executableSituationContent(situation: EducationalSituation): string {
  const equipment = situation.equipment.length
    ? ` الوسائل المستعملة: ${situation.equipment.join('، ')}.`
    : '';
  return `الموقف: ${situation.name}. ${situation.organization.trim()}${equipment}`.trim();
}

function buildMainRows(
  session: AutoGenerateSessionSource,
  mainMinutes: number,
  ctx: AutoGenerateContext
): LessonPlanRow[] {
  const grade =
    Number(
      (ctx.levelName.match(/(الأولى|الثانية|الثالثة|الرابعة|الخامسة)/)?.[1] || '')
        .replace('الأولى', '1')
        .replace('الثانية', '2')
        .replace('الثالثة', '3')
        .replace('الرابعة', '4')
        .replace('الخامسة', '5')
    ) || 0;
  const bank = findSuitableSituations(ctx.situations || referenceSituations, {
    grade,
    fieldId: session.fieldId,
    objectiveText: session.objective,
    previousSituationIds: ctx.previousSituationIds,
  });
  if (bank.length) {
    const selected = bank.slice(
      0,
      Math.max(1, Math.min(bank.length, Math.floor(mainMinutes / 20)))
    );
    const minutes = selected.map(
      (_, index) =>
        Math.floor(mainMinutes / selected.length) + (index < mainMinutes % selected.length ? 1 : 0)
    );
    return selected.map((situation, index) => ({
      id: `main-${index + 1}`,
      phase: 'المرحلة الرئيسية',
      learningContent: session.objective,
      executionContent: executableSituationContent(situation),
      durationMinutes: minutes[index],
      guidance: situation.variations || 'احترام التنظيم والتعليمات.',
      situationSnapshot: snapshotSituation(situation),
    }));
  }
  const count = hasComplexObjective(session.objective) ? 2 : 1;
  const minutes = Array.from(
    { length: count },
    (_, index) => Math.floor(mainMinutes / count) + (index < mainMinutes % count ? 1 : 0)
  );
  const tools = session.tools.length ? session.tools : situationEquipment(session.fieldId);

  return minutes.map((durationMinutes, index) => ({
    id: `main-${index + 1}`,
    phase: 'المرحلة الرئيسية',
    learningContent:
      count === 1
        ? session.objective
        : `${session.objective} — ${index === 0 ? 'اكتساب منظم للمهارة' : 'تطوير وتوظيف التعلم'}`,
    executionContent:
      `الموقف ${String(index + 1).padStart(2, '0')}: ينظم الأستاذ المتعلمين في أفواج متوازية عند نقطة البداية. ` +
      `ينفذ كل متعلم النشاط المرتبط مباشرة بهدف الحصة (${session.objective}) عبر مسار محدد باستعمال ${tools.join('، ')}، ` +
      `ثم يعود إلى نهاية فوجه لإتاحة التناوب. يلاحظ الأستاذ التنفيذ ويصحح الأداء، مع اعتماد النجاح عند إنجاز الحركة المطلوبة باحترام المسار والتعليمات.`,
    durationMinutes,
    guidance:
      'احترام نقطة البداية والمسافة الآمنة، الإصغاء للإشارة، والتناوب المنظم بين أفراد الفوج.',
  }));
}

/** ينشئ قالباً واحداً مطابقاً لجدول المذكرة المرجعي. */
export function autoGenerateLessonPlan(
  session: AutoGenerateSessionSource,
  ctx: AutoGenerateContext
): LessonPlan {
  const durationMinutes =
    Number.isFinite(ctx.durationMinutes) && (ctx.durationMinutes || 0) > 0
      ? Math.round(ctx.durationMinutes as number)
      : lessonDurationForLevel(ctx.levelName);
  const preparationMinutes = durationMinutes === 90 ? 15 : 10;
  const closingMinutes = 10;
  const mainMinutes = durationMinutes - preparationMinutes - closingMinutes;
  const mainRows = buildMainRows(session, mainMinutes, ctx);
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
    academicYearId: ctx.academicYearId,
    classId: ctx.classId,
    plannedStartTime: ctx.plannedStartTime,
    venue: ctx.venue,
    teacherId: teacher?.id || '',
    institutionName: teacher?.schoolName || '',
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : '',
    levelName: ctx.levelName,
    className: ctx.className || '',
    fieldName: session.fieldName,
    competencyTitle: session.finalCompetency,
    segmentTitle: session.fieldName,
    sessionTitle: session.objective,
    sessionType: session.type,
    sessionTypeNumber: session.typeLabel,
    sessionGlobalNumber: session.globalNumber,
    annualSessionRef: `التوزيع السنوي - الأسبوع ${String(session.weekNumber).padStart(2, '0')} / الحصة ${String(session.globalNumber).padStart(2, '0')}`,
    segmentGoal: session.segmentGoal,
    date: ctx.date || new Date().toISOString().split('T')[0],
    durationMinutes,
    equipmentNeeded,
    equipmentChecklist: equipmentNeeded.map((name) => ({ name, available: true })),
    lessonRows,
    generalObjective: session.objective,
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

export interface LessonMemoDisplayRow {
  source: LessonPlanRow;
  phaseLabel: string;
  content: string;
}

/** Maps persisted rows to the single four-column memo presentation model. */
export function getLessonMemoDisplayRows(rows: LessonPlanRow[]): LessonMemoDisplayRow[] {
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
