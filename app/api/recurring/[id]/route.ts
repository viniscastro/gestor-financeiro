import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@/src/generated/prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recurringRuleSchema, toRecurringRuleDto } from '@/lib/recurring-rule'
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

  const parsed = recurringRuleSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const input = parsed.data

  if (input.accountId !== undefined) {
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, userId: session.user.id },
      select: { id: true },
    })
    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }
  }

  if (input.categoryId !== undefined && input.categoryId !== null) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId: session.user.id },
      select: { id: true },
    })
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
  }

  const data: Prisma.RecurringRuleUpdateInput = {}
  if (input.description !== undefined) data.description = input.description
  if (input.amount !== undefined) data.amountCents = amountToCents(input.amount)
  if (input.type !== undefined) data.type = input.type
  if (input.categoryId !== undefined) {
    data.category = input.categoryId
      ? { connect: { id: input.categoryId } }
      : { disconnect: true }
  }
  if (input.accountId !== undefined) data.account = { connect: { id: input.accountId } }
  if (input.dayOfMonth !== undefined) data.dayOfMonth = input.dayOfMonth
  if (input.notifyDaysBefore !== undefined) data.notifyDaysBefore = input.notifyDaysBefore
  if (input.active !== undefined) data.active = input.active

  try {
    const rule = await prisma.recurringRule.update({
      where: { id, userId: session.user.id },
      data,
      include: {
        account: { select: { name: true, color: true } },
        category: { select: { name: true, color: true } },
      },
    })
    return NextResponse.json(toRecurringRuleDto(rule))
  } catch {
    return NextResponse.json({ error: 'Conta recorrente não encontrada' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  try {
    await prisma.recurringRule.delete({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Conta recorrente não encontrada' }, { status: 404 })
  }
}
