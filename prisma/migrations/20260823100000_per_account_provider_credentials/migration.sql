ALTER TABLE "UserGenerationAccess" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE "UserGenerationAccess" ADD COLUMN "encryptedApiKey" TEXT;
ALTER TABLE "UserGenerationAccess" ADD COLUMN "credentialEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserGenerationAccess" ADD COLUMN "updatedByAdminId" TEXT;
