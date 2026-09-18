import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Inspector G1 security and governance boundaries', () => {
  it('keeps teacher access assignment-scoped and minimizes roster data', () => {
    const router = read('src/server/assignmentRouter.ts');
    expect(router).toContain("requireRole('inspector')");
    expect(router).toContain('assignment.inspectorId !== req.user!.id');
    expect(router).toContain("['Active', 'Changed'].includes(assignment.status)");
    expect(router).toContain('select: { id: true, name: true, teacherId: true }');
    expect(router).toContain('select: { id: true, classId: true }');
  });

  it('keeps authoritative resource approval Admin-only and removes Inspector approval UI', () => {
    const api = read('src/server/apiRouter.ts');
    const resourceView = read(
      'src/components/dashboard/inspector/InspectorResourceValidationView.tsx'
    );
    expect(api).toContain("'/admin/resource-approvals/:resourceType/:id/review'");
    expect(api).toContain("requireRole('admin')");
    expect(resourceView).not.toContain('onToggleApproveResource');
    expect(resourceView).toContain('الاعتماد الرسمي من الإدارة');
  });

  it('does not ship known Inspector placeholder metrics or district claims', () => {
    const files = [
      'src/components/dashboard/inspector/InspectorPedagogicalProfile.tsx',
      'src/components/dashboard/inspector/InspectorReportsView.tsx',
      'src/components/dashboard/inspector/InspectorBroadcastsView.tsx',
    ]
      .map(read)
      .join('\n');
    expect(files).not.toContain('88%');
    expect(files).not.toContain('المقاطعة 07 سطيف');
    expect(files).not.toContain('المقاطعة 07');
  });

  it('does not expose private teacher-owned domains through Inspector resource props', () => {
    const workspace = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    const resourceView = read(
      'src/components/dashboard/inspector/InspectorResourceValidationView.tsx'
    );
    expect(workspace).not.toContain('onToggleApproveResource');
    expect(resourceView).not.toContain('TeacherObjective');
    expect(resourceView).not.toContain('Attendance');
    expect(resourceView).not.toContain('Assessment');
    expect(resourceView).not.toContain('Gradebook');
  });
});
