import type { TeacherPlanningReference, TeacherPlanningSession } from './api';
import type { ClassRoom, DailyNotebookEntry, LessonPlan } from '../types/spex';
import { parseLocalDate } from './localDate';

const NOTEBOOK_STATUSES = new Set(['منجزة', 'مؤجلة', 'غير منجزة']);
const PLANNING_STATUSES = new Set(['مبرمجة', 'منجزة', 'مؤجلة', 'غير منجزة']);

export type DailyNotebookStatus = TeacherPlanningSession['status'];

export const DAILY_NOTEBOOK_STATUS_META: Record<
  DailyNotebookStatus,
  { label: string; description: string; className: string }
> = {
  مبرمجة: {
    label: 'مبرمجة',
    description: 'لم تسجل نتيجة التنفيذ بعد.',
    className: 'bg-blue-50 text-blue-800',
  },
  منجزة: {
    label: 'منجزة',
    description: 'تم تنفيذ الحصة فعلياً.',
    className: 'bg-emerald-50 text-emerald-800',
  },
  'غير منجزة': {
    label: 'غير منجزة',
    description: 'لم تنفذ الحصة ولا توجد إعادة برمجة من هذا المسار.',
    className: 'bg-slate-100 text-slate-800',
  },
  مؤجلة: {
    label: 'مؤجلة',
    description: 'مؤجلة — تحتاج إعادة البرمجة.',
    className: 'bg-amber-50 text-amber-800',
  },
};

export interface DailyNotebookSessionDto {
  sessionId: string;
  classId: string;
  academicYearId: string;
  plannedDate: string;
  sessionNumber: number | null;
  sessionType: string | null;
  objective: string | null;
  domain: string | null;
  section: string | null;
  durationMinutes: number;
  startTime: string | null;
  venue: string | null;
  status: DailyNotebookStatus;
  executionNote: string | null;
  memoExists: boolean;
}

export function toDailyNotebookSessionDto(
  session: TeacherPlanningSession,
  details: Partial<
    Pick<
      DailyNotebookSessionDto,
      | 'sessionNumber'
      | 'sessionType'
      | 'objective'
      | 'domain'
      | 'section'
      | 'executionNote'
      | 'memoExists'
    >
  > = {}
): DailyNotebookSessionDto {
  return {
    sessionId: session.id,
    classId: session.classId,
    academicYearId: session.academicYearId,
    plannedDate: session.plannedDate,
    sessionNumber: details.sessionNumber ?? null,
    sessionType: details.sessionType ?? null,
    objective: details.objective ?? null,
    domain: details.domain ?? null,
    section: details.section ?? null,
    durationMinutes: session.durationMinutes,
    startTime: session.startTime,
    venue: session.venue,
    status: session.status,
    executionNote: details.executionNote ?? null,
    memoExists: details.memoExists ?? false,
  };
}

export function calculateExecutionProgress(
  sessions: Array<Pick<TeacherPlanningSession, 'status'>>
): { completed: number; total: number; percentage: number } {
  const total = sessions.length;
  const completed = sessions.filter((session) => session.status === 'منجزة').length;
  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export interface DailyNotebookMemoPreview {
  situations: Array<{ title: string; summary: string | null }>;
  equipment: string[];
  contentSummary: string | null;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export function buildLessonMemoPreview(plan?: LessonPlan | null): DailyNotebookMemoPreview | null {
  if (!plan) return null;
  const situations = [plan.mainPhase?.learningSituation1, plan.mainPhase?.learningSituation2]
    .filter(
      (situation) => situation && typeof situation.title === 'string' && situation.title.trim()
    )
    .map((situation) => ({
      title: situation.title.trim(),
      summary:
        typeof situation.description === 'string' && situation.description.trim()
          ? situation.description.trim()
          : null,
    }));
  const rowSummaries = Array.isArray(plan.lessonRows)
    ? plan.lessonRows
        .map((row) =>
          row && typeof row.learningContent === 'string' ? row.learningContent.trim() : ''
        )
        .filter(Boolean)
        .slice(0, 2)
    : [];
  const contentSummary = rowSummaries.length
    ? rowSummaries.join(' · ')
    : typeof plan.mainPhase?.problemSituation === 'string' && plan.mainPhase.problemSituation.trim()
      ? plan.mainPhase.problemSituation.trim()
      : null;
  const equipment = cleanList(plan.equipmentNeeded);
  return situations.length || equipment.length || contentSummary
    ? { situations, equipment, contentSummary }
    : { situations: [], equipment: [], contentSummary: null };
}

export type DailyNotebookClassFilter = 'all' | string;

export function filterPlanningSessions(
  sessions: TeacherPlanningSession[],
  classFilter: DailyNotebookClassFilter
): TeacherPlanningSession[] {
  return classFilter === 'all'
    ? [...sessions]
    : sessions.filter((session) => session.classId === classFilter);
}

export function earliestPlanningDate(sessions: TeacherPlanningSession[]): string | null {
  return sessions.reduce<string | null>(
    (earliest, session) =>
      !earliest || session.plannedDate < earliest ? session.plannedDate : earliest,
    null
  );
}

export function sortPlanningSessions(
  sessions: TeacherPlanningSession[],
  classNames?: ReadonlyMap<string, string>
): TeacherPlanningSession[] {
  return [...sessions].sort(
    (a, b) =>
      (a.startTime ? 0 : 1) - (b.startTime ? 0 : 1) ||
      (a.startTime || '').localeCompare(b.startTime || '') ||
      (classNames?.get(a.classId) || '').localeCompare(classNames?.get(b.classId) || '') ||
      (a.reference?.sequenceIndex ?? Number.MAX_SAFE_INTEGER) -
        (b.reference?.sequenceIndex ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id)
  );
}

export function countSessionsByDate(
  sessions: TeacherPlanningSession[],
  dates: string[]
): Map<string, number> {
  const counts = new Map(dates.map((date) => [date, 0]));
  sessions.forEach((session) => {
    if (counts.has(session.plannedDate))
      counts.set(session.plannedDate, (counts.get(session.plannedDate) || 0) + 1);
  });
  return counts;
}

export interface PairedSessionInfo {
  position: 1 | 2;
  total: 2;
}

export function getPairedSessionInfo(
  session: TeacherPlanningSession,
  sessions: TeacherPlanningSession[],
  grade: number
): PairedSessionInfo | null {
  const groupId = session.reference?.objectiveGroupId;
  if (grade < 1 || grade > 3 || session.reference?.sessionType !== 'تعلمية' || !groupId) {
    return null;
  }
  const pair = sessions
    .filter(
      (candidate) =>
        candidate.reference?.sessionType === 'تعلمية' &&
        candidate.reference?.objectiveGroupId === groupId
    )
    .sort(
      (a, b) =>
        (a.reference?.sequenceIndex ?? Number.MAX_SAFE_INTEGER) -
          (b.reference?.sequenceIndex ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id)
    );
  if (pair.length !== 2) return null;
  const position = pair.findIndex((candidate) => candidate.id === session.id);
  return position === 0 || position === 1 ? { position: (position + 1) as 1 | 2, total: 2 } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : stringValue(value);
}

function validDateString(value: unknown): value is string {
  return typeof value === 'string' && parseLocalDate(value) !== null;
}

function normalizeReference(value: unknown): TeacherPlanningReference | null {
  if (!isRecord(value)) return null;
  const referenceSessionId = stringValue(value.referenceSessionId);
  const domainId = stringValue(value.domainId);
  const fieldName = stringValue(value.fieldName);
  const finalCompetency = typeof value.finalCompetency === 'string' ? value.finalCompetency : null;
  const learningSectionId = stringValue(value.learningSectionId);
  const objective = stringValue(value.objective);
  const sessionType = stringValue(value.sessionType);
  const sessionTypeLabel = stringValue(value.sessionTypeLabel);
  const grade =
    typeof value.grade === 'number' && Number.isFinite(value.grade) ? value.grade : null;
  const sequenceIndex =
    typeof value.sequenceIndex === 'number' && Number.isFinite(value.sequenceIndex)
      ? value.sequenceIndex
      : null;
  const fieldSessionNumber =
    typeof value.fieldSessionNumber === 'number' && Number.isFinite(value.fieldSessionNumber)
      ? value.fieldSessionNumber
      : null;
  if (
    !referenceSessionId ||
    !domainId ||
    !fieldName ||
    finalCompetency === null ||
    !learningSectionId ||
    !objective ||
    !sessionType ||
    !sessionTypeLabel ||
    grade === null ||
    sequenceIndex === null ||
    fieldSessionNumber === null
  )
    return null;
  return {
    referenceSessionId,
    grade,
    domainId,
    fieldName,
    finalCompetency,
    learningSectionId,
    objectiveId: nullableString(value.objectiveId),
    objectiveGroupId: nullableString(value.objectiveGroupId),
    objective,
    sessionType,
    sessionTypeLabel,
    sequenceIndex,
    fieldSessionNumber,
  };
}

export function normalizePlanningSession(value: unknown): TeacherPlanningSession | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const teacherId = stringValue(value.teacherId);
  const classId = stringValue(value.classId);
  const academicYearId = stringValue(value.academicYearId);
  const referenceSessionId = stringValue(value.referenceSessionId);
  const plannedDate = validDateString(value.plannedDate) ? value.plannedDate : null;
  const durationMinutes =
    typeof value.durationMinutes === 'number' && Number.isFinite(value.durationMinutes)
      ? value.durationMinutes
      : null;
  const status = stringValue(value.status);
  if (
    !id ||
    !teacherId ||
    !classId ||
    !academicYearId ||
    !referenceSessionId ||
    !plannedDate ||
    durationMinutes === null ||
    !status ||
    !PLANNING_STATUSES.has(status)
  )
    return null;
  return {
    id,
    teacherId,
    classId,
    academicYearId,
    referenceSessionId,
    plannedDate,
    durationMinutes,
    status: status as TeacherPlanningSession['status'],
    startTime: nullableString(value.startTime),
    venue: nullableString(value.venue),
    operationalNote: nullableString(value.operationalNote),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    reference: normalizeReference(value.reference),
  };
}

export function normalizePlanningSessions(value: unknown): TeacherPlanningSession[] {
  return Array.isArray(value)
    ? value
        .map(normalizePlanningSession)
        .filter((item): item is TeacherPlanningSession => Boolean(item))
    : [];
}

export function normalizeDailyNotebookEntry(
  value: unknown,
  expectedTeacherId?: string
): DailyNotebookEntry | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const teacherId = stringValue(value.teacherId);
  const classId = stringValue(value.classId);
  const className = stringValue(value.className);
  const executionDate = validDateString(value.executionDate) ? value.executionDate : null;
  const timeSlot = stringValue(value.timeSlot);
  const status = stringValue(value.status);
  if (
    !id ||
    !teacherId ||
    (expectedTeacherId && teacherId !== expectedTeacherId) ||
    !classId ||
    !className ||
    !executionDate ||
    !timeSlot ||
    !status ||
    !NOTEBOOK_STATUSES.has(status)
  )
    return null;
  const classPlannedSessionId = nullableString(value.classPlannedSessionId) || undefined;
  const academicYearId = nullableString(value.academicYearId) || undefined;
  return {
    id,
    teacherId,
    classPlannedSessionId,
    academicYearId,
    sessionId: nullableString(value.sessionId) || undefined,
    segmentId: nullableString(value.segmentId) || undefined,
    classId,
    className,
    levelName: nullableString(value.levelName) || undefined,
    segmentTitle: nullableString(value.segmentTitle) || undefined,
    sessionTitle: nullableString(value.sessionTitle) || undefined,
    executionDate,
    timeSlot,
    status: status as DailyNotebookEntry['status'],
    note: typeof value.note === 'string' ? value.note : undefined,
    lessonPlanId: nullableString(value.lessonPlanId) || undefined,
  };
}

export function normalizeDailyNotebookEntries(value: unknown, expectedTeacherId?: string) {
  return Array.isArray(value)
    ? value
        .map((item) => normalizeDailyNotebookEntry(item, expectedTeacherId))
        .filter((item): item is DailyNotebookEntry => Boolean(item))
    : [];
}

export function normalizeClassRooms(value: unknown): ClassRoom[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is ClassRoom =>
          isRecord(item) &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.levelId === 'string'
      )
    : [];
}
