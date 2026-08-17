import { describe, it, expect } from 'vitest';
import { canWriteRecord, resolveOwnerFieldValue } from '../src/server/collectionAuth';

describe('canWriteRecord', () => {
  it('يسمح دائماً بإنشاء سجل جديد (لا يوجد existing بعد)', () => {
    expect(canWriteRecord(null, { id: 'u1', role: 'teacher' }, 'ownerId')).toBe(true);
  });

  it('admin يملك صلاحية الكتابة على أي سجل حتى لو لم يكن صاحبه', () => {
    const record = { id: 'r1', ownerId: 'someone-else' };
    expect(canWriteRecord(record, { id: 'admin1', role: 'admin' }, 'ownerId')).toBe(true);
  });

  it('بلا ownerField معرَّف: أي مستخدم مسجَّل دخول يملك صلاحية الكتابة (محتوى عام)', () => {
    const record = { id: 'r1' };
    expect(canWriteRecord(record, { id: 'u1', role: 'teacher' }, undefined)).toBe(true);
  });

  it('يمنع مستخدماً عادياً من تعديل سجل ليس صاحبه', () => {
    const record = { id: 'r1', ownerId: 'owner-1' };
    expect(canWriteRecord(record, { id: 'someone-else', role: 'teacher' }, 'ownerId')).toBe(false);
  });

  it('يسمح لصاحب السجل بتعديله', () => {
    const record = { id: 'r1', ownerId: 'owner-1' };
    expect(canWriteRecord(record, { id: 'owner-1', role: 'teacher' }, 'ownerId')).toBe(true);
  });
});

describe('resolveOwnerFieldValue', () => {
  it('لا يغيّر قيمة الحقل عند تعديل سجل موجود (منع انتحال ملكية سجل قائم)', () => {
    const existing = { id: 'r1', senderId: 'original-owner' };
    const result = resolveOwnerFieldValue(existing, { senderId: 'attacker-id' }, 'attacker-id', true, 'senderId');
    expect(result).toBe('original-owner');
  });

  it('ownerAssignedByServer=true يفرض هوية المستخدم الحالي عند الإنشاء (مثال: senderId في الرسائل)', () => {
    // هذا بالضبط ما يمنع انتحال هوية المُرسِل في direct-messages
    const result = resolveOwnerFieldValue(null, { senderId: 'spoofed-id' }, 'real-user-id', true, 'senderId');
    expect(result).toBe('real-user-id');
  });

  it('ownerAssignedByServer=false يأخذ القيمة من العميل عند الإنشاء (مثال: userId/المستلم في الإشعارات)', () => {
    // هذا هو الإصلاح لخلل إشعارات المجتمع: يجب أن يصل الإشعار للمستلم الحقيقي
    // الذي حدّده العميل (userId)، وليس لمن أنشأ الإشعار.
    const result = resolveOwnerFieldValue(null, { userId: 'recipient-id' }, 'sender-id', false, 'userId');
    expect(result).toBe('recipient-id');
  });

  it('ownerAssignedByServer=false يستخدم المستخدم الحالي كسقوط افتراضي آمن عند غياب القيمة من العميل', () => {
    const result = resolveOwnerFieldValue(null, {}, 'sender-id', false, 'userId');
    expect(result).toBe('sender-id');
  });
});
