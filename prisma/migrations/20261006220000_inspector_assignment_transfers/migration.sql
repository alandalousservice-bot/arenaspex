-- CreateTable
CREATE TABLE "InspectorAssignmentTransfer" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "pendingTeacherId" TEXT,
    "sourceAssignmentId" TEXT NOT NULL,
    "sourceAssignmentUpdatedAt" TIMESTAMP(3) NOT NULL,
    "sourceAssignedAt" TIMESTAMP(3),
    "sourceInspectorId" TEXT NOT NULL,
    "sourceDirectorateId" TEXT NOT NULL,
    "sourceDistrictId" TEXT NOT NULL,
    "destinationInspectorId" TEXT NOT NULL,
    "destinationDirectorateId" TEXT NOT NULL,
    "destinationDistrictId" TEXT NOT NULL,
    "destinationInstitutionId" TEXT,
    "snapshot" JSONB NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "rejectionReason" TEXT,
    "effectiveAt" TIMESTAMP(3),

    CONSTRAINT "InspectorAssignmentTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectorAssignmentTransfer_pendingTeacherId_key" ON "InspectorAssignmentTransfer"("pendingTeacherId");

-- CreateIndex
CREATE INDEX "InspectorAssignmentTransfer_sourceInspectorId_status_idx" ON "InspectorAssignmentTransfer"("sourceInspectorId", "status");

-- CreateIndex
CREATE INDEX "InspectorAssignmentTransfer_destinationInspectorId_status_idx" ON "InspectorAssignmentTransfer"("destinationInspectorId", "status");

-- CreateIndex
CREATE INDEX "InspectorAssignmentTransfer_teacherId_requestedAt_idx" ON "InspectorAssignmentTransfer"("teacherId", "requestedAt");

-- AddForeignKey
ALTER TABLE "InspectorAssignmentTransfer" ADD CONSTRAINT "InspectorAssignmentTransfer_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectorAssignmentTransfer" ADD CONSTRAINT "InspectorAssignmentTransfer_sourceInspectorId_fkey" FOREIGN KEY ("sourceInspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectorAssignmentTransfer" ADD CONSTRAINT "InspectorAssignmentTransfer_destinationInspectorId_fkey" FOREIGN KEY ("destinationInspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
