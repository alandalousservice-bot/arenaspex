ALTER TABLE "AssessmentSession" ADD COLUMN "integrationPointId" TEXT;
ALTER TABLE "AssessmentSession" ADD COLUMN "integrativeEvidenceSnapshot" JSONB;

CREATE INDEX "AssessmentSession_integrationPointId_idx" ON "AssessmentSession"("integrationPointId");
