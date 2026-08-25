import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "installmentGroupId" TEXT;
      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "installmentCurrent" INTEGER;
      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "installmentTotal" INTEGER;
      CREATE INDEX IF NOT EXISTS "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");
    `)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
