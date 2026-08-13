import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents, transactionSchema } from '@/lib/transactions'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(
    transactions.map((t) => ({
      id: t.id,
      transactionType: t.transactionType,
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date.toISOString(),
    }))
  )
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

  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { transactionType, description, amount, category, date } = parsed.data

  const transaction = await prisma.transaction.create({
    data: {
      transactionType,
      description,
      amount: amountToCents(amount),
      category,
      date: new Date(date),
      userId: session.user.id,
    },
  })

  return NextResponse.json(
    {
      id: transaction.id,
      transactionType: transaction.transactionType,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date.toISOString(),
    },
    { status: 201 }
  )
}
