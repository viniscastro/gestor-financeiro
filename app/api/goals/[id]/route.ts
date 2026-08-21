import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@/src/generated/prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { goalPatchSchema, toGoalDto } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

type Params = { params: Promise<{ id: string }> }

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

export async function PATCH(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  await ensureIconColumn()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = goalPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const input = parsed.data

  const data: Prisma.SavingsGoalUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.icon !== undefined) data.icon = input.icon ?? null
  if (input.targetAmount !== undefined) data.targetAmount = amountToCents(input.targetAmount)
  if (input.currentAmount !== undefined) data.currentAmount = amountToCents(input.currentAmount)
  if (input.targetDate !== undefined) {
    data.targetDate = input.targetDate ? new Date(`${input.targetDate}T00:00:00.000Z`) : null
  }

  try {
    const goal = await prisma.savingsGoal.update({
      where: { id, userId: session.user.id },
      data,
    })
    return NextResponse.json(toGoalDto(goal))
  } catch {
    return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  try {
    await prisma.savingsGoal.delete({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 })
  }
}
