import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminNotify from '@/components/admin-notify'
import AdminUsers from '@/components/admin-users'
import { prisma } from '@/lib/prisma'
import { Users, BarChart3, Send } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Admin | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [totalUsers, totalTransactions, totalAccounts, totalCategories, newUsers7d, newUsers30d, activeUsersMonth, txLast7d] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.account.count(),
    prisma.category.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.transaction.findMany({ where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, select: { userId: true }, distinct: ['userId'] }).then((txs) => txs.length),
    prisma.transaction.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ])

  const metrics = [
    { label: 'Usuários', value: totalUsers, icon: Users, bg: 'bg-blue-600' },
    { label: 'Novos (7d)', value: newUsers7d, icon: Users, bg: 'bg-sky-500' },
    { label: 'Novos (30d)', value: newUsers30d, icon: Users, bg: 'bg-cyan-500' },
    { label: 'Ativos (mês)', value: activeUsersMonth, icon: Users, bg: 'bg-emerald-600' },
    { label: 'Transações', value: totalTransactions, icon: BarChart3, bg: 'bg-violet-600' },
    { label: 'Tx (7d)', value: txLast7d, icon: BarChart3, bg: 'bg-purple-500' },
    { label: 'Contas', value: totalAccounts, icon: BarChart3, bg: 'bg-amber-500' },
    { label: 'Categorias', value: totalCategories, icon: BarChart3, bg: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Administração</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Métricas do sistema, gerenciamento de usuários e notificações.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Métricas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className={`flex items-center gap-3 rounded-xl p-4 ${m.bg}`}>
              <m.icon className="h-6 w-6 shrink-0 text-white/80" />
              <div>
                <p className="text-2xl font-bold text-white">{m.value.toLocaleString('pt-BR')}</p>
                <p className="text-xs font-medium text-white/80">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <Users className="h-5 w-5" />
          Gerenciar Usuários
        </h2>
        <AdminUsers />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <Send className="h-5 w-5" />
          Notificações
        </h2>
        <AdminNotify />
      </section>
    </div>
  )
}
