-- Preserve the existing JSON payloads while adding indexed communication fields.
ALTER TABLE "DistrictMessage" ADD COLUMN "districtId" TEXT;
ALTER TABLE "DistrictMessage" ADD COLUMN "content" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "content" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "CommunityNotification" ADD COLUMN "senderId" TEXT;
ALTER TABLE "CommunityNotification" ADD COLUMN "type" TEXT;
ALTER TABLE "CommunityNotification" ADD COLUMN "title" TEXT;
ALTER TABLE "CommunityNotification" ADD COLUMN "message" TEXT;
ALTER TABLE "CommunityNotification" ADD COLUMN "read" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommunityNotification" ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "DistrictMessage_districtId_createdAt_idx" ON "DistrictMessage"("districtId", "createdAt");
CREATE INDEX "DirectMessage_senderId_recipientId_createdAt_idx" ON "DirectMessage"("senderId", "recipientId", "createdAt");
CREATE INDEX "DirectMessage_recipientId_readAt_idx" ON "DirectMessage"("recipientId", "readAt");
CREATE INDEX "CommunityNotification_userId_read_createdAt_idx" ON "CommunityNotification"("userId", "read", "createdAt");
