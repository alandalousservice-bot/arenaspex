CREATE TABLE "TeacherWeeklySlot" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherWeeklySlot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherWeeklySlot_teacherId_academicYearId_weekday_startTime_key" ON "TeacherWeeklySlot"("teacherId", "academicYearId", "weekday", "startTime");
CREATE INDEX "TeacherWeeklySlot_teacherId_academicYearId_idx" ON "TeacherWeeklySlot"("teacherId", "academicYearId");
CREATE INDEX "TeacherWeeklySlot_classId_academicYearId_idx" ON "TeacherWeeklySlot"("classId", "academicYearId");
ALTER TABLE "TeacherWeeklySlot" ADD CONSTRAINT "TeacherWeeklySlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherWeeklySlot" ADD CONSTRAINT "TeacherWeeklySlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudentClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
