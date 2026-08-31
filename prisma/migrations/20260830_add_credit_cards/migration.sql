-- Rode este SQL no Supabase SQL Editor

CREATE TABLE "CreditCard" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "last4" TEXT,
  "creditLimit" INTEGER NOT NULL DEFAULT 0,
  "closingDay" INTEGER NOT NULL DEFAULT 1,
  "dueDay" INTEGER NOT NULL DEFAULT 10,
  "color" TEXT NOT NULL DEFAULT '#10b981',
  "accountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditCardStatement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditCardStatement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditCard_userId_idx" ON "CreditCard"("userId");
CREATE INDEX "CreditCardStatement_userId_monthKey_idx" ON "CreditCardStatement"("userId", "monthKey");
CREATE UNIQUE INDEX "CreditCardStatement_cardId_monthKey_key" ON "CreditCardStatement"("cardId", "monthKey");

ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditCardStatement" ADD CONSTRAINT "CreditCardStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditCardStatement" ADD CONSTRAINT "CreditCardStatement_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD COLUMN "creditCardId" TEXT;
CREATE INDEX "Transaction_creditCardId_idx" ON "Transaction"("creditCardId");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
