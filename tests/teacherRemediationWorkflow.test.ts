import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const view = fs.readFileSync('src/components/assessment/AssessmentNotebookView.tsx', 'utf8');
const api = fs.readFileSync('src/services/api.ts', 'utf8');

describe('teacher diagnostic remediation workflow', () => {
  it('keeps remediation inside the diagnostic assessment context', () => {
    expect(view).toContain("activeSession?.assessmentType === 'DIAGNOSTIC'");
    expect(view).not.toContain("assessmentType === 'LEARNING' && section === 'competency'");
    expect(view).not.toContain('اختيار تلقائي');
  });
  it('uses authoritative candidate/resource endpoints and explicit teacher actions', () => {
    expect(api).toContain('/remediation-candidates');
    expect(api).toContain('/resources');
    expect(api).toContain('/interventions');
    expect(view).toContain('حفظ المعالجة');
    expect(view).toContain('مطابقة مباشرة');
    expect(view).toContain('مناسبة للسياق');
    expect(view).toContain('قيد التطبيق');
    expect(view).toContain('مكتملة');
    expect(view).toContain('ملغاة');
  });
  it('does not submit client-owned snapshot or compatibility fields', () => {
    expect(view).not.toContain('resourceBodySnapshot');
    expect(view).not.toContain('compatibility:');
    expect(view).toContain('studentAssessmentId: candidate.studentAssessmentId');
    expect(view).toContain('criterionResultId: candidate.criterionResultId');
  });
});
