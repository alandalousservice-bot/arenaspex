import {
  COMPLETE_ANNUAL_CURRICULUM,
  generateAnnualPedagogicalTimeDistribution,
  isValidSchoolDate,
  ScheduledAnnualSession,
} from '../data/algerianCurriculum';
import { getCurrentAcademicYear } from './academicYear';
import type { AnnualPlanObjectiveOverride } from '../types/spex';
import { normalizePrimaryLevelId, type PrimaryLevelId } from './primaryLevel.service';
import { getAcademicCalendar, isValidAcademicSchoolDate } from '../data/academicCalendars';

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

function gradeFromLevelId(levelId: PrimaryLevelId): number {
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

function introReferenceSessionId(levelId: string, plannedDate: string, startTime: string): string {
  return `${levelId}:intro:${plannedDate}:${startTime}`;
}

export function isIntroReferenceSessionId(value: string): boolean {
  return value.includes(':intro:') || /:intro:sequence:\d+$/.test(value);
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

export function canonicalPlanningSessions(
  levelId: unknown,
  planningStartDate: string,
  academicYearId?: string,
  teachingDayOfWeek = 0
): CanonicalPlanningSession[] {
  const canonicalLevelId = normalizePrimaryLevelId(levelId);
  if (!canonicalLevelId) return [];

  const curriculum = COMPLETE_ANNUAL_CURRICULUM[canonicalLevelId];
  const grade = gradeFromLevelId(canonicalLevelId);
  if (!curriculum || !grade || !/^\d{4}-\d{2}-\d{2}$/.test(planningStartDate)) return [];

  let generatedSessions: ScheduledAnnualSession[];
  try {
    generatedSessions = generateAnnualPedagogicalTimeDistribution(
      canonicalLevelId,
      planningStartDate,
      teachingDayOfWeek,
      '',
      academicYearId
    );
  } catch (error) {
    if (!academicYearId || teachingDayOfWeek !== 0) throw error;
    let fallbackError = error;
    for (const fallbackDay of [1, 2, 3, 4]) {
      try {
        generatedSessions = generateAnnualPedagogicalTimeDistribution(
          canonicalLevelId,
          planningStartDate,
          fallbackDay,
          '',
          academicYearId
        );
        fallbackError = null;
        break;
      } catch (nextError) {
        fallbackError = nextError;
      }
    }
    if (fallbackError || !generatedSessions!) throw fallbackError;
  }

  return generatedSessions.map((session) => ({
    referenceSessionId: referenceSessionIdFor(session),
    levelId: session.levelId,
    grade,
    domainId: session.fieldId,
    learningSectionId:
      session.fieldId === 'intro' ? 'intro' : `${session.levelId}:${session.fieldId}`,
    objectiveId: session.objectiveGroupId || null,
    objectiveGroupId: session.objectiveGroupId || null,
    sequenceIndex: session.globalSessionNumber,
    fieldSessionNumber: session.fieldSessionNumber,
    sessionType: session.sessionType,
    sessionTypeLabel: session.sessionTypeLabel,
    objective: session.targetObjective,
    plannedDate: session.scheduledDate,
    durationMinutes: session.durationMinutes,
    isIntro: false,
  }));
}

function expectedSessionCount(levelId: PrimaryLevelId): number {
  return levelId === 'lvl_p1' || levelId === 'lvl_p2' || levelId === 'lvl_p3' ? 56 : 34;
}

function buildLevelDistribution(
  levelId: PrimaryLevelId,
  planningStartDate: string,
  academicYearId: string
): AnnualLevelDistribution {
  let lastError = 'لا توجد سعة تقويمية كافية ضمن السنة الدراسية المحددة.';
  for (const teachingDayOfWeek of [0, 1, 2, 3, 4]) {
    try {
      const sessions = canonicalPlanningSessions(
        levelId,
        planningStartDate,
        academicYearId,
        teachingDayOfWeek
      );
      if (sessions.length !== expectedSessionCount(levelId)) {
        lastError = 'لا توجد سعة تقويمية كافية لتوليد جميع الحصص المطلوبة.';
        continue;
      }
      const durationMinutes = sessions[0]?.durationMinutes || 0;
      return {
        levelId,
        grade: Number(levelId.slice(-1)),
        sessionCount: sessions.length,
        annualHours: sessions.reduce((total, session) => total + session.durationMinutes, 0) / 60,
        firstSessionDate: sessions[0]?.plannedDate || null,
        lastSessionDate: sessions.at(-1)?.plannedDate || null,
        durationMinutes,
        sessions,
        status: 'generated',
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
  planningStartDate: string
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
      buildLevelDistribution(levelId, planningStartDate, academicYearId)
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

export function canonicalReferenceSessions(levelId: string): CanonicalPlanningSession[] {
  const startYear = getCurrentAcademicYear().slice(0, 4);
  return canonicalPlanningSessions(levelId, startYear + '-09-01');
}

export function buildClassPlannedSessionSeeds(
  teacherId: string,
  classId: string,
  academicYearId: string,
  levelId: unknown,
  planningStartDate: string,
  weeklySlots?: WeeklyTimetablePlanningSlot[]
): ClassPlannedSessionSeed[] {
  return buildClassPlannedSessionSeedsFromCanonicalSessions(
    teacherId,
    classId,
    academicYearId,
    canonicalPlanningSessions(levelId, planningStartDate, academicYearId),
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

/**
 * Materialize the operational introduction layer and then the pedagogical
 * sequence on chronological occurrences of the class's persisted weekly
 * slots. Each valid timetable occurrence is consumed once, and no fallback
 * weekday is allowed.
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
  const pedagogicalOccurrences: Array<{ plannedDate: string; startTime: string }> = [];
  for (
    let weekIndex = 0;
    weekIndex < 80 && pedagogicalOccurrences.length < sessions.length;
    weekIndex += 1
  ) {
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
      pedagogicalOccurrences.push({ plannedDate: requestedDate, startTime: slot.startTime });
      if (pedagogicalOccurrences.length === sessions.length) break;
    }
  }
  if (pedagogicalOccurrences.length < sessions.length) {
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
      ...sessions.map((session, index) => {
        const occurrence = pedagogicalOccurrences[index];
        return {
          id: `cps_${classId}_${academicYearId}_${session.referenceSessionId}`,
          teacherId,
          classId,
          academicYearId,
          referenceSessionId: session.referenceSessionId,
          plannedDate: toDate(occurrence.plannedDate),
          durationMinutes: session.durationMinutes,
          status: 'مبرمجة' as const,
          startTime: occurrence.startTime,
          venue: null,
          operationalNote: null,
        };
      }),
    ],
  };
}

export function findCanonicalPlanningSession(
  levelId: string,
  referenceSessionId: string,
  planningStartDate: string
): CanonicalPlanningSession | null {
  return (
    canonicalPlanningSessions(levelId, planningStartDate).find(
      (session) => session.referenceSessionId === referenceSessionId
    ) || null
  );
}
