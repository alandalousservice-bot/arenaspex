/**
 * SPEX - Authentication Core
 * تجزئة كلمات المرور (bcrypt) وتوقيع/التحقق من جلسات JWT عبر كوكيز httpOnly آمنة
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET?.trim();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'spex_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 أيام

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (IS_PRODUCTION) {
    throw new Error('FATAL: JWT_SECRET must be configured and contain at least 32 characters in production.');
  }
  console.warn('⚠️ JWT_SECRET غير معرّف أو قصير في بيئة التطوير. استخدم سراً قوياً قبل أي نشر.');
}

const EFFECTIVE_SECRET = JWT_SECRET || 'development-only-secret-do-not-use-in-production';

export interface SessionPayload {
  userId: string;
  role: string;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, EFFECTIVE_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, EFFECTIVE_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/'
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: IS_PRODUCTION, sameSite: 'lax', path: '/' });
}

export function getSessionTokenFromRequest(req: Request): string | undefined {
  return req.cookies?.[COOKIE_NAME];
}

// حقول لا يجب أبداً أن تغادر الخادم باتجاه العميل عند عرض حساب مستخدم آخر
// (customApiKey سرّ خاص بصاحبه فقط - لا يجوز أن يراه بقية المستخدمين، بمن فيهم admin/inspector،
// عبر قوائم المستخدمين أو أي استجابة تخص حساباً غير حساب صاحب الطلب نفسه)
export function sanitizeUser<T extends Record<string, unknown>>(
  user: T
): Omit<T, 'passwordHash' | 'password' | 'customApiKey' | 'encryptedApiKey'> {
  const safe = { ...user };
  delete (safe as Record<string, unknown>).passwordHash;
  delete (safe as Record<string, unknown>).password;
  delete (safe as Record<string, unknown>).customApiKey;
  delete (safe as Record<string, unknown>).encryptedApiKey;
  return safe as Omit<T, 'passwordHash' | 'password' | 'customApiKey' | 'encryptedApiKey'>;
}

// نسخة "حسابي الشخصي" فقط: تُستخدم حصراً عند إعادة بيانات صاحب الطلب نفسه
// (تسجيل الدخول، /me، التسجيل...) حيث يحتاج العميل لاسترجاع مفتاحه الخاص الذي أدخله بنفسه
export function sanitizeOwnUser<T extends Record<string, unknown>>(user: T) {
  const safe = { ...user } as Record<string, unknown>;
  const configured = Boolean((safe.customApiKey && String(safe.customApiKey).trim()) || safe.encryptedApiKey);
  delete safe.passwordHash;
  delete safe.password;
  delete safe.customApiKey;
  delete safe.encryptedApiKey;
  safe.apiKeyConfigured = configured;
  return safe;
}

// -----------------------------------------------------------------------
// Application-level encryption for user-provided AI API keys.
// The encryption key must be provided through API_KEY_ENCRYPTION_SECRET.
// -----------------------------------------------------------------------
const API_KEY_ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET?.trim();

function getEncryptionKey(): Buffer {
  if (!API_KEY_ENCRYPTION_SECRET || API_KEY_ENCRYPTION_SECRET.length < 32) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be configured with at least 32 characters.');
  }
  return crypto.createHash('sha256').update(API_KEY_ENCRYPTION_SECRET).digest();
}

export function encryptApiKey(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptApiKey(payload: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split('.');
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error('Invalid encrypted API key payload.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64url')), decipher.final()]).toString('utf8');
}

// -----------------------------------------------------------------------
// Password Reset Tokens
// نولّد رمزاً عشوائياً خاماً يُرسَل في رابط البريد، ونخزّن هاشه فقط في قاعدة البيانات
// (بنفس منطق عدم تخزين الأسرار كنص عادي المطبّق على كلمات المرور)
// -----------------------------------------------------------------------
export const RESET_TOKEN_TTL_MINUTES = 30;

export function generateResetToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
