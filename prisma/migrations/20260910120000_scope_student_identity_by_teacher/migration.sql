DROP INDEX IF EXISTS "Student_institutionId_matricule_key";
CREATE UNIQUE INDEX "Student_teacherId_matricule_key" ON "Student"("teacherId", "matricule");
