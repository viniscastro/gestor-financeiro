import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { monthKey } from '@/lib/recurring'
import { toRecurringRuleDto } from '@/lib/recurring-rule'

const ruleInclude = {
  account: { select: { name: true, color: true } },
  creditCard: { select: { name: true } },
  category: { select: { name: true, color: true } },
  toAccount: { select: { name: true, color: true } },
} as const

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  const rule = await prisma.recurringRule.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!rule) {
    return NextResponse.json({ error: 'Conta recorrente não encontrada' }, { status: 404 })
  }

  if (!rule.active) {
    return NextResponse.json({ error: 'Conta recorrente desativada' }, { status: 400 })
  }

  const key = monthKey(new Date())
  const existing = await prisma.transaction.findFirst({
    where: {
      recurringId: id,
      userId: session.user.id,
      occurrenceMonth: key,
    },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Já paga neste mês' }, { status: 400 })
  }

  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.min(rule.dayOfMonth, lastDay)
  )

  if (rule.kind === 'TRANSFER' && rule.toAccountId) {
    const groupId = randomUUID()
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionType: 'EXPENSE',
          description: rule.description,
          amount: rule.amountCents,
          date,
          userId: session.user.id,
          accountId: rule.accountId,
          categoryId: null,
          recurringId: rule.id,
          occurrenceMonth: key,
          transferGroupId: groupId,
        },
      }),
      prisma.transaction.create({
        data: {
          transactionType: 'INCOME',
          description: rule.description,
          amount: rule.amountCents,
          date,
          userId: session.user.id,
          accountId: rule.toAccountId,
          categoryId: null,
          recurringId: rule.id,
          occurrenceMonth: key,
          transferGroupId: groupId,
        },
      }),
      prisma.recurringRule.update({
        where: { id: rule.id },
        data: { lastMaterializedMonth: key },
      }),
    ])
  } else {
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          transactionType: rule.type,
          description: rule.description,
          amount: rule.amountCents,
          date,
          userId: session.user.id,
          accountId: rule.accountId,
          creditCardId: rule.creditCardId ?? null,
          categoryId: rule.categoryId,
          recurringId: rule.id,
          occurrenceMonth: key,
        },
      }),
      prisma.recurringRule.update({
        where: { id: rule.id },
        data: { lastMaterializedMonth: key },
      }),
    ])
  }

  const updated = await prisma.recurringRule.findUnique({
    where: { id: rule.id },
    include: ruleInclude,
  })

  return NextResponse.json(toRecurringRuleDto(updated!))
}
