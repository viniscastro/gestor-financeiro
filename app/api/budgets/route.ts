import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { budgetSchema, computeSpent, toBudgetDto } from '@/lib/budget'
import { amountToCents } from '@/lib/transactions'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id },
    include: { category: { select: { name: true, color: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (budgets.length > 0) {
    const txns = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        transactionType: 'EXPENSE',
        date: { gte: startOfMonth },
        categoryId: { in: budgets.map((b) => b.categoryId) },
      },
      select: { categoryId: true, amount: true },
    })
    const spentMap = new Map<string, number>()
    for (const t of txns) {
      if (t.categoryId) {
        spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount)
      }
    }
    return NextResponse.json(
      budgets.map((b) => toBudgetDto({ ...b, spent: spentMap.get(b.categoryId) ?? 0 }))
    )
  }

  return NextResponse.json([])
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

  const parsed = budgetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { categoryId, amount } = parsed.data

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    select: { id: true, type: true, name: true, color: true },
  })
  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }
  if (category.type !== 'EXPENSE') {
    return NextResponse.json(
      { error: 'Orçamentos só podem ser criados para categorias de saída' },
      { status: 400 }
    )
  }

  const existing = await prisma.budget.findUnique({
    where: { userId_categoryId: { userId: session.user.id, categoryId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Já existe um orçamento para esta categoria' },
      { status: 409 }
    )
  }

  const budget = await prisma.budget.create({
    data: {
      userId: session.user.id,
      categoryId,
      amountCents: amountToCents(amount),
    },
    include: { category: { select: { name: true, color: true } } },
  })

  return NextResponse.json(
    toBudgetDto({ ...budget, spent: await computeSpent(session.user.id, categoryId) }),
    { status: 201 }
  )
}
