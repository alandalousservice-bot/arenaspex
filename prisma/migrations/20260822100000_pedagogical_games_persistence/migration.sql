CREATE TABLE "PedagogicalGame" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "objectiveId" TEXT,
    "objectiveText" TEXT NOT NULL,
    "pedagogicalPurpose" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "executionGuidance" TEXT,
    "safetyGuidance" TEXT,
    "progression" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'TEACHER',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PedagogicalGame_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PedagogicalGame_ownerId_idx" ON "PedagogicalGame"("ownerId");
CREATE INDEX "PedagogicalGame_status_idx" ON "PedagogicalGame"("status");
CREATE INDEX "PedagogicalGame_grade_idx" ON "PedagogicalGame"("grade");
CREATE INDEX "PedagogicalGame_fieldId_idx" ON "PedagogicalGame"("fieldId");
CREATE INDEX "PedagogicalGame_createdAt_idx" ON "PedagogicalGame"("createdAt");
CREATE INDEX "PedagogicalGame_status_grade_fieldId_idx" ON "PedagogicalGame"("status", "grade", "fieldId");
ALTER TABLE "PedagogicalGame" ADD CONSTRAINT "PedagogicalGame_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
