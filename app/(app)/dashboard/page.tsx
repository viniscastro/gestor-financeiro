import { redirect } from 'next/navigation'
import {
  AlarmClock,
  ArrowLeftRight,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatBRL, formatDate } from '@/lib/format'
import { getUpcomingBills } from '@/lib/recurring'
import DashboardCards from '@/components/dashboard-cards'
import DashboardCardEditor from '@/components/dashboard-card-editor'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = session.user.id

  const [accounts, transactions, recent, budgets, goals, recurringRules, topCategories] = await Promise.all([
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
          ? 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400'
          : 'text-rose-600 bg-rose-500/15 dark:text-rose-400',
    },
    {
      id: 'entradas' as const,
      label: 'Entradas no mês',
      value: formatBRL(monthIncome),
      accent: 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400',
    },
    {
      id: 'saidas' as const,
      label: 'Saídas no mês',
      value: formatBRL(monthExpense),
      accent: 'text-rose-600 bg-rose-500/15 dark:text-rose-400',
    },
    {
      id: 'guardado' as const,
      label: 'Guardado (metas)',
      value: formatBRL(totalSaved),
      accent: 'text-sky-600 bg-sky-500/15 dark:text-sky-400',
    },
    {
      id: 'recorrentes' as const,
      label: 'Recorrentes (mês)',
      value: formatBRL(Math.abs(monthlyRecurring)),
      accent: 'text-violet-600 bg-violet-500/15 dark:text-violet-400',
    },
    {
      id: 'proximo-vencimento' as const,
      label: 'Próximo vencimento',
      value: nextBill ? formatBRL(nextBill.amountCents) : '—',
      accent: 'text-amber-600 bg-amber-500/15 dark:text-amber-400',
    },
    {
      id: 'fluxo' as const,
      label: 'Fluxo do mês',
      value: formatBRL(monthFlow),
      accent:
        monthFlow >= 0
          ? 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400'
          : 'text-rose-600 bg-rose-500/15 dark:text-rose-400',
    },
    {
      id: 'orcamento' as const,
      label: 'Orçamentos estourados',
      value: overBudget.length === 0 ? 'Nenhum' : `${overBudget.length} estourado${overBudget.length > 1 ? 's' : ''}`,
      accent: overBudget.length > 0
        ? 'text-rose-600 bg-rose-500/15 dark:text-rose-400'
        : 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400',
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-2xl">Dashboard</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          {session.user.name ? `Olá, ${session.user.name.split(' ')[0]}!` : 'Olá!'} Veja seu
          resumo financeiro.
        </p>
      </div>

      <DashboardCards cards={cards} />
      <DashboardCardEditor />

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
                className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {account.name}
                  </p>
                </div>
                <p
                  className={`mt-1.5 text-lg font-bold ${
                    balance >= 0
                      ? 'text-zinc-900 dark:text-zinc-50'
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
            <Target className="h-4 w-4 text-rose-600 dark:text-rose-400" />
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
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
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</span>
                    </div>
                    <span className="text-zinc-500">{formatBRL(c.spent)} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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

      {upcomingDue.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="mb-2 flex items-center gap-2">
            <AlarmClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-semibold text-amber-800 dark:text-amber-300">
              Contas a vencer
            </h2>
          </div>
          <ul className="space-y-1.5">
            {upcomingDue.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 text-sm text-amber-700 dark:text-amber-400">
                <span className="truncate font-medium">{b.description}</span>
                <span className="shrink-0">
                  {b.days === 0
                    ? 'vence hoje'
                    : b.days === 1
                      ? 'vence amanhã'
                      : `em ${b.days} dias`}{' '}
                  · {formatBRL(b.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/recurring"
            className="mt-3 inline-flex text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400"
          >
            Gerenciar recorrentes
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Transações recentes
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Ver todas
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Nenhuma transação ainda. Adicione a primeira em “Transações”.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recent.map((t) => {
              const isIncome = t.transactionType === 'INCOME'
              const isTransfer = Boolean(t.transferGroupId && !t.category)
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      isTransfer
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                        : isIncome
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isTransfer ? '⇄' : isIncome ? '+' : '–'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t.description}
                    </p>
                    <p className="text-xs text-zinc-500">
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
