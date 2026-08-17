-- ربط تسجيل الدخول بحساب Google: عمود googleId اختياري وفريد على جدول المستخدمين
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
