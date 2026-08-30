CREATE TABLE "StudentAttendance" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classPlannedSessionId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "status" TEXT,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalExemption" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "expiresOn" TIMESTAMP(3),
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicalExemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAttendance_classPlannedSessionId_studentId_key" ON "StudentAttendance"("classPlannedSessionId", "studentId");
CREATE INDEX "StudentAttendance_teacherId_classId_academicYearId_idx" ON "StudentAttendance"("teacherId", "classId", "academicYearId");
CREATE INDEX "StudentAttendance_studentId_idx" ON "StudentAttendance"("studentId");
CREATE INDEX "MedicalExemption_teacherId_studentId_idx" ON "MedicalExemption"("teacherId", "studentId");
CREATE INDEX "MedicalExemption_studentId_issuedOn_expiresOn_idx" ON "MedicalExemption"("studentId", "issuedOn", "expiresOn");

ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudentClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- The ClassPlannedSession FK is added by the ordered repair migration after
-- 20260825090000_class_planned_sessions creates its referenced table.
ALTER TABLE "MedicalExemption" ADD CONSTRAINT "MedicalExemption_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalExemption" ADD CONSTRAINT "MedicalExemption_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
