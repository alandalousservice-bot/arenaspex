import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToTab, ROLE_TABS, tabToPath } from '../src/lib/routes';

const read = (file: string) => readFileSync(file, 'utf8');

describe('canonical Teacher Students Book', () => {
  it('exposes exactly the canonical route and teacher navigation entry', () => {
    const sidebar = read('src/components/layout/Sidebar.tsx');
    const routes = read('src/lib/routes.ts');
    expect(pathToTab('/students')).toBe('students');
    expect(pathToTab('/students/std_1')).toBe('students');
    expect(tabToPath('students')).toBe('/students');
    expect(ROLE_TABS.teacher).toContain('students');
    expect(sidebar).toContain("id: 'gradebook' as NavTab, label: 'دفتر التنقيط'");
    expect(sidebar).toContain("id: 'attendance' as NavTab, label: 'دفتر الغياب والمواظبة'");
    expect(sidebar).toContain("id: 'students' as NavTab, label: 'دفتر التلاميذ'");
    expect(sidebar).not.toContain('دفتر تقويم الكفاءة والحضور');
    expect(routes).toContain("students: '/students'");
  });

  it('keeps roster counts authoritative and selected-class driven', () => {
    const book = read('src/components/students/StudentsBookView.tsx');
    const readModel = read('src/services/studentRosterReadModel.service.ts');
    expect(book).toContain('students.filter((s) => s.classId === activeClass.id)');
    expect(book).toContain('students.filter((s) => s.classId === cls.id).length');
    expect(readModel).toContain('studentCount: counts.get(item.id) || 0');
  });

  it('keeps import, preview, refresh, and authoritative exemptions in Students Book', () => {
    const book = read('src/components/students/StudentsBookView.tsx');
    expect(book).toContain('previewStudentRoster');
    expect(book).toContain('confirmStudentRosterImport');
    expect(book).toContain('onRefreshRoster');
    expect(book).toContain('fetchTeacherMedicalExemptions');
    expect(book).toContain('createTeacherMedicalExemption');
    expect(book).toContain('deleteTeacherMedicalExemption');
    expect(book).not.toContain('localStorage.getItem');
  });

  it('opens a protected student follow-up with persisted assessment, attendance, and exemption sources', () => {
    const app = read('src/App.tsx');
    const card = read('src/components/students/StudentFollowUpCard.tsx');
    const attendanceRouter = read('src/server/attendanceRouter.ts');
    expect(app).toContain(
      'selectedStudentId={location.pathname.match(/^\\/students\\/([^/]+)$/)?.[1]}'
    );
    expect(card).toContain('fetchTeacherStudentAssessmentHistory');
    expect(card).toContain('fetchTeacherStudentAttendanceSummary');
    expect(card).toContain('fetchTeacherMedicalExemptions');
    expect(attendanceRouter).toContain('/teacher/students/:studentId/attendance-summary');
    expect(attendanceRouter).toContain('teacherId: req.user!.id');
  });

  it('leaves assessment and attendance ownership at their canonical workspaces', () => {
    const gradebook = read('src/components/gradebook/GradebookView.tsx');
    const attendance = read('src/components/attendance/AttendanceBookView.tsx');
    expect(gradebook).toContain('AssessmentNotebookView');
    expect(gradebook).toContain("visibleSections={['competency', 'marks', 'results', 'reports']}");
    expect(gradebook).not.toContain('onAddStudent');
    expect(attendance).toContain('saveTeacherAttendance');
    expect(attendance).not.toContain('createTeacherMedicalExemption');
  });
});
