-- Additive diagnostic intervention history. No backfill or existing table changes.
CREATE TABLE "DiagnosticIntervention" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentAssessmentId" TEXT NOT NULL,
    "criterionResultId" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceTitleSnapshot" TEXT,
    "resourceBodySnapshot" JSONB,
    "customText" TEXT,
    "teacherNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SELECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DiagnosticIntervention_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiagnosticIntervention_teacherId_studentAssessmentId_idx" ON "DiagnosticIntervention"("teacherId", "studentAssessmentId");
CREATE INDEX "DiagnosticIntervention_criterionResultId_idx" ON "DiagnosticIntervention"("criterionResultId");
CREATE INDEX "DiagnosticIntervention_resourceId_idx" ON "DiagnosticIntervention"("resourceId");

ALTER TABLE "DiagnosticIntervention" ADD CONSTRAINT "DiagnosticIntervention_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticIntervention" ADD CONSTRAINT "DiagnosticIntervention_studentAssessmentId_fkey" FOREIGN KEY ("studentAssessmentId") REFERENCES "StudentAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticIntervention" ADD CONSTRAINT "DiagnosticIntervention_criterionResultId_fkey" FOREIGN KEY ("criterionResultId") REFERENCES "CriterionResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
