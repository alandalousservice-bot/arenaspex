import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pathToTab, tabToPath } from '../src/lib/routes';

const read = (file: string) => readFileSync(file, 'utf8');

describe('date-based classic Attendance Book', () => {
  const view = read('src/components/attendance/AttendanceBookView.tsx');
  const api = read('src/services/api.ts');
  const router = read('src/server/attendanceRouter.ts');
  const schema = read('prisma/schema.prisma');
  const migration = read(
    'prisma/migrations/20260829120000_date_based_teacher_attendance/migration.sql'
  );

  it('keeps the canonical standalone route and exact old register text', () => {
    expect(pathToTab('/attendance')).toBe('attendance');
    expect(tabToPath('attendance')).toBe('/attendance');
    for (const text of [
      'دفتر تسجيل الحضور والغياب للتربية البدنية',
      'سجل المتابعة اليومية والانضباط للحصص الرياضية مع تسجيل الأسباب والشهادات الطبية',
      'اسم ولقب التلميذ',
      'الحالة اليومية',
      'تأكيد الحضور والغياب',
      'حذف',
    ]) {
      expect(view).toContain(text);
    }
  });

  it('restores the five old columns, delete action, colors, and quick controls', () => {
    expect(view).toContain('Trash2');
    expect(view).toContain('title="حذف التلميذ"');
    expect(view).toContain('colSpan={5}');
    expect(view).toContain('w-12 p-3 text-center');
    expect(view).toContain('transition-colors hover:bg-slate-50');
    expect(view).toContain('p-1.5 text-slate-400');
    expect(view).toContain('hover:bg-rose-50 hover:text-rose-600');
    for (const status of ['حاضر', 'غائب', 'غائب بمبرر', 'معفى']) {
      expect(view).toContain(status);
    }
    expect(view).toContain('bg-emerald-100');
    expect(view).toContain('bg-rose-100');
    expect(view).toContain('bg-amber-100');
    expect(view).toContain('bg-purple-100');
    expect(view).toContain('shadow-xs');
  });

  it('keeps literal default حاضر without creating rows on render', () => {
    expect(view).toContain("recordsByStudent.get(studentId)?.status || 'حاضر'");
    expect(view).not.toContain('غير مسجل');
    expect(view).toContain('saveTeacherAttendanceByDate');
  });

  it('uses independent date-based read/write APIs with explicit status mapping', () => {
    expect(api).toContain('/api/teacher/attendance?');
    expect(api).toContain("fetch('/api/teacher/attendance'");
    expect(api).toContain('fetchTeacherAttendanceByDate');
    expect(api).toContain('saveTeacherAttendanceByDate');
    expect(router).toContain("teacherAttendanceRouter.get('/teacher/attendance'");
    expect(router).toContain("teacherAttendanceRouter.put('/teacher/attendance'");
    expect(router).toContain("z.enum(['حاضر', 'غائب', 'غائب بمبرر', 'معفى'])");
    expect(router).toContain('attendanceDate');
    expect(router).toContain('classPlannedSessionId = matchingSessions.length === 1');
  });

  it('uses the current Student.classId roster and protects class/teacher ownership', () => {
    expect(view).toContain('student.classId === selectedClassId');
    expect(router).toContain('teacherId: req.user!.id');
    expect(router).toContain('classId: parsed.data.classId');
    expect(router).toContain('classId: classRecord.id');
    expect(router).toContain('students.length !== studentIds.length');
    expect(router).toContain("requireRole('teacher')");
  });

  it('defines migration backfill and the date-based unique identity', () => {
    expect(schema).toContain('classPlannedSessionId String?');
    expect(schema).toContain('attendanceDate        DateTime');
    expect(schema).toContain(
      '@@unique([teacherId, classId, studentId, academicYearId, attendanceDate])'
    );
    expect(migration).toContain('ADD COLUMN "attendanceDate" TIMESTAMP(3)');
    expect(migration).toContain('SET "attendanceDate" = session."plannedDate"');
    expect(migration).toContain(
      'DROP INDEX "StudentAttendance_classPlannedSessionId_studentId_key"'
    );
    expect(migration).toContain(
      'StudentAttendance_teacherId_classId_studentId_academicYearId_attendanceDate_key'
    );
  });

  it('keeps the legacy planned-session API and safe student deletion workflow', () => {
    expect(router).toContain("'/teacher/planned-sessions/:sessionId/attendance'");
    expect(router).toContain('attendanceDate: session.plannedDate');
    expect(api).toContain('deleteTeacherStudent');
    expect(view).toContain('onDeleteStudent');
    expect(view).toContain('window.confirm');
    expect(read('src/services/studentDeletion.service.ts')).toContain('STUDENT_DELETE_BLOCKED');
    expect(read('src/hooks/usePlatformStore.ts')).toContain(
      'await deleteTeacherStudent(studentId)'
    );
  });
});
