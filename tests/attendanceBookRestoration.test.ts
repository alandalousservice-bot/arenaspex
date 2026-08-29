import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathToTab, tabToPath } from '../src/lib/routes';

const read = (file: string) => readFileSync(file, 'utf8');

describe('literal standalone Attendance Book restoration', () => {
  const view = read('src/components/attendance/AttendanceBookView.tsx');
  const router = read('src/server/attendanceRouter.ts');

  it('keeps the canonical standalone route and old register texts', () => {
    expect(pathToTab('/attendance')).toBe('attendance');
    expect(tabToPath('attendance')).toBe('/attendance');
    expect(view).toContain('دفتر تسجيل الحضور والغياب للتربية البدنية');
    expect(view).toContain(
      'سجل المتابعة اليومية والانضباط للحصص الرياضية مع تسجيل الأسباب والشهادات الطبية'
    );
    expect(view).toContain('الحالة اليومية');
    expect(view).toContain('تأكيد الحضور والغياب');
  });

  it('restores the old four-column register without student deletion', () => {
    expect(view).toContain('اسم ولقب التلميذ');
    expect(view).toContain('colSpan={4}');
    for (const status of ['حاضر', 'غائب', 'غائب بمبرر', 'معفى']) {
      expect(view).toContain(status);
    }
    expect(view).not.toContain('Trash2');
    expect(view).not.toContain('حذف التلميذ');
    expect(view).toContain('overflow-x-auto');
    expect(view).toContain('bg-slate-900');
  });

  it('keeps unrecorded dates neutral and uses the old date/class controls', () => {
    expect(view).toContain('type="date"');
    expect(view).toContain('selectedDate');
    expect(view).toContain('selectedClassId');
    expect(view).toContain("{status || 'غير مسجل'}");
    expect(view).not.toContain("|| 'حاضر'");
    expect(view).toContain("attendanceStudent?.attendance?.status || ''");
  });

  it('persists status clicks through the protected PostgreSQL attendance API', () => {
    expect(view).toContain('fetchTeacherPlanningSessions');
    expect(view).toContain('fetchTeacherAttendance');
    expect(view).toContain('saveTeacherAttendance');
    expect(view).toContain('fetchTeacherAttendance(selectedSession.id)');
    expect(router).toContain("requireRole('teacher')");
    expect(router).toContain('teacherId: req.user!.id');
    expect(router).toContain('classPlannedSessionId_studentId');
    expect(router).toContain('prisma.$transaction');
  });

  it('preserves all UI-to-database status values and medical protections', () => {
    expect(router).toContain("z.enum(['حاضر', 'غائب', 'غائب بمبرر', 'معفى'])");
    expect(router).toContain("record.status !== 'معفى'");
    expect(router).toContain("record.status === 'معفى'");
    expect(view).toContain('bg-emerald-100');
    expect(view).toContain('bg-rose-100');
    expect(view).toContain('bg-amber-100');
    expect(view).toContain('bg-purple-100');
  });

  it('uses current classId roster isolation and date-to-planned-session mapping', () => {
    expect(view).toContain('student.classId === selectedClassId');
    expect(view).toContain('session.plannedDate.slice(0, 10) === selectedDate');
    expect(view).toContain('fetchTeacherPlanningSessions(selectedClassId, academicYearId)');
    expect(view).toContain('fetchTeacherAttendance(selectedSession.id)');
  });
});
