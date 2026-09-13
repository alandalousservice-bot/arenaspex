import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(file, 'utf8');

describe('daily flow acknowledged status mutation contract', () => {
  it('uses the existing ownership-checked operational PATCH and awaits the notebook mirror', () => {
    const store = read('src/hooks/usePlatformStore.ts');
    const start = store.indexOf('const handleUpdateNotebookStatus =');
    const end = store.indexOf('const handleUpdateLessonStatus =', start);
    const handler = store.slice(start, end);

    expect(handler).toContain('): Promise<void>');
    expect(handler).toContain('await updateTeacherPlanningSession(');
    expect(handler).toContain('await syncNotebookEntryToDB(nextEntry)');
    expect(handler).toContain('window.alert');
    expect(handler).toContain('dailyNotebookStatusInFlight');
    expect(handler).not.toContain('void syncNotebookEntryToDB');
  });

  it('keeps status controls on exact operational entries only', () => {
    const header = read('src/components/layout/Header.tsx');
    const schedule = read('src/components/dashboard/teacher/DailyScheduleList.tsx');

    expect(header).toContain('entry.classPlannedSessionId &&');
    expect(header).toContain('entry.classId &&');
    expect(header).toContain('entry.academicYearId &&');
    expect(header).toContain('await onUpdateNotebookStatus(entry.id,');
    expect(schedule).toContain(
      'entry.classPlannedSessionId && entry.classId && entry.academicYearId'
    );
    expect(schedule).toContain('await onUpdateNotebookStatus(entry.id, toggle.status)');
  });

  it('awaits command-center completion and notebook persistence without changing memo identity', () => {
    const commandCenter = read('src/components/lesson/LessonCommandCenterView.tsx');
    const store = read('src/hooks/usePlatformStore.ts');

    expect(commandCenter).toContain('await onCompletePlannedSession(');
    expect(commandCenter).toContain('await onAddNotebookEntry({');
    expect(store).toContain('await updateTeacherPlanningSession(classId, sessionId, { status });');
    expect(store).toContain('const handleUpdateLessonStatus =');
  });

  it('preserves class/year ownership at the server mutation boundary', () => {
    const router = read('src/server/apiRouter.ts');
    const start = router.indexOf("'/teacher/planning/classes/:classId/sessions/:sessionId'");
    const route = router.slice(start, start + 5000);

    expect(route).toContain("requireRole('teacher')");
    expect(route).toContain('id: req.params.sessionId');
    expect(route).toContain('classId: req.params.classId');
    expect(route).toContain('teacherId: req.user!.id');
    expect(route).toContain('prisma.classPlannedSession.update');
  });

  it('retains grade-specific independent operational semantics', () => {
    const timing = read('src/services/lessonTiming.service.ts');
    const planning = read('src/services/teacherPlanning.service.ts');
    const notebook = read('src/services/dailyNotebook.service.ts');

    expect(timing).toContain("input.classPlanningMode === 'TWO_45' ? 45 : 90");
    expect(timing).toContain('if (grade === 5) return 60;');
    expect(planning).toContain('const sessionsPerWeek = planningSessionsPerWeek');
    expect(planning).toContain('grade4WeeklyScheduleMode');
    expect(planning).toContain('const slotsPerWeek');
    expect(notebook).toContain('getPairedSessionInfo');
  });
});
