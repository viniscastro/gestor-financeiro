import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invoiceWindow } from '@/lib/cards'
import { amountToCents, toTransactionDto } from '@/lib/transactions'
import { parseLocalDate } from '@/lib/format'
import { notifyCardDiscount } from '@/lib/notifications'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const purchaseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  categoryId: z.string().nullable().optional(),
  transactionType: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  installments: z.number().int().min(1).max(48).default(1),
})

export async function GET(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params
  const month = request.nextUrl.searchParams.get('month')

  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!card) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
  }

  let gte: Date
  let lte: Date

  if (month) {
    const [y, m] = month.split('-').map(Number)
    const window = invoiceWindow(card, new Date(y, m - 1, Math.min(card.dueDay, 28)))
    gte = window.start
    lte = window.end
  } else {
    const window = invoiceWindow(card, new Date())
    gte = window.start
    lte = window.end
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, creditCardId: card.id, date: { gte, lte } },
    include: { account: { select: { name: true, color: true } }, category: { select: { id: true, name: true, color: true } } },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(transactions.map(toTransactionDto))
}

export async function POST(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params
  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!card) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = purchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { description, amount, date, categoryId, transactionType, installments } = parsed.data

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: session.user.id },
      select: { id: true },
    })
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
  }

  const totalInstallments = transactionType === 'EXPENSE' ? installments : 1
  const totalCents = amountToCents(amount)
  const baseAmount = Math.floor(totalCents / totalInstallments)
  const remainder = totalCents - baseAmount * totalInstallments

  if (transactionType === 'INCOME') {
    const discount = await prisma.transaction.create({
      data: {
        transactionType: 'INCOME',
        description,
        amount: totalCents,
        date: parseLocalDate(date),
        userId: session.user.id,
        categoryId: categoryId ?? null,
        creditCardId: card.id,
      },
      include: { account: { select: { name: true, color: true } }, category: { select: { id: true, name: true, color: true } } },
    })
    await notifyCardDiscount(session.user.id, description, totalCents)
    return NextResponse.json(toTransactionDto(discount), { status: 201 })
  }

  if (totalInstallments === 1) {
    const transaction = await prisma.transaction.create({
      data: {
        transactionType: 'EXPENSE',
        description,
        amount: totalCents,
        date: parseLocalDate(date),
        userId: session.user.id,
        categoryId: categoryId ?? null,
        creditCardId: card.id,
      },
      include: { account: { select: { name: true, color: true } }, category: { select: { id: true, name: true, color: true } } },
    })
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
          transactionType: 'EXPENSE',
          description: `${description} (${i + 1}/${totalInstallments})`,
          amount: installmentAmount,
          date: installmentDate,
          userId: session.user.id,
          categoryId: categoryId ?? null,
          creditCardId: card.id,
          installmentGroupId: groupId,
          installmentCurrent: i + 1,
          installmentTotal: totalInstallments,
        },
        include: { account: { select: { name: true, color: true } }, category: { select: { id: true, name: true, color: true } } },
      })
    })
  )

  return NextResponse.json(toTransactionDto(transactions[0]), { status: 201 })
}
