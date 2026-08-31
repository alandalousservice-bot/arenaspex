import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { TeacherPlanningSession } from '../src/services/api';
import {
  calculateExecutionProgress,
  countSessionsByDate,
  earliestPlanningDate,
  filterPlanningSessions,
  sortPlanningSessions,
} from '../src/services/dailyNotebook.service';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');
const router = readFileSync('src/server/apiRouter.ts', 'utf8');

function session(
  id: string,
  classId: string,
  plannedDate: string,
  startTime: string | null = null,
  sequenceIndex = 1
): TeacherPlanningSession {
  return {
    id,
    teacherId: 'teacher-1',
    classId,
    academicYearId: '2026-2027',
    referenceSessionId: `reference-${id}`,
    plannedDate,
    durationMinutes: 60,
    status: 'مبرمجة',
    startTime,
    venue: null,
    operationalNote: null,
    createdAt: '',
    updatedAt: '',
    reference: {
      referenceSessionId: `reference-${id}`,
      grade: 1,
      domainId: 'f_locomotion',
      fieldName: 'الوضعيات والتنقلات',
      finalCompetency: 'كفاءة',
      learningSectionId: 'lvl_p1:f_locomotion',
      objectiveId: null,
      objectiveGroupId: null,
      objective: 'هدف تعلمي',
      sessionType: 'تعلمية',
      sessionTypeLabel: 'تعلمية',
      sequenceIndex,
      fieldSessionNumber: sequenceIndex,
    },
  };
}

const sessions = [
  session('a-1', 'class-a', '2026-09-07', '08:00'),
  session('b-1', 'class-b', '2026-09-07', '08:00'),
  session('a-2', 'class-a', '2026-09-08'),
];

describe('Daily Notebook all-classes day view', () => {
  it('uses all as the neutral class filter', () => {
    expect(filterPlanningSessions(sessions, 'all')).toHaveLength(3);
  });

  it('filters a specific class without changing the source array', () => {
    expect(filterPlanningSessions(sessions, 'class-a').map((item) => item.id)).toEqual([
      'a-1',
      'a-2',
    ]);
    expect(sessions).toHaveLength(3);
  });

  it('keeps every owned class represented in all mode', () => {
    expect(new Set(filterPlanningSessions(sessions, 'all').map((item) => item.classId))).toEqual(
      new Set(['class-a', 'class-b'])
    );
  });

  it('returns an empty result for an empty all-class response', () => {
    expect(filterPlanningSessions([], 'all')).toEqual([]);
  });

  it('returns an empty result for an unknown specific class', () => {
    expect(filterPlanningSessions(sessions, 'class-missing')).toEqual([]);
  });

  it('finds the earliest date for initial date anchoring', () => {
    expect(earliestPlanningDate([sessions[2], sessions[0]])).toBe('2026-09-07');
  });

  it('finds the earliest date after applying a specific class filter', () => {
    expect(earliestPlanningDate(filterPlanningSessions(sessions, 'class-a'))).toBe('2026-09-07');
    expect(earliestPlanningDate(filterPlanningSessions(sessions, 'class-b'))).toBe('2026-09-07');
  });

  it('does not invent an earliest date when no planning sessions exist', () => {
    expect(earliestPlanningDate([])).toBeNull();
  });

  it('sorts timed sessions by start time first', () => {
    expect(sortPlanningSessions([sessions[1], sessions[0]]).map((item) => item.id)).toEqual([
      'a-1',
      'b-1',
    ]);
  });

  it('sorts same-time sessions by display class name', () => {
    const names = new Map([
      ['class-a', 'السنة الأولى أ'],
      ['class-b', 'السنة الأولى ب'],
    ]);
    expect(sortPlanningSessions([sessions[1], sessions[0]], names).map((item) => item.id)).toEqual([
      'a-1',
      'b-1',
    ]);
  });

  it('sorts sessions without times by class before canonical sequence', () => {
    const names = new Map([
      ['class-a', 'أ'],
      ['class-b', 'ب'],
    ]);
    const first = session('b-2', 'class-b', '2026-09-07', null, 1);
    const second = session('a-2', 'class-a', '2026-09-07', null, 9);
    expect(sortPlanningSessions([first, second], names).map((item) => item.id)).toEqual([
      'a-2',
      'b-2',
    ]);
  });

  it('counts all classes in the week strip in all mode', () => {
    const counts = countSessionsByDate(filterPlanningSessions(sessions, 'all'), [
      '2026-09-07',
      '2026-09-08',
    ]);
    expect([...counts.values()]).toEqual([2, 1]);
  });

  it('counts only the selected class after filtering', () => {
    const counts = countSessionsByDate(filterPlanningSessions(sessions, 'class-a'), [
      '2026-09-07',
      '2026-09-08',
    ]);
    expect([...counts.values()]).toEqual([1, 1]);
  });

  it('keeps execution progress mathematically valid for all loaded sessions', () => {
    const completed = { ...sessions[0], status: 'منجزة' as const };
    expect(calculateExecutionProgress([completed, sessions[1]])).toEqual({
      completed: 1,
      total: 2,
      percentage: 50,
    });
  });

  it('exposes the teacher-wide API contract', () => {
    expect(api).toContain('TeacherPlanningAllSessionsResponse');
    expect(api).toContain('fetchTeacherPlanningSessionsForTeacher');
    expect(api).toContain('/api/teacher/planning/sessions?');
  });

  it('protects the teacher-wide route with teacher authorization', () => {
    expect(router).toContain("'/teacher/planning/sessions'");
    expect(router).toContain("requireRole('teacher')");
  });

  it('loads only classes owned by the current teacher', () => {
    expect(router).toContain('where: { teacherId: req.user!.id }');
  });

  it('loads all selected-year sessions in one classPlannedSession query', () => {
    expect(router).toContain('academicYearId: parsed.data.academicYearId');
    expect(router).toContain('classId: { in: classes.map((classRecord) => classRecord.id) }');
  });

  it('returns class contexts alongside sessions', () => {
    expect(router).toContain('classes,');
    expect(router).toContain('sessions: rows.map');
  });

  it('resolves each session reference using its own class level', () => {
    expect(router).toContain('classesById.get(row.classId)?.levelId');
    expect(router).toContain('referenceByLevel');
  });

  it('defaults the UI to all classes when there is no valid deep-linked class', () => {
    expect(notebook).toContain(": 'all'");
    expect(notebook).toContain('const [classFilter, setClassFilter]');
  });

  it('exposes the all-classes selector option', () => {
    expect(notebook).toContain('<option value="all">كل الأقسام</option>');
  });

  it('uses the teacher-wide request instead of one request per class', () => {
    expect(notebook).toContain('fetchTeacherPlanningSessionsForTeacher(academicYearId)');
    expect(notebook).not.toContain('safeTeacherClasses.map((item) => fetch');
  });

  it('renders each card from the session class context', () => {
    expect(notebook).toContain('const sessionClass = classForSession(session);');
    expect(notebook).toContain('القسم: {sessionClass?.name');
  });

  it('binds status persistence to the exact session class and id', () => {
    expect(notebook).toContain(
      'updateTeacherPlanningSession(session.classId, session.id, { status })'
    );
  });

  it('binds memo navigation to the exact session class and id', () => {
    expect(notebook).toContain(
      '`/lesson-plans?classId=${encodeURIComponent(session.classId)}&classPlannedSessionId='
    );
  });

  it('keeps the introductory-session memo rule in the all-class view', () => {
    expect(notebook).toContain('isLessonMemoEligible(reference || {})');
    expect(notebook).toContain('حصة تنظيمية بدون مذكرة');
  });

  it('keeps print output class-specific and disabled in all mode', () => {
    expect(notebook).toContain('selectedClass\n        ? buildDailyNotebookPrintModel');
    expect(notebook).toContain("classFilter === 'all' &&");
    expect(notebook).toContain('اختر قسماً محدداً لطباعة الكراس اليومي');
  });

  it('shows neutral all-mode daily counts instead of a class progress claim', () => {
    expect(notebook).toContain('حصص اليوم: {displayed.length}');
    expect(notebook).toContain("classFilter !== 'all'");
  });

  it('keeps the date stable when the class filter changes', () => {
    expect(notebook).toContain('setClassFilter(event.target.value)');
    expect(notebook).toContain('initializedDateYears');
    expect(notebook).not.toContain('setSelectedDate(earliest);');
  });

  it('anchors an initial before-school date only to the first loaded planning date', () => {
    expect(notebook).toContain('earliestPlanningDate(safeSessions)');
    expect(notebook).toContain('current < earliest ? earliest : current');
    expect(notebook).toContain(
      '!requestedDate && !initializedDateYears.current.has(academicYearId)'
    );
  });

  it('has distinct all-day and class-day empty-state branches', () => {
    expect(notebook).toContain('لا توجد حصة محفوظة للأقسام المحددة في التاريخ المحدد.');
    expect(notebook).toContain('لا توجد حصة محفوظة لهذا القسم في التاريخ المحدد.');
  });

  it('keeps the no-planning-year state separate from an empty day', () => {
    expect(notebook).toContain('لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.');
    expect(notebook).toContain('sessions.length === 0');
    expect(notebook).toContain('displayed.length === 0');
  });

  it('saves notes with the exact session class and session identity', () => {
    expect(notebook).toContain('classId: session.classId');
    expect(notebook).toContain('classPlannedSessionId: session.id');
    expect(notebook).toContain('const sessionClass = classForSession(session);');
  });

  it('opens attendance for the exact session class and session', () => {
    expect(notebook).toContain("'/attendance?classId=' +");
    expect(notebook).toContain('encodeURIComponent(session.classId)');
    expect(notebook).toContain('encodeURIComponent(session.id)');
  });

  it('opens assessment for the exact session class and session', () => {
    expect(notebook).toContain("'/gradebook?classId=' +");
    expect(notebook).toContain("reference.sessionType === 'تقويم تشخيصي'");
  });

  it('keeps diagnostic sessions memo-eligible while excluding intro sessions', () => {
    expect(notebook).toContain('const memoEligible = isLessonMemoEligible(reference || {});');
    expect(notebook).toContain('memoEligible ?');
    expect(notebook).toContain('حصة تنظيمية بدون مذكرة');
  });

  it('reloads by academic year without changing the filter model', () => {
    expect(notebook).toContain('setAcademicYearId(event.target.value)');
    expect(notebook).toContain('[academicYearId, classFilter');
  });

  it('does not persist a synthetic all class or alter persistence schema', () => {
    expect(notebook).not.toContain("classId: 'all'");
    expect(notebook).toContain('classId: session.classId');
    expect(readFileSync('prisma/schema.prisma', 'utf8')).not.toContain('DailyNotebookAllClasses');
  });
});
