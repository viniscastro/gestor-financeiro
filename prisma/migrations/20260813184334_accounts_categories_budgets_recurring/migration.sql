-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "occurrenceMonth" TEXT,
ADD COLUMN     "recurringId" TEXT,
ADD COLUMN     "transferGroupId" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CARTEIRA',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "initialBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#78716c',
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notifyDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- Backfill: conta padrão "Carteira" por usuário
INSERT INTO "Account" ("id", "userId", "name", "type", "color", "initialBalance", "createdAt", "updatedAt")
SELECT 'acc_' || u."id", u."id", 'Carteira', 'CARTEIRA', '#10b981', 0, now(), now()
FROM "User" u;

-- Backfill: categorias padrão por usuário
INSERT INTO "Category" ("id", "userId", "name", "type", "color", "icon", "createdAt")
SELECT 'cat_' || u."id" || '_' || v.id, u."id", v.name, v.type, v.color, v.icon, now()
FROM "User" u
CROSS JOIN (VALUES
  ('salary', 'Salário', 'INCOME', '#10b981', 'briefcase'),
  ('freelance', 'Freelance', 'INCOME', '#14b8a6', 'laptop'),
  ('investments', 'Investimentos', 'INCOME', '#22c55e', 'trending-up'),
  ('gifts', 'Presentes', 'INCOME', '#84cc16', 'gift'),
  ('other_income', 'Outros', 'INCOME', '#a3e635', 'coins'),
  ('food', 'Alimentação', 'EXPENSE', '#f97316', 'utensils'),
  ('transport', 'Transporte', 'EXPENSE', '#eab308', 'bus'),
  ('housing', 'Moradia', 'EXPENSE', '#8b5cf6', 'home'),
  ('health', 'Saúde', 'EXPENSE', '#ec4899', 'heart-pulse'),
  ('leisure', 'Lazer', 'EXPENSE', '#f43f5e', 'gamepad-2'),
  ('education', 'Educação', 'EXPENSE', '#06b6d4', 'graduation-cap'),
  ('bills', 'Contas', 'EXPENSE', '#6366f1', 'receipt'),
  ('other_expense', 'Outros', 'EXPENSE', '#78716c', 'tag')
) AS v(id, name, type, color, icon);

-- Backfill: associa transações existentes à conta padrão
UPDATE "Transaction" t
SET "accountId" = 'acc_' || t."userId"
WHERE t."accountId" IS NULL;

-- Backfill: mapeia a coluna legada category para categoryId
UPDATE "Transaction" t
SET "categoryId" = 'cat_' || t."userId" || '_' || t."category"
WHERE t."category" <> ''
  AND EXISTS (SELECT 1 FROM "Category" c WHERE c."id" = 'cat_' || t."userId" || '_' || t."category");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_key" ON "Budget"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "RecurringRule_userId_idx" ON "RecurringRule"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_accountId_idx" ON "Transaction"("userId", "accountId");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
