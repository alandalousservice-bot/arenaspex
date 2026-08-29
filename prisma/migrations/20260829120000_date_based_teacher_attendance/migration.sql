-- Make attendance identity independent from operational planning sessions.
ALTER TABLE "StudentAttendance"
ADD COLUMN "attendanceDate" TIMESTAMP(3);

-- Existing rows inherit the exact planned-session date they were recorded against.
UPDATE "StudentAttendance" AS attendance
SET "attendanceDate" = session."plannedDate"
FROM "ClassPlannedSession" AS session
WHERE attendance."classPlannedSessionId" = session."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentAttendance"
    WHERE "attendanceDate" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot make StudentAttendance.attendanceDate required: an existing row has no planned-session date';
  END IF;
END $$;

ALTER TABLE "StudentAttendance"
ALTER COLUMN "attendanceDate" SET NOT NULL;

ALTER TABLE "StudentAttendance"
ALTER COLUMN "classPlannedSessionId" DROP NOT NULL;

DROP INDEX "StudentAttendance_classPlannedSessionId_studentId_key";

CREATE UNIQUE INDEX "StudentAttendance_teacherId_classId_studentId_academicYearId_attendanceDate_key"
ON "StudentAttendance"(
  "teacherId",
  "classId",
  "studentId",
  "academicYearId",
  "attendanceDate"
);

CREATE INDEX "StudentAttendance_classId_academicYearId_attendanceDate_idx"
ON "StudentAttendance"("classId", "academicYearId", "attendanceDate");
