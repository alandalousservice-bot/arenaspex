import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';

const read = (file: string) => readFileSync(file, 'utf8');
const gradebook = read('src/components/gradebook/GradebookView.tsx');
const notebook = read('src/components/assessment/AssessmentNotebookView.tsx');
const app = read('src/App.tsx');
const router = read('src/server/apiRouter.ts');

describe('canonical Gradebook competency assessment', () => {
  it('exposes only the persisted assessment sections inside the Marks Book', () => {
    expect(gradebook).toContain("visibleSections={['competency', 'marks', 'results', 'reports']}");
    expect(gradebook).not.toContain('spex_grade_records_');
    expect(gradebook).not.toContain('GradeRecord');
    expect(notebook).toContain('دفتر التنقيط');
    expect(notebook).not.toContain('دفتر التقويم\n');
    expect(notebook).toContain("type NotebookSection = 'competency' | 'marks'");
    expect(notebook).toContain("'results' | 'reports'");
    expect(notebook).toContain('allowedSections.includes(value)');
  });

  it('keeps four official criteria and derives status from their saved values', () => {
    for (const code of ['C1', 'C2', 'C3', 'C4']) expect(notebook).toContain(`code: '${code}'`);
    expect(notebook).toContain('calculateAssessmentMastery(draft.criteria)');
    expect(notebook).toContain('upsertTeacherCriterionResult');
    expect(notebook).toContain('upsertTeacherStudentAssessment');
  });

  it('keeps marks, results, history, exemption enforcement, and teacher isolation on the API', () => {
    expect(notebook).toContain('fetchTeacherAssessmentSession');
    expect(notebook).toContain('fetchTeacherStudentAssessmentHistory');
    expect(router).toContain('findActiveMedicalExemption(student.id, session.assessedAt)');
    expect(router).toContain('existing.teacherId !== req.user!.id');
    expect(router).toContain('classId: session.classId');
  });

  it('redirects legacy assessment links while preserving competency context', () => {
    expect(pathToTab('/assessment')).toBe('gradebook');
    expect(pathToTab('/assessment-notebook')).toBe('gradebook');
    expect(ROLE_TABS.teacher).not.toContain('competency_assessment');
    expect(app).toContain("params.set('section', 'competency')");
    expect(app).toContain("navigate('/gradebook' + (query ? '?' + query : ''), { replace: true })");
  });

  it('does not expose attendance or roster administration through the embedded assessment view', () => {
    expect(gradebook).not.toContain("visibleSections={['competency', 'marks', 'attendance'");
    expect(gradebook).not.toContain("activeRegister === 'attendance'");
    expect(notebook).toContain("allowedSections.includes('attendance')");
    expect(notebook).toContain("allowedSections.includes('exemptions')");
  });
});
