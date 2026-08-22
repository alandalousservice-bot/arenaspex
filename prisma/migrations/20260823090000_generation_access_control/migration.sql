CREATE TABLE "GenerationServiceConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GenerationServiceConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGenerationAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "assistantEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gameSuggestionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserGenerationAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserGenerationAccess_userId_key" ON "UserGenerationAccess"("userId");
CREATE INDEX "UserGenerationAccess_enabled_idx" ON "UserGenerationAccess"("enabled");
ALTER TABLE "UserGenerationAccess" ADD CONSTRAINT "UserGenerationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
