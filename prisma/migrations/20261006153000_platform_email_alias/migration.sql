ALTER TABLE "User" ADD COLUMN "platformEmail" TEXT;
CREATE UNIQUE INDEX "User_platformEmail_key" ON "User"("platformEmail");
