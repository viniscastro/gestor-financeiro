import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  ArrowLeftRight,
  Target,
} from '@/components/icons'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatBRL, formatDate } from '@/lib/format'
import { getUpcomingBills } from '@/lib/recurring'
import { getUpcomingCreditCardStatements } from '@/lib/cards'
import { materializeGoalContributions } from '@/lib/goal'
import DashboardCards from '@/components/dashboard-cards'
import DashboardCardEditor, { type DashboardCardId } from '@/components/dashboard-card-editor'
import MonthlyTrendChart from '@/components/monthly-trend-chart'
import UpcomingBills from '@/components/upcoming-bills'

export const metadata: Metadata = {
  title: 'Dashboard | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  await materializeGoalContributions(userId)

  const [accounts, transactions, recent, budgets, goals, recurringRules, topCategories, user] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      include: {
        transactions: { select: { transactionType: true, amount: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: {
        id: true,
        transactionType: true,
        amount: true,
        date: true,
        categoryId: true,
        transferGroupId: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        account: { select: { name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
    prisma.savingsGoal.findMany({
      where: { userId },
      select: { currentAmount: true },
    }),
    prisma.recurringRule.findMany({
      where: { userId, active: true },
      select: { amountCents: true, type: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { dashboardCards: true },
    }),
  ])

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const totalBalance = accounts.reduce(
    (sum, a) =>
      sum +
      a.initialBalance +
      a.transactions.reduce((s, t) => {
        return t.transactionType === 'INCOME' ? s + t.amount : s - t.amount
      }, 0),
    0
  )

  let monthIncome = 0
  let monthExpense = 0
  for (const t of transactions) {
    if (t.transferGroupId) continue
    if (t.date >= startOfMonth) {
      if (t.transactionType === 'INCOME') monthIncome += t.amount
      else monthExpense += t.amount
    }
  }

  const spentByCategory = new Map<string, number>()
  const monthTxns = transactions.filter((t) => t.date >= startOfMonth && !t.transferGroupId)
  for (const t of monthTxns) {
    if (t.transactionType !== 'EXPENSE' || !t.categoryId) continue
    const category = budgets.find((b) => b.categoryId === t.categoryId)
    if (category) {
      spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount)
    }
  }
  const overBudget = budgets
    .map((b) => ({
      id: b.id,
      name: b.category.name,
      color: b.category.color,
      amountCents: b.amountCents,
      spent: spentByCategory.get(b.categoryId) ?? 0,
    }))
    .filter((b) => b.spent > b.amountCents)

  const upcoming = await getUpcomingBills(userId)
  const upcomingDue = upcoming.filter((b) => b.days <= 7)
  const cardUpcoming = await getUpcomingCreditCardStatements(userId, 7)

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)

  const monthlyRecurring = recurringRules
    .filter((r) => r.type !== null)
    .reduce((sum, r) => {
      if (r.type === 'INCOME') return sum + r.amountCents
      return sum - r.amountCents
    }, 0)

  const expenseByCategory = new Map<string, number>()
  for (const t of transactions) {
    if (t.transferGroupId || t.transactionType !== 'EXPENSE' || !t.categoryId) continue
    if (t.date >= startOfMonth) {
      expenseByCategory.set(t.categoryId, (expenseByCategory.get(t.categoryId) ?? 0) + t.amount)
    }
  }
  const topCats = topCategories
    .map((c) => ({ ...c, spent: expenseByCategory.get(c.id) ?? 0 }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  const monthFlow = monthIncome - monthExpense

  const nextBill = upcoming[0]

  const cards = [
    {
      id: 'saldo' as const,
      label: 'Saldo total',
      value: formatBRL(totalBalance),
      accent:
        totalBalance >= 0
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white',
    },
    {
      id: 'entradas' as const,
      label: 'Entradas no mês',
      value: formatBRL(monthIncome),
      accent: 'bg-emerald-500 text-white',
    },
    {
      id: 'saidas' as const,
      label: 'Saídas no mês',
      value: formatBRL(monthExpense),
      accent: 'bg-rose-500 text-white',
    },
    {
      id: 'guardado' as const,
      label: 'Guardado (metas)',
      value: formatBRL(totalSaved),
      accent: 'bg-sky-500 text-white',
    },
    {
      id: 'recorrentes' as const,
      label: 'Recorrentes (mês)',
      value: formatBRL(Math.abs(monthlyRecurring)),
      accent: 'bg-violet-500 text-white',
    },
    {
      id: 'proximo-vencimento' as const,
      label: 'Próximo vencimento',
      value: nextBill ? formatBRL(nextBill.amountCents) : '—',
      accent: 'bg-amber-500 text-white',
    },
    {
      id: 'fluxo' as const,
      label: 'Fluxo do mês',
      value: formatBRL(monthFlow),
      accent:
        monthFlow >= 0
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white',
    },
    {
      id: 'orcamento' as const,
      label: 'Orçamentos estourados',
      value: overBudget.length === 0 ? 'Nenhum' : `${overBudget.length} estourado${overBudget.length > 1 ? 's' : ''}`,
      accent: overBudget.length > 0
        ? 'bg-rose-500 text-white'
        : 'bg-emerald-500 text-white',
    },
  ]

  const parsedCards: DashboardCardId[] | null = (() => {
    try {
      if (user?.dashboardCards) {
        const parsed = JSON.parse(user.dashboardCards)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return null
  })()

  const now = new Date()
  const monthlyMonths: { key: string; label: string; income: number; expense: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMonths.push({
      key,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
      income: 0,
      expense: 0,
    })
  }
  for (const t of transactions) {
    if (t.transferGroupId) continue
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    const month = monthlyMonths.find((m) => m.key === key)
    if (month) {
      if (t.transactionType === 'INCOME') month.income += t.amount
      else month.expense += t.amount
    }
  }
  const monthlyTrend = monthlyMonths.map(({ label, income, expense }) => ({ label, income, expense }))

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">Dashboard</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          {session.user.name ? `Olá, ${session.user.name.split(' ')[0]}!` : 'Olá!'} Veja seu
          resumo financeiro.
        </p>
      </div>

      <DashboardCards cards={cards} initialCards={parsedCards} />
      <DashboardCardEditor />

      <MonthlyTrendChart data={monthlyTrend} />

      {accounts.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {accounts.map((account) => {
            const balance =
              account.initialBalance +
              account.transactions.reduce((s, t) => {
                return t.transactionType === 'INCOME' ? s + t.amount : s - t.amount
              }, 0)
            return (
              <Link
                key={account.id}
                href="/accounts"
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: account.color }}
                    aria-hidden="true"
                  />
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {account.name}
                  </p>
                </div>
                <p
                  className={`mt-1.5 text-lg font-bold ${
                    balance >= 0
                      ? 'text-slate-900 dark:text-slate-50'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatBRL(balance)}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      {overBudget.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/50 dark:bg-rose-950/40">
          <div className="mb-2 flex items-center gap-2">
            <Target aria-hidden="true" className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-base font-semibold text-rose-800 dark:text-rose-300">
              Orçamentos estourados
            </h2>
          </div>
          <ul className="space-y-1.5">
            {overBudget.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="font-medium">{b.name}</span>
                <span className="text-rose-500">
                  {formatBRL(b.spent)} de {formatBRL(b.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topCats.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-50">
            Top categorias (mês)
          </h2>
          <ul className="space-y-2.5">
            {topCats.map((c) => {
              const pct = monthExpense > 0 ? Math.round((c.spent / monthExpense) * 100) : 0
              return (
                <li key={c.id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{c.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">{formatBRL(c.spent)} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {upcomingDue.length > 0 || cardUpcoming.length > 0 ? (
        <UpcomingBills
          bills={[
            ...upcomingDue.map((b) => ({
              id: b.id,
              description: b.description,
              amountCents: b.amountCents,
              days: b.days,
              kind: 'BILL' as const,
            })),
            ...cardUpcoming.map((s) => ({
              id: s.id,
              description: `Fatura ${s.cardName}`,
              amountCents: s.totalAmount,
              days: s.days,
              kind: 'CARD' as const,
            })),
          ]}
        />
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Transações recentes
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
            Ver todas
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma transação ainda. Adicione a primeira em “Transações”.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {recent.map((t) => {
              const isIncome = t.transactionType === 'INCOME'
              const isTransfer = Boolean(t.transferGroupId && !t.category)
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      isTransfer
                        ? 'bg-sky-500 text-white'
                        : isIncome
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                    }`}
                  >
                    {isTransfer ? '⇄' : isIncome ? '+' : '–'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.category?.name ?? (isTransfer ? 'Transferência' : 'Sem categoria')} ·{' '}
                      {t.account?.name} · {formatDate(t.date)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      isTransfer
                        ? 'text-sky-600 dark:text-sky-400'
                        : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '–'} {formatBRL(t.amount)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
