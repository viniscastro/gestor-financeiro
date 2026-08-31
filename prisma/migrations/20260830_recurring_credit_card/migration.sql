-- Rode este SQL no Supabase SQL Editor
-- Permite que recorrências sejam lançadas no cartão de crédito

ALTER TABLE "RecurringRule" ALTER COLUMN "accountId" DROP NOT NULL;

ALTER TABLE "RecurringRule" ADD COLUMN "creditCardId" TEXT;
CREATE INDEX "RecurringRule_creditCardId_idx" ON "RecurringRule"("creditCardId");
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
