import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.email !== 'vinislad17@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

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
