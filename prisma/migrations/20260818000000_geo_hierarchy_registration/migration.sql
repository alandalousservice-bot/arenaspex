-- Migration: Geo hierarchy + registration (PART A)
-- Adds edu fields to User, inspectionDistrictId+wilayaCode to School, inspectionDistrictId to SchoolSuggestion

-- Alter User: add optional edu fields + birthDate
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='eduDirectorateId') THEN
    ALTER TABLE "User" ADD COLUMN "eduDirectorateId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='eduDistrictId') THEN
    ALTER TABLE "User" ADD COLUMN "eduDistrictId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='eduSchoolId') THEN
    ALTER TABLE "User" ADD COLUMN "eduSchoolId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='birthDate') THEN
    ALTER TABLE "User" ADD COLUMN "birthDate" TIMESTAMPTZ;
  END IF;
END $$;

-- Alter School
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='inspectionDistrictId') THEN
    ALTER TABLE "School" ADD COLUMN "inspectionDistrictId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='wilayaCode') THEN
    ALTER TABLE "School" ADD COLUMN "wilayaCode" TEXT;
  END IF;
END $$;

-- Alter SchoolSuggestion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='SchoolSuggestion' AND column_name='inspectionDistrictId') THEN
    ALTER TABLE "SchoolSuggestion" ADD COLUMN "inspectionDistrictId" TEXT;
  END IF;
END $$;

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "User_eduDirectorateId_idx" ON "User"("eduDirectorateId");
CREATE INDEX IF NOT EXISTS "User_eduDistrictId_idx" ON "User"("eduDistrictId");
CREATE INDEX IF NOT EXISTS "User_eduSchoolId_idx" ON "User"("eduSchoolId");
CREATE INDEX IF NOT EXISTS "School_inspectionDistrictId_idx" ON "School"("inspectionDistrictId");
CREATE INDEX IF NOT EXISTS "SchoolSuggestion_inspectionDistrictId_idx" ON "SchoolSuggestion"("inspectionDistrictId");

-- Foreign Keys with pg_constraint check
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_eduDirectorateId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_eduDirectorateId_fkey" FOREIGN KEY ("eduDirectorateId") REFERENCES "Directorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_eduDistrictId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_eduDistrictId_fkey" FOREIGN KEY ("eduDistrictId") REFERENCES "InspectionDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_eduSchoolId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_eduSchoolId_fkey" FOREIGN KEY ("eduSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'School_inspectionDistrictId_fkey') THEN
    ALTER TABLE "School" ADD CONSTRAINT "School_inspectionDistrictId_fkey" FOREIGN KEY ("inspectionDistrictId") REFERENCES "InspectionDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SchoolSuggestion_inspectionDistrictId_fkey') THEN
    ALTER TABLE "SchoolSuggestion" ADD CONSTRAINT "SchoolSuggestion_inspectionDistrictId_fkey" FOREIGN KEY ("inspectionDistrictId") REFERENCES "InspectionDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
