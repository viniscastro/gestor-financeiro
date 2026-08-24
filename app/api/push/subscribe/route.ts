import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { endpoint, p256dh, auth: authKey } = body as {
    endpoint?: string
    p256dh?: string
    auth?: string
  }

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
  }

  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "PushSubscription" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "endpoint" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL, "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"))`.catch(() => {})
  await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint")`.catch(() => {})
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId")`.catch(() => {})

  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: session.user.id, endpoint } },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent: request.headers.get('user-agent') ?? null,
    },
    update: { p256dh, auth: authKey },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { endpoint } = body as { endpoint?: string }

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint obrigatório' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint },
  })

  return NextResponse.json({ ok: true })
}
