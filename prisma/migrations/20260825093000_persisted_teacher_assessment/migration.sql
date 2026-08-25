CREATE TABLE "AssessmentSession" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classPlannedSessionId" TEXT,
    "assessmentType" TEXT NOT NULL,
    "gradeLevelId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "finalCompetencyId" TEXT,
    "title" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAssessment" (
    "id" TEXT NOT NULL,
    "assessmentSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "masteryLevel" TEXT,
    "numericMark" DOUBLE PRECISION,
    "note" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CriterionResult" (
    "id" TEXT NOT NULL,
    "studentAssessmentId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "masteryLevel" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CriterionResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentSession_classPlannedSessionId_key" ON "AssessmentSession"("classPlannedSessionId");
CREATE INDEX "AssessmentSession_teacherId_classId_academicYearId_idx" ON "AssessmentSession"("teacherId", "classId", "academicYearId");
CREATE INDEX "AssessmentSession_classPlannedSessionId_idx" ON "AssessmentSession"("classPlannedSessionId");
CREATE UNIQUE INDEX "StudentAssessment_assessmentSessionId_studentId_key" ON "StudentAssessment"("assessmentSessionId", "studentId");
CREATE INDEX "StudentAssessment_assessmentSessionId_idx" ON "StudentAssessment"("assessmentSessionId");
CREATE INDEX "StudentAssessment_studentId_idx" ON "StudentAssessment"("studentId");
CREATE UNIQUE INDEX "CriterionResult_studentAssessmentId_criterionId_key" ON "CriterionResult"("studentAssessmentId", "criterionId");
CREATE INDEX "CriterionResult_studentAssessmentId_idx" ON "CriterionResult"("studentAssessmentId");
CREATE INDEX "CriterionResult_criterionId_idx" ON "CriterionResult"("criterionId");

ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudentClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_classPlannedSessionId_fkey" FOREIGN KEY ("classPlannedSessionId") REFERENCES "ClassPlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentAssessment" ADD CONSTRAINT "StudentAssessment_assessmentSessionId_fkey" FOREIGN KEY ("assessmentSessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAssessment" ADD CONSTRAINT "StudentAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CriterionResult" ADD CONSTRAINT "CriterionResult_studentAssessmentId_fkey" FOREIGN KEY ("studentAssessmentId") REFERENCES "StudentAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;