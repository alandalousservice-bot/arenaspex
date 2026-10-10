import { prisma } from './prismaClient.js';
import { isEmailConfigured, sendEmailVerificationCode } from './emailService.js';
import {
  EMAIL_VERIFICATION_CODE_TTL_MS,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_MAX_ISSUANCES_PER_HOUR,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  equalVerificationHashes,
  generateEmailVerificationCode,
  hashEmailVerificationCode,
  hasEmailVerificationSecret,
} from './emailVerification.js';

type UserForVerification = {
  id: string;
  email: string;
  firstName: string;
  emailVerifiedAt: Date | null;
};
const isUniqueConflict = (error: unknown) =>
  Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );

export type VerificationIssueResult =
  'sent' | 'already_verified' | 'cooldown' | 'rate_limited' | 'unavailable';

export async function issueEmailVerification(
  user: UserForVerification,
  now = new Date()
): Promise<VerificationIssueResult> {
  if (user.emailVerifiedAt) return 'already_verified';
  if (!isEmailConfigured() || !hasEmailVerificationSecret()) return 'unavailable';

  let code = generateEmailVerificationCode();
  let codeHash = hashEmailVerificationCode(user.id, code);
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_CODE_TTL_MS);
  const cooldownBefore = new Date(now.getTime() - EMAIL_VERIFICATION_RESEND_COOLDOWN_MS);
  const issuanceWindowBefore = new Date(now.getTime() - 60 * 60 * 1000);

  let issued = false;
  try {
    issued = await prisma.$transaction(async (tx) => {
      const existing = await tx.emailVerificationChallenge.findUnique({
        where: { userId: user.id },
      });
      if (!existing) {
        await tx.emailVerificationChallenge.create({
          data: {
            userId: user.id,
            codeHash,
            expiresAt,
            failedAttempts: 0,
            lastSentAt: now,
            issuanceWindowStartedAt: now,
            issuanceCount: 1,
            consumedAt: null,
          },
        });
        return true;
      }
      if (existing.lastSentAt.getTime() > cooldownBefore.getTime()) return false;

      // A newly issued code must differ from the still-valid prior code even in the rare event of a random collision.
      if (existing.codeHash && equalVerificationHashes(existing.codeHash, codeHash)) {
        do {
          code = generateEmailVerificationCode();
          codeHash = hashEmailVerificationCode(user.id, code);
        } while (equalVerificationHashes(existing.codeHash, codeHash));
      }

      const inIssuanceWindow =
        existing.issuanceWindowStartedAt.getTime() > issuanceWindowBefore.getTime();
      if (inIssuanceWindow && existing.issuanceCount >= EMAIL_VERIFICATION_MAX_ISSUANCES_PER_HOUR)
        return false;
      const updated = await tx.emailVerificationChallenge.updateMany({
        where: { id: existing.id, lastSentAt: { lte: cooldownBefore } },
        data: {
          codeHash,
          expiresAt,
          failedAttempts: 0,
          lastSentAt: now,
          issuanceWindowStartedAt: inIssuanceWindow ? existing.issuanceWindowStartedAt : now,
          issuanceCount: inIssuanceWindow ? { increment: 1 } : 1,
          consumedAt: null,
        },
      });
      return updated.count === 1;
    });
  } catch (error) {
    // Concurrent first issuance is settled by the unique userId constraint; only one request may send.
    if (!isUniqueConflict(error)) throw error;
  }

  if (!issued) return 'cooldown';
  const result = await sendEmailVerificationCode(user.email, user.firstName, code);
  if (!result.sent) {
    await prisma.emailVerificationChallenge.updateMany({
      where: { userId: user.id, codeHash, consumedAt: null },
      data: { codeHash: null, expiresAt: null, consumedAt: now },
    });
  }
  return result.sent ? 'sent' : 'unavailable';
}

export type VerificationResult =
  { kind: 'verified'; user: any } | { kind: 'invalid' | 'expired' | 'locked' | 'replay' };

export async function verifyEmailCode(
  userId: string,
  code: string,
  now = new Date()
): Promise<VerificationResult> {
  if (!/^\d{6}$/.test(code) || !hasEmailVerificationSecret()) return { kind: 'invalid' };
  const submittedHash = hashEmailVerificationCode(userId, code);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return { kind: 'invalid' } as const;
    if (user.emailVerifiedAt) return { kind: 'replay' } as const;
    const challenge = await tx.emailVerificationChallenge.findUnique({ where: { userId } });
    if (!challenge || challenge.consumedAt || !challenge.codeHash)
      return { kind: 'invalid' } as const;
    if (!challenge.expiresAt || challenge.expiresAt.getTime() <= now.getTime()) {
      await tx.emailVerificationChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: now, codeHash: null },
      });
      return { kind: 'expired' } as const;
    }
    if (challenge.failedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS)
      return { kind: 'locked' } as const;
    if (!equalVerificationHashes(challenge.codeHash, submittedHash)) {
      await tx.emailVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          failedAttempts: { lt: EMAIL_VERIFICATION_MAX_ATTEMPTS },
        },
        data: { failedAttempts: { increment: 1 } },
      });
      return { kind: 'invalid' } as const;
    }
    const consumed = await tx.emailVerificationChallenge.updateMany({
      where: {
        id: challenge.id,
        codeHash: submittedHash,
        consumedAt: null,
        expiresAt: { gt: now },
        failedAttempts: { lt: EMAIL_VERIFICATION_MAX_ATTEMPTS },
      },
      data: { codeHash: null, consumedAt: now },
    });
    if (consumed.count !== 1) return { kind: 'replay' } as const;
    const verifiedUser = await tx.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: now },
    });
    return { kind: 'verified', user: verifiedUser } as const;
  });
}
