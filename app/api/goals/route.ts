import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { goalSchema, toGoalDto, materializeGoalContributions } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await materializeGoalContributions(session.user.id)

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: session.user.id },
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

  const { name, icon, targetAmount, currentAmount, accountId, targetDate, autoContributeAmount, autoContributeDayOfMonth, autoContributeAccountId } = parsed.data
  const currentCents = amountToCents(currentAmount)

  const autoAmount = autoContributeAmount != null ? amountToCents(autoContributeAmount) : null

  if (autoContributeAccountId) {
    const owned = await prisma.account.count({
      where: { id: autoContributeAccountId, userId: session.user.id },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }
  }

  if (currentCents > 0 && accountId) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const account = await tx.account.findFirst({
          where: { id: accountId, userId: session.user.id },
        })
        if (!account) throw new Error('Conta não encontrada')

        const goal = await tx.savingsGoal.create({
          data: {
            userId: session.user.id,
            name,
            icon: icon ?? null,
            targetAmount: amountToCents(targetAmount),
            currentAmount: currentCents,
            targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
            autoContributeAmount: autoAmount,
            autoContributeDayOfMonth: autoContributeDayOfMonth ?? null,
            autoContributeAccountId: autoContributeAccountId ?? null,
          },
        })

        await tx.transaction.create({
          data: {
            userId: session.user.id,
            accountId,
            transactionType: 'EXPENSE',
            description: `Aporte: ${name}`,
            amount: currentCents,
            date: new Date(),
          },
        })

        return goal
      })

      return NextResponse.json(toGoalDto(result), { status: 201 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar meta'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: session.user.id,
      name,
      icon: icon ?? null,
      targetAmount: amountToCents(targetAmount),
      currentAmount: currentCents,
      targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
      autoContributeAmount: autoAmount,
      autoContributeDayOfMonth: autoContributeDayOfMonth ?? null,
      autoContributeAccountId: autoContributeAccountId ?? null,
    },
  })

  return NextResponse.json(toGoalDto(goal), { status: 201 })
}
