-- المخطط السنوي والتوزيع السنوي: تعديل الأستاذ لصياغة الأهداف التعلمية،
-- واقتراح/اعتماد المفتش لمخطط أو توزيع سنوي لأساتذة مقاطعته

-- CreateTable
CREATE TABLE "AnnualPlan" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "proposedByInspectorId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnualPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnualPlan_teacherId_idx" ON "AnnualPlan"("teacherId");

-- CreateIndex
CREATE INDEX "AnnualPlan_proposedByInspectorId_idx" ON "AnnualPlan"("proposedByInspectorId");

-- CreateIndex
CREATE INDEX "AnnualPlan_status_idx" ON "AnnualPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualPlan_teacherId_academicYearId_levelId_kind_key" ON "AnnualPlan"("teacherId", "academicYearId", "levelId", "kind");
