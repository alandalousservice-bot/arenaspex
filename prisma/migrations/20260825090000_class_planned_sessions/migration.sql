CREATE TABLE "ClassPlannedSession" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "referenceSessionId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'مبرمجة',
    "startTime" TEXT,
    "venue" TEXT,
    "operationalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassPlannedSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassPlannedSession_classId_academicYearId_referenceSessionId_key" ON "ClassPlannedSession"("classId", "academicYearId", "referenceSessionId");
CREATE INDEX "ClassPlannedSession_teacherId_idx" ON "ClassPlannedSession"("teacherId");
CREATE INDEX "ClassPlannedSession_classId_academicYearId_idx" ON "ClassPlannedSession"("classId", "academicYearId");
CREATE INDEX "ClassPlannedSession_academicYearId_plannedDate_idx" ON "ClassPlannedSession"("academicYearId", "plannedDate");

ALTER TABLE "ClassPlannedSession" ADD CONSTRAINT "ClassPlannedSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassPlannedSession" ADD CONSTRAINT "ClassPlannedSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudentClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
