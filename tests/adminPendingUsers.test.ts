import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/components/dashboard/AdminPendingUsersPage.tsx', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');
const router = readFileSync('src/server/apiRouter.ts', 'utf8');
const auth = readFileSync('src/server/authRouter.ts', 'utf8');
const legacy = readFileSync('src/components/dashboard/AdminDashboard.tsx', 'utf8');

describe('authoritative Admin pending accounts', () => {
  it('renders persisted pending data with safe search, sorting, and empty state', () => {
    expect(page).toContain('fetchAdminPendingAccounts');
    expect(page).toContain('query');
    expect(page).toContain('oldest');
    expect(page).toContain('newest');
    expect(page).toContain('غير مضاف');
    expect(page).toContain('لا توجد حسابات بانتظار التفعيل حالياً.');
    expect(page).not.toContain('DEMO_USERS');
  });

  it('reviews the same account and uses the protected activation endpoint', () => {
    expect(page).toContain('/admin/accounts/${encodeURIComponent(user.id)}');
    expect(page).toContain('activateUserAccount(user.id)');
    expect(page).toContain('setUsers((current) => current.filter');
    expect(api).toContain('/api/admin/users/${encodeURIComponent(userId)}/activate');
    expect(router).toContain("apiRouter.post('/admin/users/:id/activate', requireRole('admin')");
  });

  it('keeps one pending definition and removes legacy operational duplication', () => {
    expect(router).toContain("OR: [{ status: 'pending_approval' }, { isApprovedByAdmin: false }]");
    expect(api).toContain("fetch('/api/admin/users/pending')");
    expect(legacy).not.toContain('حسابات بانتظار التفعيل');
    expect(auth).toContain("const role = 'teacher';");
    expect(auth).toContain("const GOOGLE_SELF_REGISTER_ROLES = new Set(['teacher'])");
  });
});
