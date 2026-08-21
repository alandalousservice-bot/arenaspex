CREATE TABLE "EducationalSituation" (
  "id" TEXT NOT NULL,
  "externalId" TEXT,
  "name" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "fieldId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "objectiveIds" TEXT[] NOT NULL,
  "objectiveTexts" TEXT[] NOT NULL,
  "sourceGoal" TEXT NOT NULL,
  "organization" TEXT NOT NULL,
  "equipment" TEXT[] NOT NULL,
  "variations" TEXT,
  "origin" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PRIVATE',
  "ownerId" TEXT,
  "approvedById" TEXT,
  "approvedByRole" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" TEXT,
  "rejectedByRole" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EducationalSituation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EducationalSituation_externalId_key" ON "EducationalSituation"("externalId");
CREATE INDEX "EducationalSituation_grade_fieldId_status_idx" ON "EducationalSituation"("grade", "fieldId", "status");
CREATE INDEX "EducationalSituation_ownerId_status_idx" ON "EducationalSituation"("ownerId", "status");
