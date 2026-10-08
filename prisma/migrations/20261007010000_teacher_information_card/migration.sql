-- CreateTable
CREATE TABLE "TeacherInformationCard" (
    "teacherId" TEXT NOT NULL,
    "extra" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "latestSubmissionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherInformationCard_pkey" PRIMARY KEY ("teacherId")
);

-- CreateTable
CREATE TABLE "TeacherInformationCardSubmission" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedInspectorId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "correctionReason" TEXT,

    CONSTRAINT "TeacherInformationCardSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherInformationCardSubmission_teacherId_submittedAt_idx" ON "TeacherInformationCardSubmission"("teacherId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherInformationCardSubmission_teacherId_revision_key" ON "TeacherInformationCardSubmission"("teacherId", "revision");

-- AddForeignKey
ALTER TABLE "TeacherInformationCard" ADD CONSTRAINT "TeacherInformationCard_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherInformationCardSubmission" ADD CONSTRAINT "TeacherInformationCardSubmission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
