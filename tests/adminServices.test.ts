import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const router = readFileSync('src/server/apiRouter.ts', 'utf8');
const page = readFileSync('src/components/dashboard/AdminServicesPage.tsx', 'utf8');
const workspace = readFileSync('src/components/dashboard/AdminWorkspacePage.tsx', 'utf8');
const detail = readFileSync('src/components/dashboard/AdminAccountDetailPage.tsx', 'utf8');

describe('admin service access workspace', () => {
  it('uses one authoritative safe overview read model', () => {
    expect(router).toContain('/admin/generation/overview');
    expect(router).toContain('prisma.user.findMany');
    expect(router).toContain('prisma.userGenerationAccess.findMany');
    expect(router).toContain('const safeProviders = providers.map');
    expect(router).toContain('keyConfigured: Boolean(row.encryptedApiKey)');
  });

  it('keeps service mutations admin-protected and whitelisted', () => {
    expect(router).toContain("put('/admin/generation/config', requireRole('admin')");
    expect(router).toContain("put('/admin/generation/access/:userId', requireRole('admin')");
    expect(router).toContain('encryptedApiKey = raw ? encryptApiKey(raw) : null');
    expect(router).toContain('upsert({');
    expect(router).not.toContain('data: req.body');
  });

  it('provides separate global, account, credential, fallback, and diagnostic sections', () => {
    for (const label of [
      'حالة الخدمة العامة',
      'صلاحيات الحسابات',
      'المفتاح الاحتياطي للمنصة',
      'تشخيص واختبار الخدمة',
      'حذف المفتاح الخاص',
      'فحص المفتاح الخاص',
    ])
      expect(page).toContain(label);
    expect(workspace).toContain("pathname === '/admin/services'");
    expect(detail).toContain("/admin/services?userId='");
    expect(page).not.toContain('customApiKey');
    expect(page).not.toContain('encryptedApiKey');
  });
});
