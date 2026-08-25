import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');
const schema = read('prisma/schema.prisma');
const migration = read(
  'prisma/migrations/20260825093000_persisted_teacher_assessment/migration.sql'
);
const router = read('src/server/apiRouter.ts');
const api = read('src/services/api.ts');
const gradebook = read('src/components/gradebook/GradebookView.tsx');
const competency = read('src/components/assessment/CompetencyAssessmentView.tsx');

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

  it('keeps Gradebook fresh students unassessed', () => {
    expect(gradebook).toContain('behaviorRating: null');
    expect(gradebook).toContain('competencyRating: null');
    expect(gradebook).toContain('suggestedMark: null');
    expect(gradebook).toContain('finalMark: null');
    expect(gradebook).not.toContain('defaultBehavior');
    expect(gradebook).not.toContain("|| 'تمكن جيد'");
  });

  it('keeps Competency Assessment fresh students unassessed', () => {
    expect(competency).toContain('const studentCurrentGrades = sessionMap[studentId] || {};');
    expect(competency).toContain('<option value="">غير مقوّم</option>');
    expect(competency).not.toContain("|| { C1: 'ب', C2: 'ب', C3: 'ب', C4: 'ب' }");
  });

  it('does not add attendance or exemption persistence', () => {
    expect(schema).not.toContain('model Attendance');
    expect(schema).not.toContain('model MedicalExemption');
    expect(migration).not.toContain('Attendance');
    expect(migration).not.toContain('Exemption');
  });
});
