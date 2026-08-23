-- Forward-only repair for environments where the roster migration was recorded
-- but Student/StudentClass is missing. No rows are deleted or rewritten.
CREATE TABLE IF NOT EXISTS "Student" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentClass" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "institutionId" TEXT,
  "levelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentClass_pkey" PRIMARY KEY ("id")
);

-- Complete a partially restored table without replacing it. Required text
-- columns use an empty default only for pre-existing rows; no rows are removed.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "teacherId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "classId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "matricule" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "grade" INTEGER;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "groupName" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "schoolYear" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "StudentClass" ADD COLUMN IF NOT EXISTS "teacherId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudentClass" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE "StudentClass" ADD COLUMN IF NOT EXISTS "levelId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudentClass" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudentClass" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StudentClass" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Student_teacherId_classId_idx" ON "Student" ("teacherId", "classId");
CREATE INDEX IF NOT EXISTS "Student_institutionId_idx" ON "Student" ("institutionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Student_institutionId_matricule_key" ON "Student" ("institutionId", "matricule");
CREATE INDEX IF NOT EXISTS "StudentClass_teacherId_idx" ON "StudentClass" ("teacherId");
CREATE INDEX IF NOT EXISTS "StudentClass_institutionId_idx" ON "StudentClass" ("institutionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Student_teacherId_fkey') THEN
    ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentClass_teacherId_fkey') THEN
    ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
