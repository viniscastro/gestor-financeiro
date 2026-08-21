import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { goalSchema, toGoalDto } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

let iconColumnReady = false

async function ensureIconColumn() {
  if (iconColumnReady) return
  try {
    await prisma.$executeRaw`ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "icon" TEXT`
    iconColumnReady = true
  } catch {
    iconColumnReady = true
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await ensureIconColumn()

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

  await ensureIconColumn()

  const parsed = goalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, icon, targetAmount, currentAmount, accountId, targetDate } = parsed.data
  const currentCents = amountToCents(currentAmount)

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
    },
  })

  return NextResponse.json(toGoalDto(goal), { status: 201 })
}
