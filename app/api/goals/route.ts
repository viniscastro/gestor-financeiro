import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { goalSchema, toGoalDto } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

const goalInclude = {
  account: {
    select: {
      name: true,
      color: true,
      initialBalance: true,
      transactions: { select: { transactionType: true, amount: true } },
    },
  },
} as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: session.user.id },
    include: goalInclude,
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(goals.map(toGoalDto))
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

  const parsed = goalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, targetAmount, currentAmount, accountId, targetDate } = parsed.data

  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
      select: { id: true },
    })
    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: session.user.id,
      name,
      targetAmount: amountToCents(targetAmount),
      currentAmount: amountToCents(currentAmount),
      accountId: accountId ?? null,
      targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
    },
    include: goalInclude,
  })

  return NextResponse.json(toGoalDto(goal), { status: 201 })
}
