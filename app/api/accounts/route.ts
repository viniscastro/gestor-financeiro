import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents } from '@/lib/transactions'
import { accountSchema, toAccountDto } from '@/lib/accounts'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await prisma.$executeRaw`ALTER TABLE "Transaction" ALTER COLUMN "accountId" DROP NOT NULL`.catch(() => {})

  await prisma.$executeRaw`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0`.catch(() => {})

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    include: {
      transactions: { select: { transactionType: true, amount: true } },
    },
    orderBy: { position: 'asc' },
  })

  return NextResponse.json(accounts.map(toAccountDto))
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = accountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, type, color, initialBalance } = parsed.data

  const account = await prisma.account.create({
    data: {
      userId: session.user.id,
      name,
      type,
      color,
      initialBalance: amountToCents(initialBalance),
    },
  })

  return NextResponse.json(toAccountDto(account), { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { ids } = body as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const found = await prisma.account.count({
    where: { userId: session.user.id, id: { in: ids } },
  })
  if (found !== ids.length) {
    return NextResponse.json({ error: 'Contas não encontradas' }, { status: 404 })
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.account.update({
        where: { id },
        data: { position: index },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
