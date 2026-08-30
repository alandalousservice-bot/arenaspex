import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('persisted Teacher attendance and medical exemptions', () => {
  it('defines additive models and operational-session identity', () => {
    const schema = read('prisma/schema.prisma');
    const migration = read(
      'prisma/migrations/20260825_teacher_attendance_exemptions/migration.sql'
    );
    const classSessionMigration = read(
      'prisma/migrations/20260825090000_class_planned_sessions/migration.sql'
    );
    const repairMigration = read(
      'prisma/migrations/20260825091000_repair_teacher_attendance_session_fk/migration.sql'
    );
    expect(
      '20260825091000_repair_teacher_attendance_session_fk'.localeCompare(
        '20260825090000_class_planned_sessions'
      )
    ).toBeGreaterThan(0);
    expect(schema).toContain('model StudentAttendance');
    expect(schema).toContain('model MedicalExemption');
    expect(schema).toContain('attendanceDate        DateTime');
    expect(schema).toContain(
      '@@unique([teacherId, classId, studentId, academicYearId, attendanceDate])'
    );
    expect(migration).toContain('CREATE TABLE "StudentAttendance"');
    expect(migration).toContain('CREATE TABLE "MedicalExemption"');
    expect(migration).not.toContain('REFERENCES "ClassPlannedSession"');
    expect(classSessionMigration).toContain('CREATE TABLE "ClassPlannedSession"');
    const normalizedRepairMigration = repairMigration.replace(/\s+/g, ' ');
    expect(normalizedRepairMigration).toContain('pg_constraint');
    expect(normalizedRepairMigration).toContain(
      'REFERENCES "ClassPlannedSession"("id") ON DELETE CASCADE ON UPDATE CASCADE'
    );
    expect(repairMigration).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  });

  it('exposes consolidated protected batch attendance and exemption routes', () => {
    const router = read('src/server/attendanceRouter.ts')
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(');
    expect(router).toContain(
      "teacherAttendanceRouter.get('/teacher/planned-sessions/:sessionId/attendance'"
    );
    expect(router).toContain(
      "teacherAttendanceRouter.put('/teacher/planned-sessions/:sessionId/attendance'"
    );
    expect(router).toContain("teacherAttendanceRouter.get('/teacher/classes/:classId/exemptions'");
    expect(router).toContain("teacherAttendanceRouter.post('/teacher/classes/:classId/exemptions'");
    expect(router).toContain("requireRole('teacher')");
    expect(router).toContain('prisma.$transaction');
  });

  it('keeps attendance unset until an explicit teacher save', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    expect(view).toContain("status: student.attendance?.status || ''");
    expect(view).toContain('<option value="">غير مسجل</option>');
    expect(view).toContain('حفظ الحضور المحدد');
    expect(view).not.toContain("status: student.attendance?.status || 'حاضر'");
  });

  it('keeps attendance and assessment separate while enforcing active exemptions server-side', () => {
    const view = read('src/components/assessment/AssessmentNotebookView.tsx');
    const router = read('src/server/apiRouter.ts');
    expect(view).toContain('الحضور مستقل عن تقويم الكفاءات');
    expect(router).toContain('findActiveMedicalExemption(student.id, session.assessedAt)');
    expect(router).toContain('لا يمكن تعديل تقويم تلميذ لديه إعفاء طبي نشط');
    expect(router).toContain('لا يمكن تعديل معيار تلميذ لديه إعفاء طبي نشط');
  });

  it('preserves planned-session links from notebook and command center', () => {
    expect(read('src/components/notebook/DailyNotebookView.tsx')).toContain(
      "'/attendance?classId='"
    );
    expect(read('src/components/lesson/LessonCommandCenterView.tsx')).toContain('onOpenAttendance');
    expect(read('src/App.tsx')).toContain('onOpenAttendance');
  });

  it('uses minimal exemption fields and does not retain legacy medical detail fields', () => {
    const schema = read('prisma/schema.prisma');
    expect(schema).toContain('issuedOn  DateTime');
    expect(schema).toContain('expiresOn DateTime?');
    expect(schema).toContain('reason    String?');
    expect(schema).toContain('note      String?');
    expect(schema).not.toContain('medicalFacility String');
    expect(schema).not.toContain('doctorName String');
  });
});
