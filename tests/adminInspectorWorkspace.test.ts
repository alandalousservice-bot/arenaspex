import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/components/dashboard/AdminInspectorWorkspacePage.tsx', 'utf8');
const workspace = readFileSync('src/components/dashboard/AdminWorkspacePage.tsx', 'utf8');
const router = readFileSync('src/server/assignmentRouter.ts', 'utf8');
const service = readFileSync('src/server/assignmentService.ts', 'utf8');

describe('Admin Inspector workspace', () => {
  it('uses the protected consolidated read model and real assignment sections', () => {
    expect(workspace).toContain('AdminInspectorWorkspacePage');
    expect(page).toContain('fetchAdminInspectorWorkspace');
    for (const label of [
      'المفتشون',
      'المقاطعات التفتيشية',
      'إسناد الأساتذة',
      'الإسنادات المعلقة',
      'سجل/حالة الإسنادات',
    ])
      expect(page).toContain(label);
    expect(page).toContain('لا توجد حسابات مفتشين.');
    expect(page).toContain('بدون مفتش');
    expect(page).not.toContain('Ain Azel');
    expect(page).not.toContain('Setif');
  });

  it('keeps Inspector workplace geographic and assignment-based', () => {
    expect(page).toContain('acceptedTeacherCount');
    expect(page).toContain('pendingAssignmentCount');
    expect(page).toContain('/admin/accounts/${i.id}');
    expect(page).toContain('schoolName'); // teacher selector context only
  });

  it('protects Admin reads/creates and preserves Inspector acceptance ownership', () => {
    expect(router).toContain(
      "assignmentRouter.get('/admin/inspectors/workspace', requireRole('admin')"
    );
    expect(router).toContain("assignmentRouter.post('/admin/assignments', requireRole('admin')");
    expect(router).toContain('لا يمكن إسناد الأستاذ إلى مفتش من مديرية أو مقاطعة مختلفة.');
    expect(router).toContain("status: 'Pending'");
    expect(service).toContain('existing.inspectorId !== inspectorId');
    expect(service).toContain("existing.status !== 'Pending'");
  });
});
