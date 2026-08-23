CREATE TABLE "Student" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "institutionId" TEXT,
  "classId" TEXT NOT NULL,
  "matricule" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "grade" INTEGER,
  "groupName" TEXT,
  "schoolYear" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Student_institutionId_matricule_key" ON "Student"("institutionId", "matricule");
CREATE INDEX "Student_teacherId_classId_idx" ON "Student"("teacherId", "classId");
CREATE INDEX "Student_institutionId_idx" ON "Student"("institutionId");
ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
