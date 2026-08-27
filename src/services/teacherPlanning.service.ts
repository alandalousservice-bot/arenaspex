import {
  COMPLETE_ANNUAL_CURRICULUM,
  generateAnnualTimeDistribution,
  isValidSchoolDate,
  ScheduledAnnualSession,
} from '../data/algerianCurriculum';
import { getCurrentAcademicYear } from './academicYear';
import type { AnnualPlanObjectiveOverride } from '../types/spex';

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

export function referenceSessionIdFor(session: ScheduledAnnualSession): string {
  return `${session.levelId}:${session.fieldId}:sequence:${session.globalSessionNumber}`;
}

export function canonicalPlanningSessions(
  levelId: string,
  planningStartDate: string
): CanonicalPlanningSession[] {
  const curriculum = COMPLETE_ANNUAL_CURRICULUM[levelId];
  const grade = gradeFromLevelId(levelId);
  if (!curriculum || !grade || !/^\d{4}-\d{2}-\d{2}$/.test(planningStartDate)) return [];

  return generateAnnualTimeDistribution(levelId, planningStartDate, 0, '').map((session) => ({
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
  levelId: string,
  planningStartDate: string
): ClassPlannedSessionSeed[] {
  return canonicalPlanningSessions(levelId, planningStartDate).map((session) => ({
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
