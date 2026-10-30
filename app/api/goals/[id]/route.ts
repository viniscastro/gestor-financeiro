import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@/src/generated/prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { goalPatchSchema, toGoalDto } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

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

  const parsed = goalPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const input = parsed.data

  if (input.autoContributeAccountId) {
    const owned = await prisma.account.count({
      where: { id: input.autoContributeAccountId, userId: session.user.id },
    })
    if (!owned) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }
  }

  const data: Prisma.SavingsGoalUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.icon !== undefined) data.icon = input.icon ?? null
  if (input.targetAmount !== undefined) data.targetAmount = amountToCents(input.targetAmount)
  if (input.currentAmount !== undefined) data.currentAmount = amountToCents(input.currentAmount)
  if (input.targetDate !== undefined) {
    data.targetDate = input.targetDate ? new Date(`${input.targetDate}T00:00:00.000Z`) : null
  }
  if (input.autoContributeAmount !== undefined) {
    data.autoContributeAmount = input.autoContributeAmount != null ? amountToCents(input.autoContributeAmount) : null
  }
  if (input.autoContributeDayOfMonth !== undefined) {
    data.autoContributeDayOfMonth = input.autoContributeDayOfMonth ?? null
  }
  if (input.autoContributeAccountId !== undefined) {
    data.autoContributeAccount = input.autoContributeAccountId
      ? { connect: { id: input.autoContributeAccountId } }
      : { disconnect: true }
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
