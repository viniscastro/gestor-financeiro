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

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    include: {
      transactions: { select: { transactionType: true, amount: true } },
    },
    orderBy: { createdAt: 'asc' },
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
