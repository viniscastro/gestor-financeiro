import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params
  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!card) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { transactions, categoryId } = body as {
    transactions?: { date: string; description: string; amountCents: number; type?: 'INCOME' | 'EXPENSE'; abate?: boolean }[]
    categoryId?: string | null
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: 'Nenhuma transação para importar' }, { status: 400 })
  }
  if (transactions.length > 500) {
    return NextResponse.json({ error: 'Máximo de 500 transações por importação' }, { status: 400 })
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: session.user.id },
      select: { id: true },
    })
    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
  }

  const created = await prisma.transaction.createMany({
    data: transactions.map((t) => {
      const abate = t.abate !== false
      const transactionType = abate
        ? t.type === 'INCOME'
          ? ('INCOME' as const)
          : ('EXPENSE' as const)
        : ('INCOME' as const)
      return {
        transactionType,
        description: t.description,
        amount: Math.abs(t.amountCents),
        date: new Date(t.date),
        userId: session.user.id,
        categoryId: categoryId ?? null,
        creditCardId: abate ? card.id : null,
      }
    }),
  })

  return NextResponse.json({ ok: true, imported: created.count })
}
