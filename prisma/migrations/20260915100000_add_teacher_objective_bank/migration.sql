CREATE TABLE "TeacherObjective" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "finalCompetencyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PERSONAL',
    "provenanceType" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "sourceObjectiveId" TEXT,
    "canonicalResourceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adoptedAt" TIMESTAMP(3),
    CONSTRAINT "TeacherObjective_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherObjective_ownerId_gradeId_domainId_finalCompetencyId_idx"
  ON "TeacherObjective"("ownerId", "gradeId", "domainId", "finalCompetencyId");
CREATE INDEX "TeacherObjective_sourceReferenceId_idx" ON "TeacherObjective"("sourceReferenceId");
