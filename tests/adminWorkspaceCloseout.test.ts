import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const workspace = readFileSync('src/components/dashboard/AdminWorkspacePage.tsx', 'utf8');
const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const routes = readFileSync('src/lib/routes.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const dashboard = 'src/components/dashboard/AdminDashboard.tsx';
const settings = readFileSync('src/components/settings/SettingsView.tsx', 'utf8');
const assignmentRouter = readFileSync('src/server/assignmentRouter.ts', 'utf8');
const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');

describe('Admin workspace closeout', () => {
  it('has one dedicated route owner for every Admin module and no legacy dashboard fallback', () => {
    for (const route of [
      '/admin',
      '/admin/accounts',
      '/admin/pending-users',
      '/admin/inspectors',
      '/admin/services',
      '/admin/approvals',
      '/admin/curriculum',
      '/admin/reports',
    ])
      expect(workspace).toContain(
        route === '/admin' ? 'AdminOverview' : route.replace('/admin/', '')
      );
    expect(workspace).not.toContain('AdminDashboard');
    expect(app).toContain('AdminWorkspacePage');
    expect(sidebar).toContain("{ id: 'admin_reports' as NavTab");
    expect(routes).toContain(
      "if (/^\\/admin\\/accounts\\/[^/]+$/.test(normalized)) return 'admin_accounts'"
    );
  });
  it('keeps Admin navigation and direct route authorization centralized', () => {
    for (const tab of [
      'admin_portal',
      'admin_accounts',
      'admin_pending_users',
      'admin_inspectors',
      'admin_services',
      'admin_approvals',
      'admin_curriculum',
      'admin_reports',
      'settings',
    ])
      expect(routes).toContain(`'${tab}'`);
    expect(routes).toContain('resolveTabForRole');
    expect(app).toContain('const activeTab = resolveTabForRole');
    expect(apiRouter).toContain("apiRouter.get('/admin/reports/overview', requireRole('admin')");
    expect(assignmentRouter).toContain(
      "assignmentRouter.get('/admin/inspectors/workspace', requireRole('admin')"
    );
  });
  it('does not expose Teacher professional fields to Admin settings', () => {
    expect(settings).toContain('showProfessionalFields = !isInspector && !isAdmin');
    expect(settings).toContain('{showProfessionalFields && (');
    expect(settings).toContain("currentUser.role === 'admin'");
  });
});
