import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeSpent, toBudgetDto } from '@/lib/budget'
import { amountToCents } from '@/lib/transactions'

const patchSchema = z.object({
  amount: z.number().positive('O valor deve ser maior que zero'),
})

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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  try {
    const budget = await prisma.budget.update({
      where: { id, userId: session.user.id },
      data: { amountCents: amountToCents(parsed.data.amount) },
      include: { category: { select: { name: true, color: true } } },
    })
    return NextResponse.json(
      toBudgetDto({ ...budget, spent: await computeSpent(session.user.id, budget.categoryId) })
    )
  } catch {
    return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  try {
    await prisma.budget.delete({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
  }
}
