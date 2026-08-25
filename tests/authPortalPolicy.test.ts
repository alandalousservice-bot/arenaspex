import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const authScreen = readFileSync('src/components/auth/AuthScreen.tsx', 'utf8');
const authRouter = readFileSync('src/server/authRouter.ts', 'utf8');
const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
const adminDashboard = readFileSync('src/components/dashboard/AdminDashboard.tsx', 'utf8');

describe('public auth portal policy', () => {
  it('keeps admin login-only and removes district-specific inspector labels', () => {
    expect(authScreen).toContain("selectedRole !== 'admin'");
    expect(authScreen).not.toContain('مفتش التربية البدنية والرياضية (مقاطعة 07)');
    expect(authScreen).not.toMatch(/<option[^>]+value=["']admin["'][^>]*>[^<]*(إنشاء|تسجيل)/);
  });

  it('forces public registration and unknown Google accounts to pending teachers', () => {
    expect(authRouter).toContain("z.enum(['teacher', 'inspector'])");
    expect(authRouter).toContain("const role = 'teacher';");
    expect(authRouter).toContain("const GOOGLE_SELF_REGISTER_ROLES = new Set(['teacher'])");
    expect(authRouter).toContain("status: 'pending_approval'");
    expect(authRouter).toContain("directorateId: ''");
    expect(authRouter).toContain("districtId: ''");
  });

  it('keeps the persisted account-management list separate from the pending queue', () => {
    expect(apiRouter).toContain("apiRouter.get('/admin/users/pending'");
    expect(apiRouter).toContain("apiRouter.get('/admin/users'");
    expect(apiRouter).toContain("apiRouter.post('/admin/users/:id/activate'");
    expect(adminDashboard).toContain('إدارة الحسابات والمستخدمين');
    expect(adminDashboard).not.toContain('حسابات بانتظار التفعيل');
    expect(adminDashboard).toContain('fetchManagedUsersFromDB');
  });
});
