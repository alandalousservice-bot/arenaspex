import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS, tabToPath } from '../src/lib/routes';

const read = (file: string) => readFileSync(file, 'utf8');

describe('canonical Teacher Attendance Book', () => {
  it('exposes a dedicated protected route and direct sidebar entry', () => {
    expect(pathToTab('/attendance')).toBe('attendance');
    expect(tabToPath('attendance')).toBe('/attendance');
    expect(ROLE_TABS.teacher).toContain('attendance');

    const sidebar = read('src/components/layout/Sidebar.tsx');
    expect(sidebar).toContain("id: 'attendance' as NavTab");
    expect(sidebar).toContain('دفتر الغياب والمواظبة');
    expect(sidebar).not.toContain('دفتر تقويم الكفاءة والحضور');
    expect(sidebar).not.toContain('assessment notebook');
  });

  it('removes the old local attendance tab from Gradebook', () => {
    const gradebook = read('src/components/gradebook/GradebookView.tsx');
    expect(gradebook).not.toContain("activeRegister === 'attendance'");
    expect(gradebook).not.toContain('selectedAttendanceDate');
    expect(gradebook).not.toContain('currentAttendanceStatus');
    expect(gradebook).toContain('دفتر التنقيط');
  });

  it('redirects legacy attendance deep links without losing context', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("location.pathname === '/gradebook'");
    expect(app).toContain("get('section') === 'attendance'");
    expect(app).toContain(
      "navigate('/attendance' + (query ? '?' + query : ''), { replace: true })"
    );
    expect(app).toContain("params.delete('section')");
    expect(app).toContain("params.delete('workspace')");
    expect(app).toContain("location.pathname === '/assessment-notebook'");
  });

  it('uses the existing planning and attendance APIs in the dedicated view', () => {
    const view = read('src/components/attendance/AttendanceBookView.tsx');
    expect(view).toContain('fetchTeacherPlanningSessions');
    expect(view).toContain('fetchTeacherAttendance');
    expect(view).toContain('saveTeacherAttendance');
    expect(view).toContain('teacherClasses');
    expect(view).toContain('students');
    expect(view).toContain('حاضر');
    expect(view).toContain('غائب');
  });

  it('keeps teacher authorization and class ownership on the existing API', () => {
    const router = read('src/server/attendanceRouter.ts');
    expect(router).toContain("requireRole('teacher')");
    expect(router).toContain('teacherId');
    expect(router).toContain('classId');
    expect(router).toContain('/teacher/planned-sessions/:sessionId/attendance');
  });

  it('moves attendance links from execution surfaces to the canonical route', () => {
    expect(read('src/components/notebook/DailyNotebookView.tsx')).toContain(
      "'/attendance?classId='"
    );
    expect(read('src/App.tsx')).toContain("'/attendance?classId='");
    expect(read('src/components/lesson/LessonCommandCenterView.tsx')).toContain('onOpenAttendance');
  });
});
