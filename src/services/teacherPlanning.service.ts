import {
  COMPLETE_ANNUAL_CURRICULUM,
  isValidSchoolDate,
  ScheduledAnnualSession,
} from '../data/algerianCurriculum';
import { getCurrentAcademicYear } from './academicYear';
import type { AnnualPlanObjectiveOverride } from '../types/spex';
import { normalizePrimaryLevelId, type PrimaryLevelId } from './primaryLevel.service';
import { getAcademicCalendar, isValidAcademicSchoolDate } from '../data/academicCalendars';
import type { TeacherLearningPlanData } from '../types/spex';
import {
  resolveTeacherLearningPlan,
  type TeacherLearningPlan,
} from './teacherLearningPlan.service';

export { normalizePrimaryLevelId } from './primaryLevel.service';

export interface ClassPlannedSessionSeed {
  id: string;
  teacherId: string;
  classId: string;
  academicYearId: string;
  referenceSessionId: string;
  plannedDate: Date;
  durationMinutes: number;
  status: ScheduledAnnualSession['status'];
  startTime: string | null;
  venue: string | null;
  operationalNote: string | null;
}

export interface WeeklyTimetablePlanningSlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface TimetableMaterializationResult {
  seeds: ClassPlannedSessionSeed[];
  error?: string;
}

export interface CanonicalPlanningSession {
  referenceSessionId: string;
  levelId: string;
  grade: number;
  domainId: string;
  learningSectionId: string;
  objectiveId: string | null;
  objectiveGroupId: string | null;
  sequenceIndex: number;
  fieldSessionNumber: number;
  sessionType: ScheduledAnnualSession['sessionType'];
  sessionTypeLabel: string;
  objective: string;
  plannedDate: string;
  durationMinutes: number;
  fieldName?: string;
  finalCompetency?: string;
  isIntro?: boolean;
}

export type PlanningWordingOverrides = Record<string, AnnualPlanObjectiveOverride>;

export const PRIMARY_PLANNING_LEVEL_IDS: PrimaryLevelId[] = [
  'lvl_p1',
  'lvl_p2',
  'lvl_p3',
  'lvl_p4',
  'lvl_p5',
];

export interface AnnualLevelDistribution {
  levelId: PrimaryLevelId;
  grade: number;
  sessionCount: number;
  annualHours: number;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  durationMinutes: number;
  sessions: CanonicalPlanningSession[];
  status: 'generated' | 'failed';
  error?: string;
}

export interface AnnualDistributionPedagogicalMeeting {
  meetingIndex: 1 | 2;
  referenceSessionId: string;
}

export interface AnnualDistributionPedagogicalUnit {
  referenceSessionId: string;
  sessionType: CanonicalPlanningSession['sessionType'];
  sessionTypeLabel: string;
  fieldId: string;
  fieldName: string;
  objective: string;
  objectiveId: string | null;
  objectiveGroupId: string | null;
  meetingCount: 1 | 2;
  meetings: AnnualDistributionPedagogicalMeeting[];
  durationMinutes: number;
}

export interface AnnualDistributionWeeklySlot {
  referenceSessionId: string;
  sourceUnitReferenceSessionId: string;
  sessionType: CanonicalPlanningSession['sessionType'];
  sessionTypeLabel: string;
  displayLabel: string;
  fieldId: string;
  fieldName: string;
  objectiveId: string | null;
  objectiveGroupId: string | null;
  meetingIndex: 1 | 2 | null;
  durationMinutes: number;
}

export interface AnnualDistributionWeek {
  weekIndex: number;
  weekLabel: string;
  isIntro: boolean;
  pedagogicalUnits: AnnualDistributionPedagogicalUnit[];
  slots: AnnualDistributionWeeklySlot[];
}

type AnnualDistributionReferenceOverride = Partial<
  Pick<
    CanonicalPlanningSession,
    'fieldName' | 'objective' | 'sessionTypeLabel' | 'objectiveId' | 'objectiveGroupId'
  >
>;

function annualDistributionUnitSource(
  session: CanonicalPlanningSession,
  referenceFor?: (session: CanonicalPlanningSession) => AnnualDistributionReferenceOverride
): AnnualDistributionReferenceOverride {
  return referenceFor?.(session) || {};
}

/**
 * Builds the level/week pedagogical read model. Dates and operational
 * timetable fields are deliberately not part of this representation.
 */
export function buildAnnualDistributionWeeks(
  level: AnnualLevelDistribution,
  referenceFor?: (session: CanonicalPlanningSession) => AnnualDistributionReferenceOverride
): AnnualDistributionWeek[] {
  const introUnit: AnnualDistributionPedagogicalUnit = {
    referenceSessionId: `${level.levelId}:intro:week:1`,
    sessionType: 'تعارف وتنظيم',
    sessionTypeLabel: 'تعارف، تنظيم واتصال',
    fieldId: 'intro',
    fieldName: 'أسبوع التعارف والتنظيم',
    objective: 'تعارف، تنظيم واتصال مع التلاميذ',
    objectiveId: null,
    objectiveGroupId: 'intro_week',
    meetingCount: 1,
    meetings: [],
    durationMinutes: level.durationMinutes,
  };
  const weeks: AnnualDistributionWeek[] = [
    {
      weekIndex: 1,
      weekLabel: 'الأسبوع الأول',
      isIntro: true,
      pedagogicalUnits: [introUnit],
      slots: [
        {
          referenceSessionId: introUnit.referenceSessionId,
          sourceUnitReferenceSessionId: introUnit.referenceSessionId,
          sessionType: introUnit.sessionType,
          sessionTypeLabel: introUnit.sessionTypeLabel,
          displayLabel: 'حصة تعارف وتنظيم',
          fieldId: introUnit.fieldId,
          fieldName: introUnit.fieldName,
          objectiveId: introUnit.objectiveId,
          objectiveGroupId: introUnit.objectiveGroupId,
          meetingIndex: null,
          durationMinutes: introUnit.durationMinutes,
        },
      ],
    },
  ];

  const gradeUsesLearningPairs = level.grade >= 1 && level.grade <= 4;
  const units: AnnualDistributionPedagogicalUnit[] = [];
  for (let index = 0; index < level.sessions.length; index += 1) {
    const session = level.sessions[index];
    const next = level.sessions[index + 1];
    const source = annualDistributionUnitSource(session, referenceFor);
    const isCanonicalPair =
      gradeUsesLearningPairs &&
      session.sessionType === 'تعلمية' &&
      next?.sessionType === 'تعلمية' &&
      Boolean(session.objectiveGroupId) &&
      session.objectiveGroupId === next.objectiveGroupId;
    const meetingCount: 1 | 2 = gradeUsesLearningPairs && session.sessionType === 'تعلمية' ? 2 : 1;
    const firstReference = session.referenceSessionId;
    const secondReference = isCanonicalPair
      ? next!.referenceSessionId
      : `${firstReference}:meeting:2`;
    const objective = source.objective || session.objective;
    const objectiveGroupId = source.objectiveGroupId ?? session.objectiveGroupId ?? null;
    units.push({
      referenceSessionId: firstReference,
      sessionType: session.sessionType,
      sessionTypeLabel: source.sessionTypeLabel || session.sessionTypeLabel,
      fieldId: session.domainId,
      fieldName: source.fieldName || session.fieldName || session.domainId,
      objective,
      objectiveId: source.objectiveId ?? session.objectiveId,
      objectiveGroupId,
      meetingCount,
      meetings:
        meetingCount === 2
          ? [
              { meetingIndex: 1, referenceSessionId: firstReference },
              { meetingIndex: 2, referenceSessionId: secondReference },
            ]
          : [],
      durationMinutes: session.durationMinutes,
    });
    if (isCanonicalPair) index += 1;
  }

  const slots = units.flatMap<AnnualDistributionWeeklySlot>((unit) => {
    if (unit.meetingCount === 1) {
      return [
        {
          referenceSessionId: unit.referenceSessionId,
          sourceUnitReferenceSessionId: unit.referenceSessionId,
          sessionType: unit.sessionType,
          sessionTypeLabel: unit.sessionTypeLabel,
          displayLabel: unit.sessionTypeLabel,
          fieldId: unit.fieldId,
          fieldName: unit.fieldName,
          objectiveId: unit.objectiveId,
          objectiveGroupId: unit.objectiveGroupId,
          meetingIndex: null,
          durationMinutes: unit.durationMinutes,
        },
      ];
    }
    return unit.meetings.map((meeting) => ({
      referenceSessionId: meeting.referenceSessionId,
      sourceUnitReferenceSessionId: unit.referenceSessionId,
      sessionType: unit.sessionType,
      sessionTypeLabel: unit.sessionTypeLabel,
      displayLabel: `${unit.sessionTypeLabel} (${meeting.meetingIndex === 1 ? 'أ' : 'ب'})`,
      fieldId: unit.fieldId,
      fieldName: unit.fieldName,
      objectiveId: unit.objectiveId,
      objectiveGroupId: unit.objectiveGroupId,
      meetingIndex: meeting.meetingIndex,
      durationMinutes: unit.durationMinutes,
    }));
  });

  let weekIndex = 2;
  let slotIndex = 0;
  const seenUnitReferences = new Set<string>();
  while (slotIndex < slots.length) {
    const weekSlots = slots.slice(slotIndex, slotIndex + (level.grade <= 4 ? 2 : 1));
    const pedagogicalUnits = units.filter((unit) => {
      if (seenUnitReferences.has(unit.referenceSessionId)) return false;
      if (
        !weekSlots.some((slot) => slot.sourceUnitReferenceSessionId === unit.referenceSessionId)
      ) {
        return false;
      }
      seenUnitReferences.add(unit.referenceSessionId);
      return true;
    });
    weeks.push({
      weekIndex,
      weekLabel: `الأسبوع ${weekIndex}`,
      isIntro: false,
      pedagogicalUnits,
      slots: weekSlots,
    });
    weekIndex += 1;
    slotIndex += weekSlots.length;
  }
  return weeks;
}

export function annualDistributionUnitSummary(weeks: AnnualDistributionWeek[]) {
  const units = [
    ...new Map(
      weeks
        .flatMap((week) => week.pedagogicalUnits)
        .map((unit) => [unit.referenceSessionId, unit] as const)
    ).values(),
  ];
  const slots = weeks.flatMap((week) => week.slots);
  return {
    weekCount: weeks.length,
    pedagogicalUnitCount: units.length,
    learningUnitCount: units.filter((unit) => unit.sessionType === 'تعلمية').length,
    meetingCount: slots.length,
  };
}

export interface PersistedAnnualDistributionOverride {
  date?: string;
}

export type ClassSessionRebuildDecision = 'create' | 'update' | 'preserve' | 'conflict';

/** Apply only validated persisted date overrides to the canonical level document. */
export function applyPersistedAnnualDistributionDates(
  level: AnnualLevelDistribution,
  overrides: Record<string, PersistedAnnualDistributionOverride> | undefined,
  isAllowedDate: (value: string) => boolean
): AnnualLevelDistribution {
  if (!overrides || level.status !== 'generated') return level;
  return {
    ...level,
    sessions: level.sessions.map((session) => {
      const date = overrides[session.referenceSessionId]?.date;
      return date && isAllowedDate(date) ? { ...session, plannedDate: date } : session;
    }),
  };
}

export function decideClassSessionRebuild(
  existing: { status: string; plannedDate: Date } | null,
  nextDate: Date,
  hasExecutionDependencies: boolean,
  preLaunchRebuild: boolean
): ClassSessionRebuildDecision {
  if (!existing) return 'create';
  const dateChanged = existing.plannedDate.getTime() !== nextDate.getTime();
  if (existing.status === 'منجزة' && hasExecutionDependencies && dateChanged) return 'conflict';
  if (existing.status === 'منجزة' && !preLaunchRebuild && dateChanged) return 'conflict';
  if (existing.status === 'منجزة' && hasExecutionDependencies) return 'preserve';
  if (existing.status === 'منجزة' && !preLaunchRebuild) return 'preserve';
  return 'update';
}

export function effectivePlanningObjective(
  session: Pick<CanonicalPlanningSession, 'domainId' | 'objectiveId' | 'objective'>,
  overrides: PlanningWordingOverrides = {}
): string {
  if (!session.objectiveId || session.domainId === 'intro') return session.objective;
  return overrides[session.objectiveId]?.objective?.trim() || session.objective;
}

export function effectiveCurriculumObjective(
  fieldId: string,
  sessionNumber: number,
  referenceObjective: string,
  overrides: PlanningWordingOverrides = {}
): string {
  return overrides[`${fieldId}__${sessionNumber}`]?.objective?.trim() || referenceObjective;
}

function gradeFromLevelId(levelId: string): number {
  const grade = Number(levelId.replace('lvl_p', ''));
  return Number.isInteger(grade) && grade >= 1 && grade <= 5 ? grade : 0;
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatPlanningDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addPlanningDays(value: string, days: number): string {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatPlanningDate(date);
}

function weekStartFor(value: string): string {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return formatPlanningDate(date);
}

const INTRO_SESSION_TYPE = 'تعارف وتنظيم' as const;
const INTRO_SESSION_TYPE_LABEL = 'تعارف، تنظيم واتصال';
const INTRO_SESSION_OBJECTIVE = 'تعارف، تنظيم واتصال مع التلاميذ';
const MEETING_REFERENCE_SUFFIX = ':meeting:';

function introReferenceSessionId(levelId: string, plannedDate: string, startTime: string): string {
  return `${levelId}:intro:${plannedDate}:${startTime}`;
}

export function isIntroReferenceSessionId(value: string): boolean {
  return value.includes(':intro:') || /:intro:sequence:\d+$/.test(value);
}

export function basePlanningReferenceId(value: string): string {
  return value.replace(/:meeting:[12]$/, '');
}

export function introPlanningReference(
  levelId: string,
  referenceSessionId: string
): CanonicalPlanningSession | null {
  const normalizedLevelId = normalizePrimaryLevelId(levelId);
  if (!normalizedLevelId || !isIntroReferenceSessionId(referenceSessionId)) return null;
  const grade = gradeFromLevelId(normalizedLevelId);
  if (!grade) return null;
  return {
    referenceSessionId,
    levelId: normalizedLevelId,
    grade,
    domainId: 'intro',
    fieldName: 'أسبوع التعارف والتنظيم',
    finalCompetency: '',
    learningSectionId: 'intro',
    objectiveId: null,
    objectiveGroupId: 'intro_group',
    sequenceIndex: 0,
    fieldSessionNumber: 0,
    sessionType: INTRO_SESSION_TYPE,
    sessionTypeLabel: INTRO_SESSION_TYPE_LABEL,
    objective: INTRO_SESSION_OBJECTIVE,
    plannedDate: '',
    durationMinutes: grade <= 3 ? 60 : grade === 4 ? 90 : 60,
    isIntro: true,
  };
}

function introWeekWindow(academicYearId: string): { startDate: string; endDate: string } {
  const startDate = getAcademicCalendar(academicYearId).schoolStart;
  return {
    startDate,
    endDate: addPlanningDays(weekStartFor(startDate), 4),
  };
}

export function referenceSessionIdFor(session: ScheduledAnnualSession): string {
  return `${session.levelId}:${session.fieldId}:sequence:${session.globalSessionNumber}`;
}

type TeacherPlanSequenceItem = {
  levelId: string;
  levelName: string;
  grade: number;
  domainId: string;
  fieldName: string;
  finalCompetency: string;
  sessionType: CanonicalPlanningSession['sessionType'];
  sessionTypeLabel: string;
  objective: string;
  objectiveId: string | null;
  objectiveGroupId: string | null;
  fieldSessionNumber: number;
  referenceKey: string;
};

function officialSessionText(
  field: (typeof COMPLETE_ANNUAL_CURRICULUM)[string]['fields'][string],
  type: 'تقويم تشخيصي' | 'إدماجية' | 'تقويم تحصيلي',
  label?: string
): string {
  return (
    field.sessionsList.find(
      (session) => session.type === type && (!label || session.typeLabel === label)
    )?.objective ||
    (type === 'تقويم تشخيصي'
      ? 'تقويم تشخيصي أولي لمكتسبات التلاميذ'
      : type === 'تقويم تحصيلي'
        ? 'تقويم تحصيلي لمكتسبات المتعلمين'
        : 'توظيف المكتسبات في وضعية إدماجية.')
  );
}

function teacherPlanSequence(
  levelId: string,
  plan: TeacherLearningPlan
): TeacherPlanSequenceItem[] {
  const curriculum = COMPLETE_ANNUAL_CURRICULUM[levelId];
  const grade = gradeFromLevelId(levelId);
  if (!curriculum || !grade) return [];
  const sequence: TeacherPlanSequenceItem[] = [];
  const fieldOrder = ['f_locomotion', 'f_fundamentals', 'f_structuring'];

  for (const fieldId of fieldOrder) {
    const field = curriculum.fields[fieldId];
    const domain = plan.domains.find((item) => item.fieldId === fieldId);
    if (!field || !domain) continue;
    let fieldSessionNumber = 1;
    const add = (
      sessionType: TeacherPlanSequenceItem['sessionType'],
      sessionTypeLabel: string,
      objective: string,
      objectiveId: string | null,
      objectiveGroupId: string | null,
      referenceKey: string
    ) => {
      sequence.push({
        levelId,
        levelName: curriculum.levelName,
        grade,
        domainId: fieldId,
        fieldName: field.fieldName,
        finalCompetency: field.finalCompetency,
        sessionType,
        sessionTypeLabel,
        objective,
        objectiveId,
        objectiveGroupId,
        fieldSessionNumber: fieldSessionNumber++,
        referenceKey,
      });
    };

    add(
      'تقويم تشخيصي',
      'تقويم تشخيصي',
      officialSessionText(field, 'تقويم تشخيصي'),
      null,
      `teacher-diagnostic:${levelId}:${fieldId}`,
      'diagnostic'
    );

    const secondIntegration = domain.integrationPoints.find((point) => point.label === 'إدماجية 2');
    const integrationsByObjective = new Map<string | null, typeof domain.integrationPoints>();
    for (const point of [...domain.integrationPoints]
      .filter((item) => item.label !== 'إدماجية 2')
      .sort((left, right) => left.orderIndex - right.orderIndex)) {
      const points = integrationsByObjective.get(point.afterObjectiveId) || [];
      points.push(point);
      integrationsByObjective.set(point.afterObjectiveId, points);
    }
    const addIntegrations = (afterObjectiveId: string | null) => {
      for (const point of integrationsByObjective.get(afterObjectiveId) || []) {
        add(
          'إدماجية',
          point.label,
          officialSessionText(field, 'إدماجية', point.label),
          null,
          point.id,
          `integration:${point.id}`
        );
      }
    };

    addIntegrations(null);
    domain.objectives.forEach((objective, objectiveIndex) => {
      const objectiveLabel = `تعلمية ${objectiveIndex + 1}`;
      const meetingCount = grade <= 4 ? 2 : 1;
      for (let meetingIndex = 1; meetingIndex <= meetingCount; meetingIndex += 1) {
        add(
          'تعلمية',
          objectiveLabel,
          objective.text,
          objective.id,
          objective.id,
          meetingCount === 1
            ? `objective:${objective.id}`
            : `objective:${objective.id}:meeting:${meetingIndex}`
        );
      }
      addIntegrations(objective.id);
    });
    if (secondIntegration) {
      add(
        'إدماجية',
        secondIntegration.label,
        officialSessionText(field, 'إدماجية', secondIntegration.label),
        null,
        secondIntegration.id,
        `integration:${secondIntegration.id}`
      );
    }
    add(
      'تقويم تحصيلي',
      'تقويم تحصيلي',
      officialSessionText(field, 'تقويم تحصيلي'),
      null,
      `teacher-summative:${levelId}:${fieldId}`,
      'summative'
    );
  }
  return sequence;
}

interface AnnualScheduleSlot {
  desiredDate: Date;
  actualDate: Date;
}

function nextValidPlanningDate(from: string, academicYearId?: string): string {
  let value = from;
  for (let guard = 0; guard < 365; guard += 1) {
    const valid = academicYearId
      ? (() => {
          const calendar = getAcademicCalendar(academicYearId);
          const endDate = calendar.schoolEnd || `${academicYearId.slice(5)}-08-31`;
          return (
            value >= calendar.schoolStart &&
            value <= endDate &&
            isValidAcademicSchoolDate(value, academicYearId)
          );
        })()
      : isValidSchoolDate(toDate(value));
    if (valid) return value;
    value = addPlanningDays(value, 1);
  }
  throw new Error('لا توجد سعة تقويمية كافية لتوليد التوزيع السنوي ضمن السنة المحددة.');
}

function buildBoundedAnnualSchedule(
  count: number,
  startDateStr: string,
  sessionsPerWeek: number,
  academicYearId: string
): AnnualScheduleSlot[] {
  const slots: AnnualScheduleSlot[] = [];
  let weekAnchor = nextValidPlanningDate(startDateStr, academicYearId);
  let slotInWeek = 0;
  let lastActualDate: Date | null = null;
  for (let index = 0; index < count; index += 1) {
    const desiredDate = toDate(
      sessionsPerWeek > 1 && slotInWeek === 1 ? addPlanningDays(weekAnchor, 2) : weekAnchor
    );
    let actualDate = toDate(nextValidPlanningDate(formatPlanningDate(desiredDate), academicYearId));
    if (lastActualDate && actualDate <= lastActualDate) {
      actualDate = toDate(
        nextValidPlanningDate(formatPlanningDate(lastActualDate), academicYearId)
      );
      actualDate = toDate(
        nextValidPlanningDate(addPlanningDays(formatPlanningDate(actualDate), 1), academicYearId)
      );
    }
    slots.push({ desiredDate, actualDate });
    lastActualDate = actualDate;
    if (sessionsPerWeek > 1 && slotInWeek === 0) {
      slotInWeek = 1;
    } else {
      slotInWeek = 0;
      if (index < count - 1)
        weekAnchor = nextValidPlanningDate(addPlanningDays(weekAnchor, 7), academicYearId);
    }
  }
  return slots;
}

function buildUnboundedAnnualSchedule(
  count: number,
  startDateStr: string,
  sessionsPerWeek: number
): AnnualScheduleSlot[] {
  const slots: AnnualScheduleSlot[] = [];
  let weekAnchor = nextValidPlanningDate(startDateStr);
  let slotInWeek = 0;
  for (let index = 0; index < count; index += 1) {
    const desiredDate = toDate(
      sessionsPerWeek > 1 && slotInWeek === 1 ? addPlanningDays(weekAnchor, 2) : weekAnchor
    );
    const actualDate = toDate(nextValidPlanningDate(formatPlanningDate(desiredDate)));
    slots.push({ desiredDate, actualDate });
    if (sessionsPerWeek > 1 && slotInWeek === 0) {
      slotInWeek = 1;
    } else {
      slotInWeek = 0;
      if (index < count - 1) weekAnchor = nextValidPlanningDate(addPlanningDays(weekAnchor, 7));
    }
  }
  return slots;
}

export function canonicalPlanningSessions(
  levelId: unknown,
  planningStartDate: string,
  academicYearId?: string,
  _teachingDayOfWeek = 0,
  teacherLearningPlan?: TeacherLearningPlanData | TeacherLearningPlan
): CanonicalPlanningSession[] {
  const canonicalLevelId = normalizePrimaryLevelId(levelId);
  if (!canonicalLevelId) return [];

  const curriculum = COMPLETE_ANNUAL_CURRICULUM[canonicalLevelId];
  const grade = gradeFromLevelId(canonicalLevelId);
  if (!curriculum || !grade || !/^\d{4}-\d{2}-\d{2}$/.test(planningStartDate)) return [];
  const plan = resolveTeacherLearningPlan(canonicalLevelId, teacherLearningPlan);
  const sequence = teacherPlanSequence(canonicalLevelId, plan);
  const sessionsPerWeek = grade <= 4 ? 2 : 1;
  const minimumPedagogicalDate = academicYearId
    ? addPlanningDays(weekStartFor(getAcademicCalendar(academicYearId).schoolStart), 7)
    : planningStartDate;
  const scheduleStartDate =
    planningStartDate > minimumPedagogicalDate ? planningStartDate : minimumPedagogicalDate;
  const schedule = academicYearId
    ? buildBoundedAnnualSchedule(
        sequence.length,
        scheduleStartDate,
        sessionsPerWeek,
        academicYearId
      )
    : buildUnboundedAnnualSchedule(sequence.length, scheduleStartDate, sessionsPerWeek);

  return sequence.map((item, index) => {
    const slot = schedule[index];
    const referenceSessionId = `${canonicalLevelId}:${item.domainId}:${item.referenceKey}`;
    return {
      referenceSessionId,
      levelId: canonicalLevelId,
      grade,
      domainId: item.domainId,
      learningSectionId: `${canonicalLevelId}:${item.domainId}`,
      objectiveId: item.objectiveId,
      objectiveGroupId: item.objectiveGroupId,
      sequenceIndex: index + 1,
      fieldSessionNumber: item.fieldSessionNumber,
      sessionType: item.sessionType,
      sessionTypeLabel: item.sessionTypeLabel,
      objective: item.objective,
      plannedDate: formatPlanningDate(slot.actualDate),
      durationMinutes: grade === 4 ? 90 : 60,
      fieldName: item.fieldName,
      finalCompetency: item.finalCompetency,
      isIntro: false,
    };
  });
}

function buildLevelDistribution(
  levelId: PrimaryLevelId,
  planningStartDate: string,
  academicYearId: string,
  teacherLearningPlan?: TeacherLearningPlanData | TeacherLearningPlan
): AnnualLevelDistribution {
  let lastError = 'لا توجد سعة تقويمية كافية ضمن السنة الدراسية المحددة.';
  for (const teachingDayOfWeek of [0, 1, 2, 3, 4]) {
    try {
      const sessions = canonicalPlanningSessions(
        levelId,
        planningStartDate,
        academicYearId,
        teachingDayOfWeek,
        teacherLearningPlan
      );
      if (!sessions.length) {
        lastError = 'لا توجد حصص بيداغوجية قابلة للتوليد للمستوى المحدد.';
        continue;
      }
      const durationMinutes = sessions[0]?.durationMinutes || 0;
      const baseLevel: AnnualLevelDistribution = {
        levelId,
        grade: Number(levelId.slice(-1)),
        sessionCount: 0,
        annualHours: sessions.reduce((total, session) => total + session.durationMinutes, 0) / 60,
        firstSessionDate: sessions[0]?.plannedDate || null,
        lastSessionDate: sessions.at(-1)?.plannedDate || null,
        durationMinutes,
        sessions,
        status: 'generated',
      };
      return {
        ...baseLevel,
        sessionCount: annualDistributionUnitSummary(buildAnnualDistributionWeeks(baseLevel))
          .pedagogicalUnitCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  return {
    levelId,
    grade: Number(levelId.slice(-1)),
    sessionCount: 0,
    annualHours: 0,
    firstSessionDate: null,
    lastSessionDate: null,
    durationMinutes: levelId === 'lvl_p4' ? 90 : 60,
    sessions: [],
    status: 'failed',
    error: lastError,
  };
}

export function generateAllPrimaryLevelDistributions(
  academicYearId: string,
  planningStartDate: string,
  teacherLearningPlans?: Map<string, TeacherLearningPlanData | TeacherLearningPlan>
): {
  academicYearId: string;
  planningStartDate: string;
  endDate: string;
  levels: AnnualLevelDistribution[];
} {
  const calendar = getAcademicCalendar(academicYearId);
  const endDate = calendar.schoolEnd || `${academicYearId.slice(5)}-08-31`;
  return {
    academicYearId,
    planningStartDate,
    endDate,
    levels: PRIMARY_PLANNING_LEVEL_IDS.map((levelId) =>
      buildLevelDistribution(
        levelId,
        planningStartDate,
        academicYearId,
        teacherLearningPlans?.get(levelId)
      )
    ),
  };
}

export function isValidPlanningDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return formatDateForPlanning(date) === value && isValidSchoolDate(date);
}

function formatDateForPlanning(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canonicalReferenceSessions(
  levelId: string,
  teacherLearningPlan?: TeacherLearningPlanData | TeacherLearningPlan
): CanonicalPlanningSession[] {
  const startYear = getCurrentAcademicYear().slice(0, 4);
  return canonicalPlanningSessions(
    levelId,
    startYear + '-09-01',
    undefined,
    0,
    teacherLearningPlan
  );
}

export function buildClassPlannedSessionSeeds(
  teacherId: string,
  classId: string,
  academicYearId: string,
  levelId: unknown,
  planningStartDate: string,
  weeklySlots?: WeeklyTimetablePlanningSlot[],
  teacherLearningPlan?: TeacherLearningPlanData | TeacherLearningPlan
): ClassPlannedSessionSeed[] {
  return buildClassPlannedSessionSeedsFromCanonicalSessions(
    teacherId,
    classId,
    academicYearId,
    canonicalPlanningSessions(levelId, planningStartDate, academicYearId, 0, teacherLearningPlan),
    weeklySlots
  );
}

export function buildClassPlannedSessionSeedsFromCanonicalSessions(
  teacherId: string,
  classId: string,
  academicYearId: string,
  sessions: CanonicalPlanningSession[],
  weeklySlots?: WeeklyTimetablePlanningSlot[]
): ClassPlannedSessionSeed[] {
  if (weeklySlots) {
    return materializeClassPlannedSessionSeedsFromTimetable(
      teacherId,
      classId,
      academicYearId,
      sessions,
      weeklySlots
    ).seeds;
  }
  return sessions.map((session) => ({
    id: `cps_${classId}_${academicYearId}_${session.referenceSessionId}`,
    teacherId,
    classId,
    academicYearId,
    referenceSessionId: session.referenceSessionId,
    plannedDate: toDate(session.plannedDate),
    durationMinutes: session.durationMinutes,
    status: 'مبرمجة',
    startTime: null,
    venue: null,
    operationalNote: null,
  }));
}

interface PedagogicalOperationalUnit {
  session: CanonicalPlanningSession;
  canonicalSessions: CanonicalPlanningSession[];
  meetingCount: 1 | 2;
}

interface TimetableOccurrence {
  plannedDate: string;
  startTime: string;
  weekday: number;
  weekStart: string;
}

function pedagogicalOperationalUnits(
  sessions: CanonicalPlanningSession[],
  grade: number
): PedagogicalOperationalUnit[] {
  const units: PedagogicalOperationalUnit[] = [];
  for (let index = 0; index < sessions.length; index += 1) {
    const session = sessions[index];
    const next = sessions[index + 1];
    const hasCanonicalPair =
      grade <= 4 &&
      session.sessionType === 'تعلمية' &&
      next?.sessionType === 'تعلمية' &&
      Boolean(session.objectiveGroupId) &&
      session.objectiveGroupId === next.objectiveGroupId;
    if (hasCanonicalPair) {
      units.push({ session, canonicalSessions: [session, next], meetingCount: 2 });
      index += 1;
      continue;
    }

    units.push({
      session,
      canonicalSessions: [session],
      meetingCount: grade >= 1 && grade <= 4 && session.sessionType === 'تعلمية' ? 2 : 1,
    });
  }
  return units;
}

function operationalReferenceIdsForUnit(unit: PedagogicalOperationalUnit): string[] {
  if (unit.meetingCount === 1) return [unit.session.referenceSessionId];
  if (unit.canonicalSessions.length >= 2) {
    return unit.canonicalSessions.slice(0, 2).map((session) => session.referenceSessionId);
  }
  return [
    unit.session.referenceSessionId,
    `${unit.session.referenceSessionId}${MEETING_REFERENCE_SUFFIX}2`,
  ];
}

/**
 * Materialize the operational introduction layer and then typed pedagogical
 * occurrences on the class's persisted weekly slots. Learning objectives in
 * grades 1–4 consume two different timetable weekdays; all other pedagogical
 * session types consume one occurrence, and grade 5 always consumes one.
 */
export function materializeClassPlannedSessionSeedsFromTimetable(
  teacherId: string,
  classId: string,
  academicYearId: string,
  sessions: CanonicalPlanningSession[],
  weeklySlots: WeeklyTimetablePlanningSlot[]
): TimetableMaterializationResult {
  const slots = weeklySlots
    .filter(
      (slot) =>
        Number.isInteger(slot.weekday) &&
        slot.weekday >= 0 &&
        slot.weekday <= 4 &&
        /^\d{2}:\d{2}$/.test(slot.startTime) &&
        /^\d{2}:\d{2}$/.test(slot.endTime)
    )
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  if (!slots.length) {
    return { seeds: [], error: 'لا يمكن إنشاء حصص القسم قبل ضبط توقيته الأسبوعي.' };
  }

  const calendar = getAcademicCalendar(academicYearId);
  const planningEndDate = calendar.schoolEnd || `${academicYearId.slice(5)}-08-31`;
  const levelId = sessions[0]?.levelId;
  if (!levelId) return { seeds: [], error: 'لا يمكن تحديد مستوى الحصص التشغيلية.' };

  const { startDate: introStartDate, endDate: introEndDate } = introWeekWindow(academicYearId);
  const introOccurrences: Array<{ plannedDate: string; startTime: string }> = [];
  for (
    let requestedDate = introStartDate;
    requestedDate <= introEndDate;
    requestedDate = addPlanningDays(requestedDate, 1)
  ) {
    const weekday = toDate(requestedDate).getUTCDay();
    for (const slot of slots.filter((item) => item.weekday === weekday)) {
      if (!isValidAcademicSchoolDate(requestedDate, academicYearId)) continue;
      introOccurrences.push({ plannedDate: requestedDate, startTime: slot.startTime });
    }
  }

  const firstPedagogicalDate = sessions[0]?.plannedDate || addPlanningDays(introEndDate, 3);
  const pedagogicalWeekStart = weekStartFor(firstPedagogicalDate);
  const pedagogicalOccurrences: TimetableOccurrence[] = [];
  for (let weekIndex = 0; weekIndex < 80; weekIndex += 1) {
    for (const slot of slots) {
      const requestedDate = addPlanningDays(pedagogicalWeekStart, weekIndex * 7 + slot.weekday);
      if (
        requestedDate < firstPedagogicalDate ||
        requestedDate < calendar.schoolStart ||
        requestedDate > planningEndDate
      ) {
        continue;
      }
      // A holiday consumes no occurrence; the same weekday resumes next week.
      if (!isValidAcademicSchoolDate(requestedDate, academicYearId)) continue;
      pedagogicalOccurrences.push({
        plannedDate: requestedDate,
        startTime: slot.startTime,
        weekday: slot.weekday,
        weekStart: weekStartFor(requestedDate),
      });
    }
  }

  const units = pedagogicalOperationalUnits(sessions, gradeFromLevelId(levelId));
  const assignments: Array<{
    unit: PedagogicalOperationalUnit;
    occurrences: TimetableOccurrence[];
  }> = [];
  let occurrenceCursor = 0;
  for (const unit of units) {
    if (unit.meetingCount === 1) {
      const occurrence = pedagogicalOccurrences[occurrenceCursor];
      if (!occurrence) break;
      assignments.push({ unit, occurrences: [occurrence] });
      occurrenceCursor += 1;
      continue;
    }

    let pair: [TimetableOccurrence, TimetableOccurrence] | null = null;
    let pairEndIndex = -1;
    for (
      let firstIndex = occurrenceCursor;
      firstIndex < pedagogicalOccurrences.length;
      firstIndex += 1
    ) {
      const first = pedagogicalOccurrences[firstIndex];
      const secondIndex = pedagogicalOccurrences.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex > firstIndex &&
          candidate.weekStart === first.weekStart &&
          candidate.weekday !== first.weekday
      );
      if (secondIndex >= 0) {
        pair = [first, pedagogicalOccurrences[secondIndex]];
        pairEndIndex = secondIndex;
        break;
      }
    }
    if (!pair) break;
    assignments.push({ unit, occurrences: pair });
    occurrenceCursor = pairEndIndex + 1;
  }

  if (assignments.length < units.length) {
    return {
      seeds: [],
      error: 'لا توجد حصص أسبوعية كافية لمطابقة كامل التوزيع السنوي لهذا القسم.',
    };
  }

  return {
    seeds: [
      ...introOccurrences.map((occurrence) => {
        const referenceSessionId = introReferenceSessionId(
          levelId,
          occurrence.plannedDate,
          occurrence.startTime
        );
        return {
          id: `cps_${classId}_${academicYearId}_${referenceSessionId}`,
          teacherId,
          classId,
          academicYearId,
          referenceSessionId,
          plannedDate: toDate(occurrence.plannedDate),
          durationMinutes: sessions[0]?.durationMinutes || 60,
          status: 'مبرمجة' as const,
          startTime: occurrence.startTime,
          venue: null,
          operationalNote: null,
        };
      }),
      ...assignments.flatMap(({ unit, occurrences }) => {
        const referenceSessionIds = operationalReferenceIdsForUnit(unit);
        return occurrences.map((occurrence, meetingIndex) => {
          const referenceSessionId = referenceSessionIds[meetingIndex];
          return {
            id: `cps_${classId}_${academicYearId}_${referenceSessionId}`,
            teacherId,
            classId,
            academicYearId,
            referenceSessionId,
            plannedDate: toDate(occurrence.plannedDate),
            durationMinutes: unit.session.durationMinutes,
            status: 'مبرمجة' as const,
            startTime: occurrence.startTime,
            venue: null,
            operationalNote: null,
          };
        });
      }),
    ],
  };
}

export function findCanonicalPlanningSession(
  levelId: string,
  referenceSessionId: string,
  planningStartDate: string,
  teacherLearningPlan?: TeacherLearningPlanData | TeacherLearningPlan
): CanonicalPlanningSession | null {
  return (
    canonicalPlanningSessions(levelId, planningStartDate, undefined, 0, teacherLearningPlan).find(
      (session) => session.referenceSessionId === referenceSessionId
    ) || null
  );
}
