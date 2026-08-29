import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const notebook = readFileSync('src/components/notebook/DailyNotebookView.tsx', 'utf8');
const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
const types = readFileSync('src/types/spex.ts', 'utf8');
const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
const dashboard = readFileSync('src/components/dashboard/TeacherDashboard.tsx', 'utf8');
const schedule = readFileSync('src/components/dashboard/teacher/DailyScheduleList.tsx', 'utf8');

describe('teacher daily notebook session binding', () => {
  it('uses persisted class-planned sessions and supports exact deep links', () => {
    expect(notebook).toContain('fetchTeacherPlanningSessions');
    expect(notebook).toContain('classPlannedSessionId');
    expect(notebook).toContain("query.get('classPlannedSessionId')");
    expect(notebook).toContain('لم يتم إنشاء التوزيع السنوي لهذا القسم بعد.');
    expect(notebook).not.toContain('SAMPLE_PE_SESSIONS');
  });

  it('keeps reference content separate from operational execution data', () => {
    expect(notebook).toContain('canonicalReferenceSessions');
    expect(apiRouter).toContain('operationalNote');
    expect(notebook).toContain('حفظ الملاحظة');
    expect(types).toContain('classPlannedSessionId?: string;');
  });

  it('upserts notebook entries idempotently by the planned-session identity', () => {
    expect(store).toContain('handleUpsertNotebookEntry');
    expect(store).toContain('item.classPlannedSessionId === entry.classPlannedSessionId');
    expect(store).toContain('syncNotebookEntryToDB(nextEntry)');
  });

  it('enforces teacher, class, and academic-year ownership on the server', () => {
    expect(apiRouter).toContain('validateNotebookSession');
    expect(apiRouter).toContain('id: item.classPlannedSessionId');
    expect(apiRouter).toContain('academicYearId: item.academicYearId');
    expect(apiRouter).toContain('teacherId: user.id');
  });

  it('feeds dashboard today metrics from persisted planning sessions', () => {
    expect(dashboard).toContain('fetchTeacherPlanningSessions');
    expect(dashboard).toContain('plannedDate.slice(0, 10) === today');
    expect(schedule).toContain('plannedSessions');
  });
});
