-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "spexId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "directorateId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "institutionId" TEXT,
    "schoolName" TEXT,
    "municipality" TEXT,
    "specialization" TEXT,
    "cycle" TEXT,
    "yearsExperience" INTEGER,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isApprovedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "followingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followersIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedResourcesCount" INTEGER NOT NULL DEFAULT 0,
    "approvedResourcesCount" INTEGER NOT NULL DEFAULT 0,
    "privacySettings" JSONB,
    "customApiKey" TEXT,
    "apiKeyStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookEntry" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotebookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectorNote" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictMessage" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistrictMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT,
    "recipientId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityResource" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_spexId_key" ON "User"("spexId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_directorateId_idx" ON "User"("directorateId");

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "User"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "LessonPlan_ownerId_idx" ON "LessonPlan"("ownerId");

-- CreateIndex
CREATE INDEX "NotebookEntry_ownerId_idx" ON "NotebookEntry"("ownerId");

-- CreateIndex
CREATE INDEX "InspectorNote_authorId_idx" ON "InspectorNote"("authorId");

-- CreateIndex
CREATE INDEX "DistrictMessage_authorId_idx" ON "DistrictMessage"("authorId");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");

-- CreateIndex
CREATE INDEX "DirectMessage_recipientId_idx" ON "DirectMessage"("recipientId");

-- CreateIndex
CREATE INDEX "CommunityResource_authorId_idx" ON "CommunityResource"("authorId");

-- CreateIndex
CREATE INDEX "CommunityNotification_userId_idx" ON "CommunityNotification"("userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
