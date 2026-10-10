import crypto from 'node:crypto';

export const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_MAX_ISSUANCES_PER_HOUR = 5;

export function generateEmailVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hasEmailVerificationSecret() {
  const secret = process.env.EMAIL_VERIFICATION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function hashEmailVerificationCode(userId: string, code: string) {
  const secret = process.env.EMAIL_VERIFICATION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('EMAIL_VERIFICATION_SECRET must contain at least 32 characters.');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`spex-email-verification\0${userId}\0${code}`)
    .digest('hex');
}

export function equalVerificationHashes(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return (
    leftBuffer.length === 32 &&
    rightBuffer.length === 32 &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}
