-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "installmentGroupId" TEXT,
ADD COLUMN "installmentCurrent" INTEGER,
ADD COLUMN "installmentTotal" INTEGER;

-- CreateIndex
CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");
