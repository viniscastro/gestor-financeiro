-- Rode este SQL no Supabase SQL Editor
-- Remove a coluna "accountId" do cartão de crédito (conta para pagamento)

ALTER TABLE "CreditCard" DROP CONSTRAINT IF EXISTS "CreditCard_accountId_fkey";
DROP INDEX IF EXISTS "CreditCard_accountId_idx";
ALTER TABLE "CreditCard" DROP COLUMN IF EXISTS "accountId";
