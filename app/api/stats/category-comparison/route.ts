import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const from1 = searchParams.get('from1')
  const to1 = searchParams.get('to1')
  const from2 = searchParams.get('from2')
  const to2 = searchParams.get('to2')

  if (!from1 || !to1 || !from2 || !to2) {
    return NextResponse.json({ error: 'Datas obrigatórias' }, { status: 400 })
  }

  const start1 = new Date(from1 + 'T00:00:00')
  const end1 = new Date(to1 + 'T23:59:59.999')
  const start2 = new Date(from2 + 'T00:00:00')
  const end2 = new Date(to2 + 'T23:59:59.999')

  const [txns1, txns2, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        transactionType: 'EXPENSE',
        date: { gte: start1, lte: end1 },
        transferGroupId: null,
      },
      select: { categoryId: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        transactionType: 'EXPENSE',
        date: { gte: start2, lte: end2 },
        transferGroupId: null,
      },
      select: { categoryId: true, amount: true },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, color: true },
    }),
  ])

  const categoryMeta = new Map(categories.map((c) => [c.id, c]))

  const map1 = new Map<string, number>()
  const map2 = new Map<string, number>()
  let total1 = 0
  let total2 = 0

  for (const t of txns1) {
    if (!t.categoryId) continue
    map1.set(t.categoryId, (map1.get(t.categoryId) ?? 0) + t.amount)
    total1 += t.amount
  }
  for (const t of txns2) {
    if (!t.categoryId) continue
    map2.set(t.categoryId, (map2.get(t.categoryId) ?? 0) + t.amount)
    total2 += t.amount
  }

  const allCategoryIds = new Set([...map1.keys(), ...map2.keys()])
  const comparison = Array.from(allCategoryIds).map((catId) => {
    const meta = categoryMeta.get(catId)
    const amount1 = map1.get(catId) ?? 0
    const amount2 = map2.get(catId) ?? 0
    return {
      categoryId: catId,
      name: meta?.name ?? 'Sem categoria',
      color: meta?.color ?? '#78716c',
      amount1,
      amount2,
      diff: amount2 - amount1,
      pct1: total1 > 0 ? (amount1 / total1) * 100 : 0,
      pct2: total2 > 0 ? (amount2 / total2) * 100 : 0,
    }
  })

  comparison.sort((a, b) => Math.abs(b.amount2) - Math.abs(a.amount2))

  return NextResponse.json({ comparison, total1, total2 })
}
