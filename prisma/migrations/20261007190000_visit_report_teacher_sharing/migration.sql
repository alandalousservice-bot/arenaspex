ALTER TABLE "VisitReport"
  ADD COLUMN "sharedWithTeacherAt" TIMESTAMP(3),
  ADD COLUMN "sharedWithTeacherById" TEXT,
  ADD COLUMN "teacherAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "teacherAcknowledgedById" TEXT;

CREATE INDEX "VisitReport_sharedWithTeacherAt_idx" ON "VisitReport"("sharedWithTeacherAt");

ALTER TABLE "VisitReport"
  ADD CONSTRAINT "VisitReport_sharedWithTeacherById_fkey"
    FOREIGN KEY ("sharedWithTeacherById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitReport_teacherAcknowledgedById_fkey"
    FOREIGN KEY ("teacherAcknowledgedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VisitReport_share_metadata_check"
    CHECK (("sharedWithTeacherAt" IS NULL) = ("sharedWithTeacherById" IS NULL)),
  ADD CONSTRAINT "VisitReport_acknowledgement_metadata_check"
    CHECK (("teacherAcknowledgedAt" IS NULL) = ("teacherAcknowledgedById" IS NULL)),
  ADD CONSTRAINT "VisitReport_acknowledgement_requires_share_check"
    CHECK ("teacherAcknowledgedAt" IS NULL OR "sharedWithTeacherAt" IS NOT NULL);
