-- AlterTable
ALTER TABLE "User" ADD COLUMN "deleteCode" TEXT,
ADD COLUMN "deleteCodeExpires" TIMESTAMP(3),
ADD COLUMN "deleteCodeSentAt" TIMESTAMP(3);
