import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents, toTransactionDto, transactionSchema } from '@/lib/transactions'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

const transactionInclude = {
  account: { select: { name: true, color: true } },
  category: { select: { id: true, name: true, color: true } },
} as const

export async function GET(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.api, 'transactions')
  if (rateLimited) return rateLimited

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('accountId')
  const categoryId = searchParams.get('categoryId')

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: transactionInclude,
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(transactions.map(toTransactionDto))
}

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.api, 'transactions')
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

  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { transactionType, description, amount, accountId, categoryId, date, recurringId, occurrenceMonth } = parsed.data

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true },
  })
  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: session.user.id },
      select: { id: true },
    })
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      transactionType,
      description,
      amount: amountToCents(amount),
      date: new Date(date),
      userId: session.user.id,
      accountId,
      categoryId: categoryId ?? null,
      recurringId: recurringId ?? null,
      occurrenceMonth: occurrenceMonth ?? null,
    },
    include: transactionInclude,
  })

  return NextResponse.json(toTransactionDto(transaction), { status: 201 })
}
