import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'
import { createNotification } from '@/lib/notifications'

type ImportItem = {
  date: string
  description: string
  amountCents: number
  type: 'INCOME' | 'EXPENSE'
}

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.api, 'transactions-import')
  if (rateLimited) return rateLimited

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

  const { accountId, transactions } = body as {
    accountId?: string
    transactions?: ImportItem[]
  }

  if (!accountId || !Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  if (transactions.length > 500) {
    return NextResponse.json({ error: 'Limite de 500 transacoes por importacao' }, { status: 400 })
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true, name: true },
  })
  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const created = await prisma.transaction.createMany({
    data: transactions.map((t) => ({
      transactionType: t.type,
      description: t.description.slice(0, 200),
      amount: Math.abs(t.amountCents),
      date: new Date(t.date),
      userId: session.user.id,
      accountId,
      categoryId: null,
    })),
  })

  await createNotification(
    session.user.id,
    'SYSTEM',
    'Extrato importado',
    `${created.count} transacoes importadas para ${account.name}`
  )

  return NextResponse.json({ ok: true, count: created.count })
}
