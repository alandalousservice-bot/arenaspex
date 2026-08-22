import { describe, expect, it } from 'vitest';
import { canReadDirectMessage, canReadDistrictMessage, normalizeMessageText } from '../src/services/communicationRules';

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
  });
});
