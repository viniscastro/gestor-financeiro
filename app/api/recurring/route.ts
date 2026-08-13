import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { materializeRecurring } from '@/lib/recurring'
import { recurringRuleSchema, toRecurringRuleDto } from '@/lib/recurring-rule'
import { amountToCents } from '@/lib/transactions'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await materializeRecurring(session.user.id)

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id },
    include: {
      account: { select: { name: true, color: true } },
      category: { select: { name: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(rules.map(toRecurringRuleDto))
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

  const parsed = recurringRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { description, amount, type, categoryId, accountId, dayOfMonth, notifyDaysBefore } =
    parsed.data

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

  const rule = await prisma.recurringRule.create({
    data: {
      userId: session.user.id,
      description,
      amountCents: amountToCents(amount),
      type,
      categoryId: categoryId ?? null,
      accountId,
      dayOfMonth,
      notifyDaysBefore,
    },
    include: {
      account: { select: { name: true, color: true } },
      category: { select: { name: true, color: true } },
    },
  })

  return NextResponse.json(toRecurringRuleDto(rule), { status: 201 })
}
