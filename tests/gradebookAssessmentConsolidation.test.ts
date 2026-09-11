import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';

const read = (file: string) => readFileSync(file, 'utf8');
const gradebook = read('src/components/gradebook/SmartGradebookView.tsx');
const notebook = read('src/components/assessment/AssessmentNotebookView.tsx');
const app = read('src/App.tsx');
const router = read('src/server/apiRouter.ts');

describe('canonical Gradebook competency assessment', () => {
  it('keeps the legacy Smart Gradebook as the Marks Book entry point', () => {
    expect(gradebook).toContain('دفتر التنقيط الذكي');
    expect(gradebook).toContain('GradeRecord');
    expect(gradebook).not.toContain('AssessmentNotebookView');
    expect(notebook).toContain('دفتر التنقيط');
    expect(notebook).not.toContain('دفتر التقويم\n');
    expect(notebook).toContain("type NotebookSection = 'competency' | 'marks'");
    expect(notebook).toContain("'results' | 'reports'");
    expect(notebook).toContain('allowedSections.includes(value)');
  });

  it('keeps four official criteria and derives status from their saved values', () => {
    expect(notebook).toContain('canonicalCriteria.map');
    expect(notebook).toContain('item.id');
    expect(notebook).toContain('calculateAssessmentMastery(draft.criteria)');
    expect(notebook).toContain('upsertTeacherCriterionResult');
    expect(notebook).toContain('upsertTeacherStudentAssessment');
    expect(notebook).toContain('غير مكتمل');
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
    expect(pathToTab('/assessment-notebook')).toBe('assessment_notebook');
    expect(ROLE_TABS.teacher).toContain('assessment_notebook');
    expect(app).toContain("params.set('section', 'competency')");
    expect(app).toContain('AssessmentNotebookView');
  });

  it('does not expose attendance or roster administration through the embedded assessment view', () => {
    expect(gradebook).not.toContain('AssessmentNotebookView');
    expect(gradebook).not.toContain('دفتر الغياب والمواظبة');
    expect(notebook).toContain("allowedSections.includes('attendance')");
    expect(notebook).toContain("allowedSections.includes('exemptions')");
  });
});
