import { describe, expect, it } from 'vitest';
import {
  canReadDirectMessage,
  canReadDistrictMessage,
  normalizeMessageText,
  requiresAcceptedInspectorAssignment,
  canAccessDistrictCommunicationGroup,
  canAccessInspectorsGeneralGroup,
  canContactAuthorizedInspectorPeer,
  canReadDistrictGroupMessage,
  canReadInspectorsGeneralMessage,
  canReadGroupNotification,
  groupNotificationRecipientIds,
} from '../src/services/communicationRules';

const account = (values: Record<string, unknown> = {}) => ({
  id: 'user',
  role: 'teacher',
  status: 'active',
  isApprovedByAdmin: true,
  districtId: 'd1',
  ...values,
});

describe('قواعد التواصل المهني', () => {
  it('يرفض الرسائل الفارغة والطويلة ويطبع المسافات', () => {
    expect(normalizeMessageText('  سلام  ')).toBe('سلام');
    expect(normalizeMessageText('   ')).toBeNull();
    expect(normalizeMessageText('x'.repeat(4001))).toBeNull();
  });
  it('يحصر الرسالة الخاصة بالطرفين فقط أو الإدارة', () => {
    const row = { senderId: 'a', recipientId: 'b' };
    expect(canReadDirectMessage(row, 'a')).toBe(true);
    expect(canReadDirectMessage(row, 'b')).toBe(true);
    expect(canReadDirectMessage(row, 'c')).toBe(false);
    expect(canReadDirectMessage(row, 'c', true)).toBe(true);
  });
  it('يعزل رسائل المقاطعة مع دعم السجلات القديمة', () => {
    expect(canReadDistrictMessage({ districtId: 'd1' }, 'd1')).toBe(true);
    expect(canReadDistrictMessage({ districtId: 'd1' }, 'd2')).toBe(false);
    expect(canReadDistrictMessage({ legacyDistrictId: 'd1' }, 'd1')).toBe(true);
    expect(canReadDistrictMessage({}, '')).toBe(false);
  });
  it('يشترط علاقة إسناد مقبولة للتواصل المباشر بين المفتش والأستاذ فقط', () => {
    expect(requiresAcceptedInspectorAssignment('inspector', 'teacher')).toBe(true);
    expect(requiresAcceptedInspectorAssignment('teacher', 'inspector')).toBe(true);
    expect(requiresAcceptedInspectorAssignment('teacher', 'teacher')).toBe(false);
    expect(requiresAcceptedInspectorAssignment('inspector', 'inspector')).toBe(false);
  });

  it('يسمح بمجموعة المقاطعة للمعلم والمفتش النشطين المعتمدين ضمن مقاطعتهما فقط', () => {
    expect(canAccessDistrictCommunicationGroup({ user: account(), districtId: 'd1' })).toBe(true);
    expect(
      canAccessDistrictCommunicationGroup({
        user: account({ role: 'inspector', districtId: 'd1' }),
        districtId: 'd1',
      })
    ).toBe(true);
    expect(canAccessDistrictCommunicationGroup({ user: account(), districtId: 'd5' })).toBe(false);
    expect(
      canAccessDistrictCommunicationGroup({
        user: account({ status: 'inactive' }),
        districtId: 'd1',
      })
    ).toBe(false);
    expect(
      canAccessDistrictCommunicationGroup({
        user: account({ isApprovedByAdmin: false }),
        districtId: 'd1',
      })
    ).toBe(false);
    expect(
      canAccessDistrictCommunicationGroup({ user: account({ role: 'admin' }), districtId: 'd1' })
    ).toBe(false);
  });

  it('ينقل عضوية المعلم عند تغير مقاطعته الحالية فقط، مع بقاء الطلب المعلق دون تغيير', () => {
    const pendingTransferTeacher = account({ districtId: 'd1' });
    expect(
      canAccessDistrictCommunicationGroup({ user: pendingTransferTeacher, districtId: 'd1' })
    ).toBe(true);
    const acceptedTransferTeacher = account({ districtId: 'd5', eduDistrictId: 'd5' });
    expect(
      canAccessDistrictCommunicationGroup({ user: acceptedTransferTeacher, districtId: 'd1' })
    ).toBe(false);
    expect(
      canAccessDistrictCommunicationGroup({ user: acceptedTransferTeacher, districtId: 'd5' })
    ).toBe(true);
  });

  it('يقصر المجموعة العامة على المفتش النشط المعتمد، دون اشتراط المقاطعة نفسها', () => {
    const inspectorA = account({ id: 'i-a', role: 'inspector', districtId: 'd1' });
    const inspectorB = account({ id: 'i-b', role: 'inspector', districtId: 'd5' });
    expect(canAccessInspectorsGeneralGroup(inspectorA)).toBe(true);
    expect(canAccessInspectorsGeneralGroup(inspectorB)).toBe(true);
    expect(canAccessInspectorsGeneralGroup(account({ role: 'teacher' }))).toBe(false);
    expect(
      canAccessInspectorsGeneralGroup(account({ role: 'inspector', status: 'inactive' }))
    ).toBe(false);
    expect(
      canAccessInspectorsGeneralGroup(account({ role: 'inspector', isApprovedByAdmin: false }))
    ).toBe(false);
    expect(canContactAuthorizedInspectorPeer(inspectorA, inspectorB)).toBe(true);
    expect(canContactAuthorizedInspectorPeer(inspectorA, account({ role: 'teacher' }))).toBe(false);
  });

  it('يعزل أنواع الرسائل ويرفض السجلات ذات المقاطعة الفارغة أو غير المطابقة', () => {
    expect(canReadDistrictGroupMessage({ districtId: 'd1' }, 'd1')).toBe(true);
    expect(
      canReadDistrictGroupMessage({ districtId: 'd1', data: { groupScope: 'district' } }, 'd1')
    ).toBe(true);
    expect(
      canReadDistrictGroupMessage(
        { districtId: null, data: { districtId: null } },
        ''
      )
    ).toBe(false);
    expect(canReadDistrictGroupMessage({ districtId: 'd5' }, 'd1')).toBe(false);
    expect(
      canReadDistrictGroupMessage(
        { districtId: 'd1', data: { groupScope: 'inspectors_general' } },
        'd1'
      )
    ).toBe(false);
    expect(
      canReadDistrictGroupMessage(
        { districtId: null, data: { groupScope: 'inspectors_general' } },
        'd1'
      )
    ).toBe(false);
    expect(
      canReadInspectorsGeneralMessage({
        districtId: null,
        data: { groupScope: 'inspectors_general' },
      })
    ).toBe(true);
    expect(canReadInspectorsGeneralMessage({ districtId: 'd1', data: { groupScope: 'district' } })).toBe(
      false
    );
    expect(canReadInspectorsGeneralMessage({ districtId: null, data: {} })).toBe(false);
  });

  it('يوجه إشعارات المجموعات للأعضاء الحاليين دون المرسل ويعزل إشعاراتها', () => {
    expect(groupNotificationRecipientIds(['i1', 't1', 'i1'], 'i1')).toEqual(['t1']);
    expect(canReadGroupNotification({ groupScope: 'district', districtId: 'd1' }, 'd1', false)).toBe(
      true
    );
    expect(canReadGroupNotification({ groupScope: 'district', districtId: 'd1' }, 'd5', false)).toBe(
      false
    );
    expect(canReadGroupNotification({ groupScope: 'inspectors_general' }, null, true)).toBe(true);
    expect(canReadGroupNotification({ groupScope: 'inspectors_general' }, null, false)).toBe(false);
    expect(canReadGroupNotification({ messageId: 'other' }, null, false)).toBe(true);
  });
});
