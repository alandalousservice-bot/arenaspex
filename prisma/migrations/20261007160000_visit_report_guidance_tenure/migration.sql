-- CreateEnum
CREATE TYPE "VisitReportType" AS ENUM ('GUIDANCE', 'TENURE');

-- CreateEnum
CREATE TYPE "VisitReportStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateTable
CREATE TABLE "VisitReport" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "reportType" "VisitReportType" NOT NULL,
    "status" "VisitReportStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "mark" DOUBLE PRECISION,
    "finalSnapshot" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitReport_visitId_key" ON "VisitReport"("visitId");

-- CreateIndex
CREATE INDEX "VisitReport_authorId_status_idx" ON "VisitReport"("authorId", "status");

-- AddForeignKey
ALTER TABLE "VisitReport" ADD CONSTRAINT "VisitReport_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "InspectionVisitRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitReport" ADD CONSTRAINT "VisitReport_mark_range_check" CHECK ("mark" IS NULL OR ("mark" >= 0 AND "mark" <= 20));
ALTER TABLE "VisitReport" ADD CONSTRAINT "VisitReport_final_metadata_check" CHECK (
    ("status" = 'DRAFT' AND "finalSnapshot" IS NULL AND "finalizedAt" IS NULL AND "finalizedById" IS NULL)
    OR ("status" = 'FINAL' AND "finalSnapshot" IS NOT NULL AND "finalizedAt" IS NOT NULL AND "finalizedById" IS NOT NULL)
);
