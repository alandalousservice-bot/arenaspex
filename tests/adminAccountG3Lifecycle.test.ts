import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('ADMIN-ACCOUNT-G3 lifecycle boundary', () => {
  it('uses a dedicated server lifecycle contract with current-state protections', () => {
    const router = read('src/server/apiRouter.ts');
    expect(router).toContain("apiRouter.post('/admin/users/:id/lifecycle', requireRole('admin')");
    expect(router).toContain("action === 'deactivate'");
    expect(router).toContain('existing.isPlatformOwner');
    expect(router).toContain('existing.id === req.user!.id');
    const lifecycle = read('src/server/accountLifecycle.ts');
    expect(lifecycle).toContain('isApprovedByAdmin: false');
    expect(lifecycle).toMatch(
      /status: 'active',\s+isApprovedByAdmin: true,\s+accessExpiresAt: academicYearAccessExpiry\(\)/
    );
  });

  it('keeps lifecycle fields out of the ordinary G2 profile form', () => {
    const dashboard = read('src/components/dashboard/AdminDashboard.tsx');
    expect(dashboard).toContain('الدور والحالة والاعتماد ليست حقول ملف شخصي');
    expect(dashboard).toContain('تغيير الدور يتم فقط من إجراء privileged مستقل.');
    expect(dashboard).toContain('التفعيل والتعطيل يتمان من إدارة الحساب.');
    expect(dashboard).not.toContain(
      'onUpdateUser({\n                                        ...u,\n                                        isApprovedByAdmin: false'
    );
  });

  it('requires explicit confirmation in the account detail lifecycle actions', () => {
    const detail = read('src/components/dashboard/AdminAccountDetailPage.tsx');
    expect(detail).toContain('applyAdminAccountLifecycle');
    expect(detail).toContain('role="dialog"');
    expect(detail).toContain('aria-modal="true"');
    expect(detail).toContain('if (!user || !confirmation || saving) return;');
    expect(detail).toContain("applyLifecycle('reject')");
    expect(detail).toContain("'reactivate'");
  });

  it('reloads the current user on every authenticated request', () => {
    const auth = read('src/server/middleware/requireAuth.ts');
    expect(auth).toContain('prisma.user.findUnique');
    expect(auth).toContain("user.status !== 'active'");
    expect(auth).toContain('req.user =');
  });
});
