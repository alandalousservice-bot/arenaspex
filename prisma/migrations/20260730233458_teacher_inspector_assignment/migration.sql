-- نظام الإسناد التلقائي للأساتذة إلى المفتشين

-- AlterTable
ALTER TABLE "User" ADD COLUMN "municipalityId" TEXT;

-- CreateTable
CREATE TABLE "Directorate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wilayaCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Directorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "directorateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionDistrict" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "directorateId" TEXT NOT NULL,
    "districtNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalitySuggestion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "directorateId" TEXT NOT NULL,
    "approvedMunicipalityId" TEXT,
    "suggestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MunicipalitySuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSuggestion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "approvedSchoolId" TEXT,
    "suggestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectorAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "inspectorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_municipalityId_idx" ON "User"("municipalityId");

-- CreateIndex
CREATE INDEX "Directorate_name_idx" ON "Directorate"("name");

-- CreateIndex
CREATE INDEX "Municipality_directorateId_idx" ON "Municipality"("directorateId");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_directorateId_name_key" ON "Municipality"("directorateId", "name");

-- CreateIndex
CREATE INDEX "School_municipalityId_idx" ON "School"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "School_municipalityId_name_key" ON "School"("municipalityId", "name");

-- CreateIndex
CREATE INDEX "InspectionDistrict_directorateId_idx" ON "InspectionDistrict"("directorateId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionDistrict_directorateId_name_key" ON "InspectionDistrict"("directorateId", "name");

-- CreateIndex
CREATE INDEX "MunicipalitySuggestion_directorateId_idx" ON "MunicipalitySuggestion"("directorateId");

-- CreateIndex
CREATE INDEX "MunicipalitySuggestion_status_idx" ON "MunicipalitySuggestion"("status");

-- CreateIndex
CREATE INDEX "SchoolSuggestion_municipalityId_idx" ON "SchoolSuggestion"("municipalityId");

-- CreateIndex
CREATE INDEX "SchoolSuggestion_status_idx" ON "SchoolSuggestion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InspectorAssignment_teacherId_key" ON "InspectorAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "InspectorAssignment_inspectorId_idx" ON "InspectorAssignment"("inspectorId");

-- CreateIndex
CREATE INDEX "InspectorAssignment_status_idx" ON "InspectorAssignment"("status");

-- AddForeignKey
ALTER TABLE "Municipality" ADD CONSTRAINT "Municipality_directorateId_fkey" FOREIGN KEY ("directorateId") REFERENCES "Directorate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionDistrict" ADD CONSTRAINT "InspectionDistrict_directorateId_fkey" FOREIGN KEY ("directorateId") REFERENCES "Directorate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalitySuggestion" ADD CONSTRAINT "MunicipalitySuggestion_approvedMunicipalityId_fkey" FOREIGN KEY ("approvedMunicipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSuggestion" ADD CONSTRAINT "SchoolSuggestion_approvedSchoolId_fkey" FOREIGN KEY ("approvedSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectorAssignment" ADD CONSTRAINT "InspectorAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectorAssignment" ADD CONSTRAINT "InspectorAssignment_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
