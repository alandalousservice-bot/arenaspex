import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { calculateAssessmentMastery } from '../src/services/assessmentMastery';

const read = (file: string) => readFileSync(file, 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read(
  'prisma/migrations/20260825093000_persisted_teacher_assessment/migration.sql'
);
const router = read('src/server/apiRouter.ts').replace(/\s+/g, ' ').replace(/\(\s+/g, '(');
const api = read('src/services/api.ts');
const gradebook = read('src/components/gradebook/SmartGradebookView.tsx');
const notebook = read('src/components/assessment/AssessmentNotebookView.tsx');

describe('persisted Teacher assessment foundation', () => {
  it('declares the three additive models and cascade policy', () => {
    expect(schema).toContain('model AssessmentSession');
    expect(schema).toContain('model StudentAssessment');
    expect(schema).toContain('model CriterionResult');
    expect(schema).toContain('onDelete: Cascade');
    expect(schema).toContain('onDelete: SetNull');
  });

  it('declares the required uniqueness and isolation indexes', () => {
    expect(schema).toContain('classPlannedSessionId String?  @unique');
    expect(schema).toContain('@@unique([assessmentSessionId, studentId])');
    expect(schema).toContain('@@unique([studentAssessmentId, criterionId])');
    expect(schema).toContain('@@index([teacherId, classId, academicYearId])');
  });

  it('contains an additive migration without legacy data deletion', () => {
    expect(migration).toContain('CREATE TABLE "AssessmentSession"');
    expect(migration).toContain('CREATE TABLE "StudentAssessment"');
    expect(migration).toContain('CREATE TABLE "CriterionResult"');
    expect(migration).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE/i);
  });

  it('exposes protected session and result APIs', () => {
    expect(router).toContain("apiRouter.get('/teacher/assessment-sessions'");
    expect(router).toContain("apiRouter.post('/teacher/assessment-sessions'");
    expect(router).toContain(
      "apiRouter.put('/teacher/assessment-sessions/:sessionId/students/:studentId'"
    );
    expect(router).toContain("/criteria/:criterionId'");
    expect(router).toContain("requireRole('teacher')");
  });

  it('validates canonical mastery and the 0–10 optional mark', () => {
    expect(router).toContain("z.enum(['أ', 'ب', 'ج', 'د'])");
    expect(router).toContain('z.number().finite().min(0).max(10).nullable().optional()');
    expect(router).toContain('criterionIdForSession');
  });

  it('validates class, teacher, year, and planned-session ownership', () => {
    expect(router).toContain('teacherId: req.user!.id');
    expect(router).toContain('classId: input.classId');
    expect(router).toContain('academicYearId: input.academicYearId');
    expect(router).toContain('classPlannedSessionId: input.classPlannedSessionId');
    expect(router).toContain('classId: session.classId');
  });

  it('uses idempotent session, student, and criterion operations', () => {
    expect(router).toContain('reused: true');
    expect(router).toContain('assessmentSessionId_studentId');
    expect(router).toContain('studentAssessmentId_criterionId');
    expect(api).toContain('createOrReuseTeacherAssessmentSession');
    expect(api).toContain('upsertTeacherStudentAssessment');
    expect(api).toContain('upsertTeacherCriterionResult');
  });

  it('keeps the restored Smart Gradebook on the current persisted adapter', () => {
    expect(gradebook).toContain('GradeRecord');
    expect(gradebook).toContain('saveSmartGradebookRecord');
    expect(gradebook).not.toContain('AssessmentNotebookView');
    expect(gradebook).not.toContain('spex_grade_records_');
    expect(gradebook).not.toContain('localStorage');
    expect(notebook).toContain('fetchTeacherAssessmentSession');
    expect(notebook).toContain('fetchTeacherStudentAssessmentHistory');
  });

  it('derives mastery from saved criterion levels without inventing defaults', () => {
    expect(calculateAssessmentMastery({ C1: 'أ', C2: 'أ', C3: 'ب', C4: 'ب' })).toBe('أ');
    expect(calculateAssessmentMastery({ C1: 'ج', C2: 'ج', C3: 'ج', C4: 'ج' })).toBe('ج');
    expect(calculateAssessmentMastery({})).toBeNull();
    expect(notebook).toContain('calculateAssessmentMastery');
    expect(notebook).toContain('التملك العام: غير مقوّم');
  });

  it('keeps attendance and exemption persistence additive and separate', () => {
    expect(schema).toContain('model StudentAttendance');
    expect(schema).toContain('model MedicalExemption');
    expect(schema).toContain('@@unique([classPlannedSessionId, studentId])');
    expect(migration).not.toContain('Attendance');
    expect(migration).not.toContain('Exemption');
  });
});
