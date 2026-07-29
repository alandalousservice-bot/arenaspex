/**
 * SPEX - Authentication Core
 * تجزئة كلمات المرور (bcrypt) وتوقيع/التحقق من جلسات JWT عبر كوكيز httpOnly آمنة
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'spex_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 أيام

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // فشل مبكر ومقروء بدل التشغيل بمفتاح ضعيف أو غير موجود في الإنتاج
  if (IS_PRODUCTION) {
    throw new Error(
      'JWT_SECRET غير معرّف أو قصير جداً (يجب 32 حرفاً على الأقل). عرّفه في متغيرات البيئة قبل التشغيل في الإنتاج.'
    );
  } else {
    console.warn('⚠️ JWT_SECRET غير معرّف في .env — سيتم استخدام مفتاح تطوير مؤقت غير آمن للإنتاج.');
  }
}

const EFFECTIVE_SECRET = JWT_SECRET && JWT_SECRET.length >= 32 ? JWT_SECRET : 'dev-only-insecure-secret-change-me-32chars';

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

// حقول لا يجب أبداً أن تغادر الخادم باتجاه العميل
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash' | 'password'> {
  const { passwordHash, password, ...safe } = user as any;
  return safe;
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
