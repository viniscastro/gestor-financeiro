import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents, toTransactionDto, transactionSchema } from '@/lib/transactions'
import { parseLocalDate } from '@/lib/format'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'
import { notifyTransaction } from '@/lib/notifications'
import { cleanupCardRecurringTransactions } from '@/lib/recurring'

const transactionInclude = {
  account: { select: { name: true, color: true } },
  creditCard: { select: { name: true } },
  category: { select: { id: true, name: true, color: true } },
} as const

export async function GET(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.api, 'transactions')
  if (rateLimited) return rateLimited

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Remove pré-gerações antigas de recorrências de cartão antes de listar,
  // garantindo que elas nunca apareçam mesmo se o layout não tiver rodado.
  await cleanupCardRecurringTransactions(session.user.id)

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

  const { transactionType, description, amount, accountId, creditCardId, categoryId, date, recurringId, occurrenceMonth, installments } = parsed.data

  let resolvedAccountId: string | null = accountId ?? null
  let resolvedCardId: string | null = creditCardId ?? null

  if (transactionType === 'EXPENSE' && creditCardId) {
    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId: session.user.id },
      select: { id: true },
    })
    if (!card) {
      return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
    }
    resolvedAccountId = null
  } else {
    const account = await prisma.account.findFirst({
      where: { id: accountId!, userId: session.user.id },
      select: { id: true },
    })
    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }
    resolvedCardId = null
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

  const totalInstallments = installments && transactionType === 'EXPENSE' ? installments : 1
  const totalCents = amountToCents(amount)
  const baseAmount = Math.floor(totalCents / totalInstallments)
  const remainder = totalCents - baseAmount * totalInstallments

  if (totalInstallments === 1) {
    const transaction = await prisma.transaction.create({
      data: {
        transactionType,
        description,
        amount: totalCents,
        date: parseLocalDate(date),
        userId: session.user.id,
        accountId: resolvedAccountId,
        creditCardId: resolvedCardId,
        categoryId: categoryId ?? null,
        recurringId: recurringId ?? null,
        occurrenceMonth: occurrenceMonth ?? null,
      },
      include: transactionInclude,
    })

    await notifyTransaction(session.user.id, transactionType, description, totalCents)

    return NextResponse.json(toTransactionDto(transaction), { status: 201 })
  }

  const groupId = crypto.randomUUID()
  const baseDate = parseLocalDate(date)

  const transactions = await prisma.$transaction(
    Array.from({ length: totalInstallments }, (_, i) => {
      const installmentDate = new Date(baseDate)
      installmentDate.setMonth(installmentDate.getMonth() + i)

      const installmentAmount = baseAmount + (i < remainder ? 1 : 0)

      return prisma.transaction.create({
        data: {
          transactionType,
          description: `${description} (${i + 1}/${totalInstallments})`,
          amount: installmentAmount,
          date: installmentDate,
          userId: session.user.id,
          accountId: resolvedAccountId,
          creditCardId: resolvedCardId,
          categoryId: categoryId ?? null,
          installmentGroupId: groupId,
          installmentCurrent: i + 1,
          installmentTotal: totalInstallments,
        },
        include: transactionInclude,
      })
    })
  )

  await notifyTransaction(session.user.id, transactionType, description, totalCents)

  return NextResponse.json(toTransactionDto(transactions[0]), { status: 201 })
}
