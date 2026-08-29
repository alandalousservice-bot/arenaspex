import { LEARNING_SEGMENTS, PE_FIELDS, PE_LEVELS } from '../data/algerianCurriculum';
import type { TeacherPlanningSession } from './api';
import { formatAcademicYearLabel } from './academicYear';
import {
  buildLessonMemoPreview,
  getPairedSessionInfo,
  sortPlanningSessions,
} from './dailyNotebook.service';
import type { ClassRoom, DailyNotebookEntry, LessonPlan, User } from '../types/spex';

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTH_LABELS = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export interface DailyNotebookPrintRow {
  sessionId: string;
  plannedDate: string;
  dayLabel: string;
  dayNumber: string;
  monthLabel: string;
  year: string;
  sessionNumber: number | null;
  pairPosition: 1 | 2 | null;
  startTime: string | null;
  durationMinutes: number;
  venue: string | null;
  sessionType: string;
  objective: string;
  domainLabel: string;
  sectionLabel: string;
  learningContent: string | null;
  memoExists: boolean;
  executionStatus: TeacherPlanningSession['status'];
  executionNote: string | null;
}

export interface DailyNotebookPrintModel {
  header: {
    institution: string;
    teacher: string;
    academicYear: string;
    level: string;
    className: string;
    domain: string;
  };
  weekStart: string;
  weekEnd: string;
  rows: DailyNotebookPrintRow[];
}

export interface DailyNotebookPrintInput {
  currentUser: User;
  selectedClass: ClassRoom;
  academicYearId: string;
  weekDates: string[];
  sessions: TeacherPlanningSession[];
  notebookEntries: DailyNotebookEntry[];
  lessonPlans: LessonPlan[];
}

function displayLevel(levelId: string): string {
  return PE_LEVELS.find((level) => level.id === levelId)?.name || '—';
}

function displayDomain(domainId: string | undefined, fieldName?: string): string {
  if (domainId === 'intro') return '—';
  return (
    PE_FIELDS.find((field) => field.id === domainId)?.name ||
    (fieldName && !fieldName.startsWith('f_') ? fieldName : '—')
  );
}

function displaySection(levelId: string, sectionId: string | undefined): string {
  if (sectionId === 'intro') return '—';
  return (
    LEARNING_SEGMENTS.find(
      (segment) => segment.levelId === levelId && segment.fieldId === sectionId
    )?.title || '—'
  );
}

function shorten(value: string, maxLength = 240): string {
  const normalized = value.trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trim()}…`
    : normalized;
}

function buildContentSummary(plan?: LessonPlan): string | null {
  const preview = buildLessonMemoPreview(plan);
  if (!preview) return null;
  const lines = [
    ...preview.situations.map((situation) =>
      shorten(`الموقف: ${situation.title}${situation.summary ? ` — ${situation.summary}` : ''}`)
    ),
    preview.contentSummary ? shorten(`المحتوى: ${preview.contentSummary}`) : null,
    preview.equipment.length > 0 ? `الوسائل: ${preview.equipment.join('، ')}` : null,
  ].filter((line): line is string => Boolean(line));
  return lines.length > 0 ? lines.slice(0, 4).join('\n') : null;
}

function dateParts(
  value: string
): Pick<DailyNotebookPrintRow, 'dayLabel' | 'dayNumber' | 'monthLabel' | 'year'> {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    dayLabel: DAY_LABELS[date.getDay()] || '—',
    dayNumber: String(day).padStart(2, '0'),
    monthLabel: MONTH_LABELS[month - 1] || '—',
    year: Number.isFinite(year) ? String(year) : '—',
  };
}

function compareSessionOrder(a: TeacherPlanningSession, b: TeacherPlanningSession): number {
  return sortPlanningSessions([a, b]).findIndex((item) => item.id === a.id) === 0 ? -1 : 1;
}

export function buildDailyNotebookPrintModel({
  currentUser,
  selectedClass,
  academicYearId,
  weekDates,
  sessions,
  notebookEntries,
  lessonPlans,
}: DailyNotebookPrintInput): DailyNotebookPrintModel {
  const weekSet = new Set(weekDates);
  const visibleSessions = sessions
    .filter(
      (session) =>
        session.teacherId === currentUser.id &&
        session.classId === selectedClass.id &&
        session.academicYearId === academicYearId &&
        weekSet.has(session.plannedDate)
    )
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || compareSessionOrder(a, b));
  const scopedSessions = sessions.filter(
    (session) =>
      session.teacherId === currentUser.id &&
      session.classId === selectedClass.id &&
      session.academicYearId === academicYearId
  );
  const entriesBySession = new Map(
    notebookEntries
      .filter(
        (entry) =>
          entry.teacherId === currentUser.id &&
          entry.classId === selectedClass.id &&
          entry.academicYearId === academicYearId &&
          Boolean(entry.classPlannedSessionId)
      )
      .map((entry) => [entry.classPlannedSessionId!, entry])
  );
  const plansBySession = new Map(
    lessonPlans
      .filter(
        (plan) =>
          plan.teacherId === currentUser.id &&
          plan.classId === selectedClass.id &&
          plan.academicYearId === academicYearId &&
          Boolean(plan.classPlannedSessionId)
      )
      .map((plan) => [plan.classPlannedSessionId!, plan])
  );
  const grade = Number(selectedClass.levelId.replace('lvl_p', ''));
  const rows = visibleSessions.map((session) => {
    const reference = session.reference;
    const entry = entriesBySession.get(session.id);
    const plan = plansBySession.get(session.id);
    const parts = dateParts(session.plannedDate);
    const pair = getPairedSessionInfo(session, scopedSessions, grade);
    return {
      sessionId: session.id,
      plannedDate: session.plannedDate,
      ...parts,
      sessionNumber: reference?.sequenceIndex ?? null,
      pairPosition: pair?.position || null,
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      venue: session.venue,
      sessionType: reference?.sessionTypeLabel || reference?.sessionType || '—',
      objective: reference?.objective || '—',
      domainLabel: displayDomain(reference?.domainId, reference?.fieldName),
      sectionLabel: displaySection(selectedClass.levelId, reference?.domainId),
      learningContent: buildContentSummary(plan),
      memoExists: Boolean(plan),
      executionStatus: session.status,
      executionNote: entry?.note?.trim() || null,
    } satisfies DailyNotebookPrintRow;
  });
  const domains = [
    ...new Set(rows.map((row) => row.domainLabel).filter((domain) => domain !== '—')),
  ];
  return {
    header: {
      institution: currentUser.schoolName || '—',
      teacher: `${currentUser.firstName} ${currentUser.lastName}`.trim() || '—',
      academicYear: formatAcademicYearLabel(academicYearId),
      level: displayLevel(selectedClass.levelId),
      className: selectedClass.name,
      domain: domains.length === 1 ? domains[0] : domains.length > 1 ? 'متعدد' : '—',
    },
    weekStart: weekDates[0] || '—',
    weekEnd: weekDates.at(-1) || '—',
    rows,
  };
}
