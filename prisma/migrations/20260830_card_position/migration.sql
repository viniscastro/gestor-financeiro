-- Rode este SQL no Supabase SQL Editor
-- Adiciona ordenação manual aos cartões de crédito

ALTER TABLE "CreditCard" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
