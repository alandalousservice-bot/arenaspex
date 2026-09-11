-- Additive Educational Situation Bank infrastructure. No dataset import.
CREATE TYPE "SituationActivityType" AS ENUM ('GAME', 'PEDAGOGICAL_ACTIVITY', 'OTHER', 'UNRESOLVED');
CREATE TYPE "SituationObjectiveRelationType" AS ENUM ('DIRECT', 'SUPPORTIVE', 'INTEGRATIVE');
CREATE TYPE "SituationProductionEligibility" AS ENUM ('AUTO_GENERATION_ELIGIBLE', 'REVIEW_ONLY', 'SOURCE_ARCHIVE_ONLY');
CREATE TYPE "SituationApprovalStatus" AS ENUM ('PERSONAL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "SituationMediaClassification" AS ENUM ('SPECIFIC_GAME_IMAGE', 'SPECIFIC_SITUATION_IMAGE', 'GENERIC_DOMAIN_ILLUSTRATION', 'GENERIC_MOTOR_SKILL_ILLUSTRATION', 'UNRESOLVED');

ALTER TABLE "EducationalSituation"
  ADD COLUMN "activityType" "SituationActivityType",
  ADD COLUMN "approvalStatus" "SituationApprovalStatus",
  ADD COLUMN "productionEligibility" "SituationProductionEligibility",
  ADD COLUMN "gradeId" TEXT,
  ADD COLUMN "domainId" TEXT,
  ADD COLUMN "lessonTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "executionConditions" TEXT,
  ADD COLUMN "successCriteria" TEXT,
  ADD COLUMN "observationIndicators" TEXT,
  ADD COLUMN "motorActions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "pedagogicalTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "difficulty" TEXT,
  ADD COLUMN "progressionStage" TEXT,
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "resubmittedAt" TIMESTAMP(3);

CREATE TABLE "SituationObjective" (
  "id" TEXT NOT NULL,
  "situationId" TEXT NOT NULL,
  "objectiveId" TEXT NOT NULL,
  "relationType" "SituationObjectiveRelationType" NOT NULL,
  "confidence" DOUBLE PRECISION,
  "evidence" JSONB,
  "reviewStatus" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "SituationObjective_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SituationObjective_situationId_objectiveId_key" ON "SituationObjective"("situationId", "objectiveId");
CREATE INDEX "SituationObjective_objectiveId_relationType_idx" ON "SituationObjective"("objectiveId", "relationType");
ALTER TABLE "SituationObjective" ADD CONSTRAINT "SituationObjective_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "EducationalSituation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SituationFamily" (
  "id" TEXT NOT NULL,
  "normalizedTitle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SituationFamily_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SituationFamily_normalizedTitle_idx" ON "SituationFamily"("normalizedTitle");

CREATE TABLE "SituationFamilyMember" (
  "familyId" TEXT NOT NULL,
  "situationId" TEXT NOT NULL,
  "membership" TEXT NOT NULL,
  CONSTRAINT "SituationFamilyMember_pkey" PRIMARY KEY ("familyId", "situationId")
);
CREATE INDEX "SituationFamilyMember_situationId_membership_idx" ON "SituationFamilyMember"("situationId", "membership");
ALTER TABLE "SituationFamilyMember" ADD CONSTRAINT "SituationFamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "SituationFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SituationFamilyMember" ADD CONSTRAINT "SituationFamilyMember_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "EducationalSituation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SituationSourceOccurrence" (
  "id" TEXT NOT NULL,
  "situationId" TEXT NOT NULL,
  "sourceFile" TEXT NOT NULL,
  "sourceDocumentId" TEXT,
  "sourceLesson" TEXT,
  "sourceLessonType" TEXT NOT NULL,
  "originalSourceObjective" TEXT,
  "originalTitle" TEXT,
  "originalDescription" TEXT,
  "sourceGrade" TEXT,
  "sourceDomain" TEXT,
  "sourceLocator" TEXT,
  "normalizedHash" TEXT,
  "sourceConsistencyFlag" TEXT,
  "sourceConsistencyNote" TEXT,
  "provenance" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SituationSourceOccurrence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SituationSourceOccurrence_situationId_sourceLessonType_idx" ON "SituationSourceOccurrence"("situationId", "sourceLessonType");
CREATE INDEX "SituationSourceOccurrence_normalizedHash_idx" ON "SituationSourceOccurrence"("normalizedHash");
ALTER TABLE "SituationSourceOccurrence" ADD CONSTRAINT "SituationSourceOccurrence_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "EducationalSituation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SituationMedia" (
  "id" TEXT NOT NULL,
  "situationId" TEXT NOT NULL,
  "sourceOccurrenceId" TEXT,
  "mediaRef" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "classification" "SituationMediaClassification" NOT NULL,
  "provenance" JSONB,
  "reviewStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SituationMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SituationMedia_situationId_classification_idx" ON "SituationMedia"("situationId", "classification");
CREATE INDEX "SituationMedia_sourceOccurrenceId_idx" ON "SituationMedia"("sourceOccurrenceId");
ALTER TABLE "SituationMedia" ADD CONSTRAINT "SituationMedia_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "EducationalSituation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SituationMedia" ADD CONSTRAINT "SituationMedia_sourceOccurrenceId_fkey" FOREIGN KEY ("sourceOccurrenceId") REFERENCES "SituationSourceOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "EducationalSituation_gradeId_domainId_approvalStatus_productionEligibility_idx"
  ON "EducationalSituation"("gradeId", "domainId", "approvalStatus", "productionEligibility");
