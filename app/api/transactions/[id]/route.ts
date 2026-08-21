import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents, toTransactionDto, transactionSchema } from '@/lib/transactions'

const transactionInclude = {
  account: { select: { name: true, color: true } },
  category: { select: { id: true, name: true, color: true } },
} as const

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

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

  const { transactionType, description, amount, accountId, categoryId, date } = parsed.data

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

  try {
    const transaction = await prisma.transaction.update({
      where: { id, userId: session.user.id },
      data: {
        transactionType,
        description,
        amount: amountToCents(amount),
        date: new Date(date),
        accountId,
        categoryId: categoryId ?? null,
      },
      include: transactionInclude,
    })
    return NextResponse.json(toTransactionDto(transaction))
  } catch {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, transferGroupId: true, description: true, amount: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  const topupMatch = existing.description?.match(/^Aporte: (.+)$/)

  if (existing.transferGroupId) {
    await prisma.transaction.deleteMany({
      where: {
        userId: session.user.id,
        transferGroupId: existing.transferGroupId,
      },
    })
  } else {
    await prisma.transaction.delete({
      where: { id, userId: session.user.id },
    })
  }

  if (topupMatch) {
    const goalName = topupMatch[1]
    const goal = await prisma.savingsGoal.findFirst({
      where: { userId: session.user.id, name: goalName },
      select: { id: true, currentAmount: true },
    })
    if (goal) {
      await prisma.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: Math.max(0, goal.currentAmount - existing.amount) },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
