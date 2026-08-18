import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { materializeRecurring } from '@/lib/recurring'
import { recurringRuleSchema, toRecurringRuleDto } from '@/lib/recurring-rule'
import { amountToCents } from '@/lib/transactions'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

const ruleInclude = {
  account: { select: { name: true, color: true } },
  category: { select: { name: true, color: true } },
  toAccount: { select: { name: true, color: true } },
} as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await materializeRecurring(session.user.id)

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id },
    include: ruleInclude,
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(rules.map(toRecurringRuleDto))
}

export async function PATCH(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.api, 'recurring')
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

  const { ids } = body as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const updates = ids.map((id, index) =>
    prisma.recurringRule.update({
      where: { id, userId: session.user.id },
      data: { position: index },
    })
  )

  await prisma.$transaction(updates)

  return NextResponse.json({ ok: true })
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

  const input = parsed.data

  if (input.kind === 'TRANSFER') {
    const ids = [input.fromAccountId, input.toAccountId]
    if (input.fromAccountId === input.toAccountId) {
      return NextResponse.json(
        { error: 'As contas de origem e destino devem ser diferentes' },
        { status: 400 }
      )
    }
    const found = await prisma.account.count({
      where: { userId: session.user.id, id: { in: ids } },
    })
    if (found !== 2) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    const rule = await prisma.recurringRule.create({
      data: {
        userId: session.user.id,
        description: input.description,
        amountCents: amountToCents(input.amount),
        kind: 'TRANSFER',
        type: 'TRANSFER',
        categoryId: null,
        accountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        dayOfMonth: input.dayOfMonth,
        notifyDaysBefore: input.notifyDaysBefore,
      },
      include: ruleInclude,
    })
    return NextResponse.json(toRecurringRuleDto(rule), { status: 201 })
  }

  const account = await prisma.account.findFirst({
    where: { id: input.accountId, userId: session.user.id },
    select: { id: true },
  })
  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId: session.user.id },
      select: { id: true },
    })
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
  }

  const rule = await prisma.recurringRule.create({
    data: {
      userId: session.user.id,
      description: input.description,
      amountCents: amountToCents(input.amount),
      kind: 'TRANSACTION',
      type: input.type,
      categoryId: input.categoryId ?? null,
      accountId: input.accountId,
      dayOfMonth: input.dayOfMonth,
      notifyDaysBefore: input.notifyDaysBefore,
    },
    include: ruleInclude,
  })

  return NextResponse.json(toRecurringRuleDto(rule), { status: 201 })
}
