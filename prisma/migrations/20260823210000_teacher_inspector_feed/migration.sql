CREATE TABLE "InspectionVisitRecord" (
  "id" TEXT NOT NULL,
  "inspectorId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "institutionId" TEXT,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionVisitRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InspectionVisitRecord_teacherId_createdAt_idx" ON "InspectionVisitRecord"("teacherId", "createdAt");
CREATE INDEX "InspectionVisitRecord_inspectorId_createdAt_idx" ON "InspectionVisitRecord"("inspectorId", "createdAt");
