CREATE TABLE "TeacherAcademicCalendarPreference" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "schedulePeDuringTermTests" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAcademicCalendarPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherAcademicCalendarPreference_teacherId_academicYearId_key"
    ON "TeacherAcademicCalendarPreference"("teacherId", "academicYearId");

CREATE INDEX "TeacherAcademicCalendarPreference_academicYearId_idx"
    ON "TeacherAcademicCalendarPreference"("academicYearId");

ALTER TABLE "TeacherAcademicCalendarPreference"
    ADD CONSTRAINT "TeacherAcademicCalendarPreference_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
