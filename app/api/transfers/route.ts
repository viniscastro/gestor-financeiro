import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { transferSchema } from '@/lib/transfer'
import { amountToCents } from '@/lib/transactions'
import { createNotification } from '@/lib/notifications'

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

  const parsed = transferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { fromAccountId, toAccountId, amount, date, description } = parsed.data

  if (fromAccountId === toAccountId) {
    return NextResponse.json(
      { error: 'Escolha duas contas diferentes' },
      { status: 400 }
    )
  }

  const accounts = await prisma.account.findMany({
    where: {
      id: { in: [fromAccountId, toAccountId] },
      userId: session.user.id,
    },
    select: { id: true, name: true },
  })
  if (accounts.length !== 2) {
    return NextResponse.json(
      { error: 'Uma das contas não foi encontrada' },
      { status: 404 }
    )
  }

  const from = accounts.find((a) => a.id === fromAccountId)!
  const to = accounts.find((a) => a.id === toAccountId)!

  const groupId = randomUUID()
  const cents = amountToCents(amount)
  const cleanDescription = description?.trim() || ''

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        transactionType: 'EXPENSE',
        description: cleanDescription || `Transferência para ${to.name}`,
        amount: cents,
        date: new Date(date),
        userId: session.user.id,
        accountId: from.id,
        categoryId: null,
        transferGroupId: groupId,
      },
    }),
    prisma.transaction.create({
      data: {
        transactionType: 'INCOME',
        description: cleanDescription || `Transferência de ${from.name}`,
        amount: cents,
        date: new Date(date),
        userId: session.user.id,
        accountId: to.id,
        categoryId: null,
        transferGroupId: groupId,
      },
    }),
  ])

  await createNotification(
    session.user.id,
    'SYSTEM',
    'Transferência realizada',
    `${from.name} → ${to.name} — ${amount}`
  )

  return NextResponse.json({ ok: true }, { status: 201 })
}
