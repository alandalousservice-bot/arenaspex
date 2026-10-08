-- Additive only: NULL status/type preserves legacy JSON records without reinterpretation.
CREATE TYPE "PedagogicalVisitType" AS ENUM ('GUIDANCE', 'TENURE', 'MONITORING');
CREATE TYPE "PedagogicalVisitStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED');
ALTER TABLE "InspectionVisitRecord"
 ADD COLUMN "visitType" "PedagogicalVisitType",
 ADD COLUMN "status" "PedagogicalVisitStatus",
 ADD COLUMN "scheduledAt" TIMESTAMP(3),
 ADD COLUMN "completedAt" TIMESTAMP(3),
 ADD COLUMN "academicYearId" TEXT,
 ADD COLUMN "classId" TEXT,
 ADD COLUMN "weeklySlotId" TEXT,
 ADD COLUMN "postponedAt" TIMESTAMP(3),
 ADD COLUMN "postponedById" TEXT,
 ADD COLUMN "postponementReason" TEXT,
 ADD COLUMN "cancelledAt" TIMESTAMP(3),
 ADD COLUMN "cancelledById" TEXT,
 ADD COLUMN "cancellationReason" TEXT,
 ADD COLUMN "teacherNotifiedAt" TIMESTAMP(3),
 ADD COLUMN "teacherNotifiedById" TEXT,
 ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "history" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN "updatedAt" TIMESTAMP(3);
CREATE INDEX "InspectionVisitRecord_teacherId_status_scheduledAt_idx" ON "InspectionVisitRecord"("teacherId", "status", "scheduledAt");
