import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const auth = readFileSync('src/components/auth/AuthScreen.tsx', 'utf8');
const admin = readFileSync('src/components/auth/AdminLoginPage.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const landing = readFileSync('src/components/landing/LandingScreen.tsx', 'utf8');
const router = readFileSync('src/server/authRouter.ts', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');
describe('separate Admin authentication portal', () => {
  it('keeps the professional portal limited to Teacher and Inspector', () => {
    expect(auth).not.toContain("selectedRole === 'admin'");
    expect(auth).not.toContain('value="admin"');
    expect(auth).toContain("selectedRole === 'inspector'");
    expect(auth).toContain("loginRequest(email.trim(), password, 'professional')");
  });
  it('provides a credential-only Admin portal without registration or Google signup', () => {
    expect(app).toContain("location.pathname === '/admin/login'");
    expect(app).toContain('AdminLoginPage');
    expect(admin).toContain('دخول إدارة المنظومة');
    expect(admin).toContain("loginRequest(email.trim(), password, 'admin')");
    expect(admin).not.toContain('GoogleSignInButton');
    expect(admin).not.toContain('إنشاء حساب');
    expect(landing).toContain('onGoToAdminLogin');
  });
  it('enforces portal choice on the server using the persisted role', () => {
    expect(router).toContain("portal: z.enum(['professional', 'admin'])");
    expect(router).toContain("portal === 'admin' && user.role !== 'admin'");
    expect(router).toContain("portal === 'professional' && user.role === 'admin'");
    expect(router).toContain('AUTH_PORTAL_MISMATCH');
    expect(api).toContain('body: JSON.stringify({ email, password, portal })');
  });
  it('keeps unknown Google identities out of Admin creation', () => {
    expect(router).toContain("if (requestedRole === 'admin')");
    expect(router).toContain("user.role === 'admin' && requestedRole !== 'admin'");
  });
});
