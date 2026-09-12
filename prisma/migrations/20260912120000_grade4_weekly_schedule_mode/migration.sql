CREATE TYPE "Grade4WeeklyScheduleMode" AS ENUM ('TWO_45', 'ONE_90');

CREATE TABLE "ClassPlanningConfiguration" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "grade4WeeklyScheduleMode" "Grade4WeeklyScheduleMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassPlanningConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassPlanningConfiguration_classId_academicYearId_key"
ON "ClassPlanningConfiguration"("classId", "academicYearId");

CREATE INDEX "ClassPlanningConfiguration_academicYearId_idx"
ON "ClassPlanningConfiguration"("academicYearId");

ALTER TABLE "ClassPlanningConfiguration"
ADD CONSTRAINT "ClassPlanningConfiguration_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "StudentClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
