-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "category",
ALTER COLUMN "accountId" SET NOT NULL;
