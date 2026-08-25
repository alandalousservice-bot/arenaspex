import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const routes = readFileSync('src/lib/routes.ts', 'utf8');
const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const overview = readFileSync('src/components/dashboard/AdminOverview.tsx', 'utf8');
const accounts = readFileSync('src/components/dashboard/AdminAccountsPage.tsx', 'utf8');
const detail = readFileSync('src/components/dashboard/AdminAccountDetailPage.tsx', 'utf8');
const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');

describe('Admin workspace routes', () => {
  it('defines dedicated Admin paths and navigation labels', () => {
    for (const path of [
      '/admin',
      '/admin/accounts',
      '/admin/pending-users',
      '/admin/inspectors',
      '/admin/services',
      '/admin/approvals',
      '/admin/curriculum',
      '/admin/reports',
    ])
      expect(routes).toContain(path);
    for (const label of [
      'إدارة الحسابات',
      'طلبات تفعيل الحسابات',
      'المفتشون والإسنادات',
      'الخدمات المساعدة',
      'اعتمادات الموارد',
      'المناهج والمراجع',
      'الإحصاءات والتقارير',
    ])
      expect(sidebar).toContain(label);
  });

  it('dispatches Admin routes through the dedicated workspace and keeps home compact', () => {
    expect(app).toContain('AdminWorkspacePage');
    expect(overview).toContain('fetchManagedUsersFromDB');
    expect(overview).toContain("href: '/admin/accounts'");
    expect(overview).not.toContain('AdminDashboard');
  });
});

describe('Admin account management', () => {
  it('uses persisted directory data with safe filters and no demo fallback', () => {
    expect(accounts).toContain('fetchAdminAccountsDirectory');
    expect(accounts).toContain('search');
    expect(accounts).toContain('pending_approval');
    expect(accounts).toContain('غير مضاف');
    expect(accounts).not.toContain('DEMO_USERS');
  });

  it('provides a protected detail read model without secret fields', () => {
    expect(routes).toContain('/^\\/admin\\/accounts\\/[^/]+$');
    expect(detail).toContain('fetchAdminAccount');
    expect(detail).toContain('serviceAccess');
    expect(detail).toContain('/admin/inspectors');
    expect(detail).not.toContain('passwordHash');
    expect(apiRouter).toContain("apiRouter.get('/admin/users/:id', requireRole('admin')");
    expect(apiRouter).toContain('sanitizeUser(user');
  });
});
