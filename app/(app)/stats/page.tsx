import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/categories'
import StatisticsCharts from '@/components/statistics-charts'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = session.user.id

  const transactions = await prisma.transaction.findMany({ where: { userId } })

  const now = new Date()
  const months: { key: string; label: string; income: number; expense: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({
      key,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
      income: 0,
      expense: 0,
    })
  }

  const expenseByCategory = new Map<string, number>()

  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    const month = months.find((m) => m.key === key)
    if (month) {
      if (t.transactionType === 'INCOME') month.income += t.amount
      else month.expense += t.amount
    }
    if (t.transactionType === 'EXPENSE') {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + t.amount)
    }
  }

  const byCategory = Array.from(expenseByCategory.entries())
    .map(([category, amount]) => ({
      category,
      label: CATEGORY_LABEL[category] ?? category,
      color: CATEGORY_COLOR[category] ?? '#78716c',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalExpense = byCategory.reduce((sum, c) => sum + c.amount, 0)

  const monthly = months.map(({ label, income, expense }) => ({ label, income, expense }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
        <p className="text-sm text-zinc-400">Analise suas finanças com gráficos</p>
      </div>

      <StatisticsCharts monthly={monthly} byCategory={byCategory} totalExpense={totalExpense} />
    </div>
  )
}
