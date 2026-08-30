import {
  COMPLETE_ANNUAL_CURRICULUM,
  generateAnnualTimeDistribution,
  isValidSchoolDate,
  ScheduledAnnualSession,
} from '../data/algerianCurriculum';
import { getCurrentAcademicYear } from './academicYear';
import type { AnnualPlanObjectiveOverride } from '../types/spex';
import { normalizePrimaryLevelId, type PrimaryLevelId } from './primaryLevel.service';
import { getAcademicCalendar } from '../data/academicCalendars';

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
    generatedSessions = generateAnnualTimeDistribution(
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
        generatedSessions = generateAnnualTimeDistribution(
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
  planningStartDate: string
): ClassPlannedSessionSeed[] {
  return buildClassPlannedSessionSeedsFromCanonicalSessions(
    teacherId,
    classId,
    academicYearId,
    canonicalPlanningSessions(levelId, planningStartDate, academicYearId)
  );
}

export function buildClassPlannedSessionSeedsFromCanonicalSessions(
  teacherId: string,
  classId: string,
  academicYearId: string,
  sessions: CanonicalPlanningSession[]
): ClassPlannedSessionSeed[] {
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
