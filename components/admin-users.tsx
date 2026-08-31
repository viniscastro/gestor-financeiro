'use client'

import { useEffect, useState } from 'react'
import { Search, Shield, ShieldOff, Trash2, LoaderCircle, Users } from 'lucide-react'
import ConfirmDialog from '@/components/confirm-dialog'

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  _count: { transactions: number; accounts: number }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [confirmRole, setConfirmRole] = useState<AdminUser | null>(null)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function toggleRole(userId: string, currentRole: string) {
    setActionLoading(userId)
    try {
      const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
        setConfirmRole(null)
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteUser(userId: string) {
    setActionLoading(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        setConfirmDelete(null)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-zinc-200 p-8 dark:bg-zinc-700">
        <LoaderCircle className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-zinc-800">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-zinc-500">
              <Users className="h-8 w-8" />
              <p className="text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            filtered.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {u.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {u._count.transactions} transações · {u._count.accounts} contas ·{' '}
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    u.role === 'ADMIN'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200'
                  }`}
                >
                  {u.role}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmRole(u)}
                    disabled={actionLoading === u.id}
                    title={u.role === 'ADMIN' ? 'Reverter para USER' : 'Promover a ADMIN'}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white disabled:opacity-50"
                  >
                    {actionLoading === u.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : u.role === 'ADMIN' ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(u)}
                    disabled={actionLoading === u.id}
                    title="Deletar usuário"
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:text-white disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmRole}
        title={confirmRole?.role === 'ADMIN' ? 'Remover permissão de admin' : 'Promover a admin'}
        message={
          confirmRole?.role === 'ADMIN'
            ? `Tem certeza que deseja remover a permissão de admin de "${confirmRole?.name}" (${confirmRole?.email})?`
            : `Tem certeza que deseja promover "${confirmRole?.name}" (${confirmRole?.email}) a admin?`
        }
        confirmLabel={confirmRole?.role === 'ADMIN' ? 'Remover admin' : 'Promover'}
        confirmVariant={confirmRole?.role === 'ADMIN' ? 'danger' : 'primary'}
        loading={confirmRole !== null && actionLoading === confirmRole.id}
        onConfirm={() => confirmRole && toggleRole(confirmRole.id, confirmRole.role)}
        onCancel={() => setConfirmRole(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Deletar usuário"
        message={`Tem certeza que deseja deletar "${confirmDelete?.name}" (${confirmDelete?.email})? Esta ação não pode ser desfeita.`}
        confirmLabel="Deletar"
        confirmVariant="danger"
        onConfirm={() => confirmDelete && deleteUser(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
