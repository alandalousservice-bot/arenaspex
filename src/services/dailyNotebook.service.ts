import type { TeacherPlanningReference, TeacherPlanningSession } from './api';
import type { ClassRoom, DailyNotebookEntry } from '../types/spex';
import { parseLocalDate } from './localDate';

const NOTEBOOK_STATUSES = new Set(['منجزة', 'مؤجلة', 'غير منجزة']);
const PLANNING_STATUSES = new Set(['مبرمجة', 'منجزة', 'مؤجلة', 'غير منجزة']);

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
