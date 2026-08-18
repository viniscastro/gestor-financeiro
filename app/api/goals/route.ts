import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { goalSchema, toGoalDto } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

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

  const { name, targetAmount, currentAmount, targetDate } = parsed.data

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: session.user.id,
      name,
      targetAmount: amountToCents(targetAmount),
      currentAmount: amountToCents(currentAmount),
      targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
    },
  })

  return NextResponse.json(toGoalDto(goal), { status: 201 })
}
