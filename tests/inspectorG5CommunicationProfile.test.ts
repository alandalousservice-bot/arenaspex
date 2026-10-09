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
    expect(hub).toContain("'?scope=inspector-contacts'");
    expect(hub).toContain('inspectorCommunication');
    expect(api).toContain("req.query.scope === 'assigned-teachers'");
    expect(api).toContain('requiresAcceptedInspectorAssignment(requester.role, target.role)');
    expect(api).toContain('authorizedContacts.map');
    expect(api).not.toContain('InspectorMessage');
    expect(api).not.toContain('InspectorChat');
  });

  it('scopes DistrictMessage to the authenticated administrative district', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).toContain('getDistrictCommunicationContext(req.user!.id)');
    expect(api).toContain('where: { districtId: context.districtId }');
    expect(api).toContain("data: { groupScope: 'district', text }");
    expect(api).toContain('districtCommunicationMemberIds(context.districtId, tx)');
    expect(api).not.toContain("path: 'district-messages'");
    expect(read('src/services/api.ts')).not.toContain("'/api/db/district-messages'");
  });

  it('separates the authorized Inspectors group and cross-district Inspector contacts', () => {
    const api = read('src/server/apiRouter.ts');
    const hub = read('src/components/community/ProfessionalHub.tsx');
    expect(api).toContain("apiRouter.get('/communication/inspectors-messages'");
    expect(api).toContain("apiRouter.post('/communication/inspectors-messages'");
    expect(api).toContain("data: { groupScope: 'inspectors_general', text }");
    expect(api).toContain('canAccessInspectorsGeneralGroup(user)');
    expect(api).toContain("req.query.scope === 'inspector-contacts'");
    expect(api).toContain('canContactAuthorizedInspectorPeer(requester, target)');
    expect(api).not.toContain("path: 'direct-messages'");
    expect(read('src/services/api.ts')).not.toContain("'/api/db/direct-messages'");
    expect(hub).toContain("'/communication/inspectors-messages'");
    expect(hub).toContain("['inspectors', 'مجموعة المفتشين'");
  });

  it('does not claim per-message group read receipts and filters stale group notices', () => {
    const api = read('src/server/apiRouter.ts');
    const hub = read('src/components/community/ProfessionalHub.tsx');
    expect(api).toContain('canReadGroupNotification(data, districtContext?.districtId || null');
    expect(api).toContain('message: \'توجد رسالة جديدة في مجموعة التواصل المهني.\'');
    expect(hub).toContain("item.data?.groupScope === 'district'");
    expect(hub).toContain("item.data?.groupScope === 'inspectors_general'");
    const districtMessageType = hub.slice(
      hub.indexOf('interface DistrictMessage'),
      hub.indexOf('interface DistrictGroupResponse')
    );
    expect(districtMessageType).not.toContain('readAt');
  });

  it('protects read state and notifications by recipient identity', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).toContain('view.recipientId !== req.user!.id');
    expect(api).toContain('canContactUser(req.user!.id, req.user!.role, view.senderId)');
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
    expect(workspace).toContain('<ProfessionalHub currentUser={inspector} inspectorCommunication />');
    expect(api).toContain('prisma.inspectorNote');
    expect(api).not.toContain('ResourceReviewMessage');
    expect(workspace).not.toContain('إرسال للجميع');
  });
});
