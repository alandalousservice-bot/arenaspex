import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Inspector G5 communication and profile boundaries', () => {
  it('uses one shared DirectMessage backend and derives sender identity server-side', () => {
    const api = read('src/server/apiRouter.ts');
    const hub = read('src/components/community/ProfessionalHub.tsx');
    expect(api).toContain("apiRouter.post('/communication/direct-messages'");
    expect(api).toContain('senderId: user.id');
    expect(api).toContain('canContactUser(user.id, user.role, recipientId)');
    expect(hub).toContain("'/communication/direct-messages'");
    expect(api).not.toContain('InspectorMessage');
    expect(api).not.toContain('InspectorChat');
  });

  it('scopes DistrictMessage to the authenticated administrative district', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).toContain('const currentDistrictId =');
    expect(api).toContain('req.user!.districtId');
    expect(api).toContain('eduDistrictId');
    expect(api).toContain('districtId: currentDistrictId');
    expect(api).toContain('لا ينتمي حسابك إلى مقاطعة صالحة');
  });

  it('protects read state and notifications by recipient identity', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).toContain('where: { id: req.params.id, recipientId: req.user!.id }');
    expect(api).toContain('where: { id: req.params.id, userId: req.user!.id }');
    expect(api).toContain('where: { userId: req.user!.id }');
    expect(api).not.toContain('broadcast-to-all');
  });

  it('makes Inspector profile updates self-only and blocks administrative self-editing', () => {
    const api = read('src/server/apiRouter.ts');
    const settings = read('src/components/settings/SettingsView.tsx');
    expect(api).toContain('المفتش لا يمكنه تعديل ملف مستخدم آخر');
    expect(api).toContain("if (isSelf && req.user!.role === 'inspector')");
    expect(api).toContain('delete user.directorateId');
    expect(api).toContain('delete user.districtId');
    expect(api).toContain('delete user.institutionId');
    expect(settings).toContain("const isInspector = currentUser.role === 'inspector';");
    expect(settings).toContain("currentUser.role === 'admin'");
  });

  it('keeps guidance distinct from messaging and does not add fake broadcast or resource review messages', () => {
    const api = read('src/server/apiRouter.ts');
    const workspace = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    expect(workspace).toContain('onAddDirectMessage');
    expect(api).toContain('prisma.inspectorNote');
    expect(api).not.toContain('ResourceReviewMessage');
    expect(workspace).not.toContain('إرسال للجميع');
  });
});
