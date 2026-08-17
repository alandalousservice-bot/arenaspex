import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  sanitizeUser,
  sanitizeOwnUser,
  encryptApiKey,
  decryptApiKey,
  generateResetToken,
  hashResetToken
} from '../src/server/auth';

describe('hashPassword / verifyPassword', () => {
  it('يتحقق بنجاح من كلمة المرور الصحيحة فقط', async () => {
    const hash = await hashPassword('mySecurePass123');

    expect(await verifyPassword('mySecurePass123', hash)).toBe(true);
    expect(await verifyPassword('wrongPass', hash)).toBe(false);
  });

  it('لا يخزّن كلمة المرور كنص عادي (الهاش مختلف عن القيمة الأصلية)', async () => {
    const hash = await hashPassword('mySecurePass123');
    expect(hash).not.toBe('mySecurePass123');
  });

  it('يرفض التحقق بأمان عند غياب القيم بدل رمي استثناء', async () => {
    expect(await verifyPassword('', 'somehash')).toBe(false);
    expect(await verifyPassword('pass', '')).toBe(false);
  });
});

describe('sanitizeUser / sanitizeOwnUser', () => {
  const fullUser = {
    id: 'u1',
    email: 'teacher@example.com',
    passwordHash: 'hash-should-never-leave-server',
    password: 'plaintext-should-never-exist',
    customApiKey: 'sk-visible-to-owner-only',
    encryptedApiKey: 'encrypted-blob',
    firstName: 'Amine'
  };

  it('sanitizeUser يحذف كل الحقول الحسّاسة عند عرض حساب مستخدم آخر', () => {
    const safe = sanitizeUser(fullUser);

    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('customApiKey');
    expect(safe).not.toHaveProperty('encryptedApiKey');
    expect(safe.firstName).toBe('Amine');
  });

  it('sanitizeOwnUser يحذف الأسرار لكنه يفصح فقط عن كون المفتاح مُهيّأً (apiKeyConfigured)', () => {
    const safe = sanitizeOwnUser(fullUser);

    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).not.toHaveProperty('customApiKey');
    expect(safe).not.toHaveProperty('encryptedApiKey');
    expect(safe.apiKeyConfigured).toBe(true);
  });

  it('sanitizeOwnUser يضع apiKeyConfigured=false عند غياب أي مفتاح', () => {
    const safe = sanitizeOwnUser({ ...fullUser, customApiKey: '', encryptedApiKey: null });
    expect(safe.apiKeyConfigured).toBe(false);
  });
});

describe('encryptApiKey / decryptApiKey', () => {
  it('يفكّ تشفير القيمة إلى نصها الأصلي بالضبط', () => {
    const original = 'sk-ant-super-secret-key-1234';
    const encrypted = encryptApiKey(original);

    expect(encrypted).not.toContain(original);
    expect(decryptApiKey(encrypted)).toBe(original);
  });

  it('يرمي خطأً عند محاولة فك تشفير قيمة غير صالحة الصيغة', () => {
    expect(() => decryptApiKey('not-a-valid-payload')).toThrow();
  });
});

describe('generateResetToken / hashResetToken', () => {
  it('الهاش المخزَّن يطابق دائماً هاش الرمز الخام نفسه', () => {
    const { rawToken, tokenHash } = generateResetToken();
    expect(hashResetToken(rawToken)).toBe(tokenHash);
  });

  it('لا يخزّن الرمز الخام أبداً (الهاش مختلف عن الرمز نفسه) وله مدة صلاحية 30 دقيقة', () => {
    const { rawToken, tokenHash, expiresAt } = generateResetToken();

    expect(tokenHash).not.toBe(rawToken);
    const minutesFromNow = (expiresAt.getTime() - Date.now()) / 60000;
    expect(minutesFromNow).toBeGreaterThan(29);
    expect(minutesFromNow).toBeLessThanOrEqual(30);
  });
});
