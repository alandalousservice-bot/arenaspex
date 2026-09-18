import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const routes = readFileSync('src/lib/routes.ts', 'utf8');
const workspace = readFileSync('src/components/dashboard/AdminWorkspacePage.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

describe('ADMIN-G6 final control center', () => {
  it('exposes the final responsibility hierarchy without fake destinations', () => {
    for (const label of [
      'إدارة المستخدمين',
      'الإدارة البيداغوجية',
      'المتابعة والتحليل',
      'الخدمات والمنصة',
      'الخدمات',
      'التواصل',
      'الملف الشخصي',
      'الإحصاءات والتحليل',
      'التقارير والتصدير',
    ])
      expect(sidebar).toContain(label);
    expect(sidebar).not.toContain('إعدادات النظام');
  });

  it('keeps every active Admin destination on the centralized route map', () => {
    const destinations = [
      ['/admin', 'AdminOverview'],
      ['/admin/accounts', 'AdminAccountsPage'],
      ['/admin/pending-users', 'AdminPendingUsersPage'],
      ['/admin/inspectors', 'AdminInspectorWorkspacePage'],
      ['/admin/services', 'AdminServicesPage'],
      ['/admin/approvals', 'AdminApprovalsPage'],
      ['/admin/curriculum', 'AdminCurriculumPage'],
      ['/admin/reports', 'AdminReportsPage'],
    ] as const;
    for (const [path, owner] of destinations) {
      expect(routes).toContain(path);
      expect(workspace).toContain(owner);
    }
    expect(app).toContain('AdminWorkspacePage');
    expect(routes).toContain("'/reports'");
    expect(routes).toContain("'/settings'");
  });

  it('does not expose the retired dashboard as the active Admin renderer', () => {
    expect(workspace).not.toContain('AdminDashboard');
    expect(app).not.toContain("import('./components/dashboard/AdminDashboard')");
  });
});
