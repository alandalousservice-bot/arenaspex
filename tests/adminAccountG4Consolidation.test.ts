import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('ADMIN-ACCOUNT-G4 account workflow consolidation', () => {
  it('keeps one authoritative directory/detail workflow and separates assignments', () => {
    const workspace = read('src/components/dashboard/AdminWorkspacePage.tsx');
    const detail = read('src/components/dashboard/AdminAccountDetailPage.tsx');
    const inspector = read('src/components/dashboard/AdminInspectorWorkspacePage.tsx');
    expect(workspace).toContain("pathname === '/admin/accounts'");
    expect(workspace).toContain('AdminAccountDetailPage');
    expect(detail).toContain('فتح إدارة الإسنادات المتقدمة');
    expect(inspector).toContain('navigate(`/admin/accounts/${i.id}`)');
  });

  it('uses the same lifecycle endpoint from pending queue and account detail', () => {
    const pending = read('src/components/dashboard/AdminPendingUsersPage.tsx');
    const detail = read('src/components/dashboard/AdminAccountDetailPage.tsx');
    const api = read('src/services/api.ts');
    expect(pending).toContain('applyAdminAccountLifecycle');
    expect(detail).toContain('applyAdminAccountLifecycle');
    expect(api).toContain('/lifecycle');
  });

  it('keeps lifecycle fields read-only in normal editing and supports directory search', () => {
    const dashboard = read('src/components/dashboard/AdminDashboard.tsx');
    const directory = read('src/components/dashboard/AdminAccountsPage.tsx');
    expect(dashboard).toContain('الدور والحالة والاعتماد ليست حقول ملف شخصي');
    expect(directory).toContain('u.username');
    expect(directory).toContain('u.spexId');
    expect(directory).toContain('لا توجد حسابات مطابقة للفلاتر الحالية.');
  });

  it('uses a dedicated role-aware profile mutation contract with dependent geographic validation', () => {
    const api = read('src/services/api.ts');
    const detail = read('src/components/dashboard/AdminAccountDetailPage.tsx');
    expect(api).toContain('/api/admin/users/${encodeURIComponent(userId)}/profile');
    expect(detail).toContain('updateAdminAccountProfile');
    expect(read('src/server/apiRouter.ts')).toContain("apiRouter.put('/admin/users/:id/profile'");
    expect(read('src/server/apiRouter.ts')).toContain('adminAccountProfileSchema');
    expect(read('src/server/apiRouter.ts')).toContain(
      'المقاطعة التفتيشية لا تنتمي إلى المديرية المختارة'
    );
    expect(read('src/server/apiRouter.ts')).not.toContain('data: req.body');
  });

  it('does not expose routine hard delete or private pedagogical data in account views', () => {
    const detail = read('src/components/dashboard/AdminAccountDetailPage.tsx');
    const pending = read('src/components/dashboard/AdminPendingUsersPage.tsx');
    expect(detail).not.toContain('deleteUserFromDB');
    expect(pending).not.toContain('TeacherObjective');
    expect(pending).not.toContain('passwordHash');
  });
});
