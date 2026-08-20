import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'light'`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dashboardCards" TEXT`)
  return NextResponse.json({ ok: true })
}
