import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminNotify from '@/components/admin-notify'
import AdminUsers from '@/components/admin-users'
import { prisma } from '@/lib/prisma'
import { Users, BarChart3, Send } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Admin | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function startOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/dashboard')
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (adminUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [totalUsers, totalTransactions, totalAccounts, totalCategories, newUsers7d, newUsers30d, activeUsersMonth, txLast7d] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.account.count(),
    prisma.category.count(),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.transaction.findMany({ where: { date: { gte: startOfCurrentMonth() } }, select: { userId: true }, distinct: ['userId'] }).then((txs) => txs.length),
    prisma.transaction.count({ where: { createdAt: { gte: daysAgo(7) } } }),
  ])

  const metrics = [
    { label: 'Usuários', value: totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Novos (7d)', value: newUsers7d, icon: Users, color: 'bg-blue-400' },
    { label: 'Novos (30d)', value: newUsers30d, icon: Users, color: 'bg-blue-300' },
    { label: 'Ativos (mês)', value: activeUsersMonth, icon: Users, color: 'bg-brand-500' },
    { label: 'Transações', value: totalTransactions, icon: BarChart3, color: 'bg-violet-500' },
    { label: 'Tx (7d)', value: txLast7d, icon: BarChart3, color: 'bg-violet-400' },
    { label: 'Contas', value: totalAccounts, icon: BarChart3, color: 'bg-amber-500' },
    { label: 'Categorias', value: totalCategories, icon: BarChart3, color: 'bg-amber-400' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Administração</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Métricas do sistema, gerenciamento de usuários e notificações.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Métricas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color}`}>
                  <m.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{m.value.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
          <Users className="h-5 w-5" />
          Gerenciar Usuários
        </h2>
        <AdminUsers />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
          <Send className="h-5 w-5" />
          Notificações
        </h2>
        <AdminNotify />
      </section>
    </div>
  )
}
