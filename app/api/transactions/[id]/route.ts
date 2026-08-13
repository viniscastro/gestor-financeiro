import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents, transactionSchema } from '@/lib/transactions'

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

  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { transactionType, description, amount, category, date } = parsed.data

  try {
    const transaction = await prisma.transaction.update({
      where: { id, userId: session.user.id },
      data: {
        transactionType,
        description,
        amount: amountToCents(amount),
        category,
        date: new Date(date),
      },
    })
    return NextResponse.json({
      id: transaction.id,
      transactionType: transaction.transactionType,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  try {
    await prisma.transaction.delete({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
  }
}
