import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Inspector G3 knowledge governance', () => {
  it('keeps the shared Knowledge Engine taxonomy and does not add a games governance tab', () => {
    const source = read('src/components/knowledge/KnowledgeEngineView.tsx');
    expect(source).toContain("'objective'");
    expect(source).toContain("'remedial'");
    expect(source).toContain("'educational_situation'");
    expect(source).not.toContain('InspectorApproval');
    expect(source).not.toContain('pedagogical-games-governance');
  });

  it('keeps Inspector resources read/note-only and Admin approval authoritative', () => {
    const inspector = read(
      'src/components/dashboard/inspector/InspectorResourceValidationView.tsx'
    );
    const api = read('src/server/apiRouter.ts');
    expect(inspector).not.toContain('onApprove');
    expect(inspector).not.toContain('onReject');
    expect(inspector).not.toContain('اعتماد وختم المفتشية');
    expect(inspector).toContain('الاعتماد الرسمي من الإدارة');
    expect(api).toContain("'/admin/resource-approvals/:resourceType/:id/review'");
    expect(api).toContain("requireRole('admin')");
  });

  it('does not expose TeacherObjective browsing or persist resource notes through InspectorNote', () => {
    const workspace = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    const inspector = read(
      'src/components/dashboard/inspector/InspectorResourceValidationView.tsx'
    );
    expect(workspace).not.toContain('TeacherObjective');
    expect(inspector).not.toContain('TeacherObjective');
    expect(inspector).toContain('onSendNoteToTeacher');
    expect(inspector).not.toContain('InspectorNote');
  });

  it('uses persisted status fields instead of the retired Inspector approval flag', () => {
    const inspector = read(
      'src/components/dashboard/inspector/InspectorResourceValidationView.tsx'
    );
    expect(inspector).toContain("res.approvalStatus === 'APPROVED'");
    expect(inspector).not.toContain('res.isApprovedByInspector');
  });
});
