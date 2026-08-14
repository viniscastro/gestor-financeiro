-- AlterTable
ALTER TABLE "RecurringRule" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'TRANSACTION',
ADD COLUMN     "toAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
