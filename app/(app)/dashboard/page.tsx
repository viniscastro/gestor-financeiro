import { redirect } from 'next/navigation'
import { ArrowLeftRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CATEGORY_LABEL } from '@/lib/categories'
import { formatBRL, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = session.user.id

  const [transactions, recent] = await Promise.all([
    prisma.transaction.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ])

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let balance = 0
  let monthIncome = 0
  let monthExpense = 0
  for (const t of transactions) {
    if (t.transactionType === 'INCOME') {
      balance += t.amount
      if (t.date >= startOfMonth) monthIncome += t.amount
    } else {
      balance -= t.amount
      if (t.date >= startOfMonth) monthExpense += t.amount
    }
  }

  const cards = [
    {
      label: 'Saldo total',
      value: formatBRL(balance),
      icon: Wallet,
      accent: balance >= 0 ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15',
    },
    {
      label: 'Entradas no mês',
      value: formatBRL(monthIncome),
      icon: TrendingUp,
      accent: 'text-emerald-400 bg-emerald-500/15',
    },
    {
      label: 'Saídas no mês',
      value: formatBRL(monthExpense),
      icon: TrendingDown,
      accent: 'text-rose-400 bg-rose-500/15',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400">
          {session.user.name ? `Olá, ${session.user.name.split(' ')[0]}!` : 'Olá!'} Veja seu resumo
          financeiro.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {card.label}
              </p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Transações recentes</h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
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
          <ul className="divide-y divide-zinc-800">
            {recent.map((t) => {
              const isIncome = t.transactionType === 'INCOME'
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '–'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{t.description}</p>
                    <p className="text-xs text-zinc-500">
                      {CATEGORY_LABEL[t.category] ?? t.category} · {formatDate(t.date)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
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
