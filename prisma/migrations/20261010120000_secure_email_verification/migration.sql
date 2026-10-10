ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3);

CREATE TABLE "EmailVerificationChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMPTZ(3) NOT NULL,
    "issuanceWindowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "issuanceCount" INTEGER NOT NULL DEFAULT 1,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationChallenge_userId_key"
ON "EmailVerificationChallenge"("userId");

CREATE INDEX "EmailVerificationChallenge_expiresAt_idx"
ON "EmailVerificationChallenge"("expiresAt");

CREATE INDEX "EmailVerificationChallenge_lastSentAt_idx"
ON "EmailVerificationChallenge"("lastSentAt");

ALTER TABLE "EmailVerificationChallenge"
ADD CONSTRAINT "EmailVerificationChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
