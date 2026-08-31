'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, CircleAlert, Download, Info, Sparkles, Trash2 } from 'lucide-react'
import { formatBRL, formatDate } from '@/lib/format'
import ConfirmDialog from '@/components/confirm-dialog'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  FEATURE: { icon: Sparkles, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40', label: 'Nova funcionalidade' },
  BUG: { icon: CircleAlert, color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', label: 'Bug corrigido' },
  INCOME: { icon: Download, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40', label: 'Entrada' },
  EXPENSE: { icon: CircleAlert, color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', label: 'Saída' },
  BILL: { icon: Info, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', label: 'Conta a vencer' },
  BUDGET: { icon: CircleAlert, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', label: 'Alerta de orçamento' },
  MONTHLY_SUMMARY: { icon: Sparkles, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', label: 'Resumo mensal' },
  SYSTEM: { icon: Info, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', label: 'Sistema' },
}

function timeAgo(date: string) {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<Notification | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const unread = notifications.filter((n) => !n.read).length

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function markAsRead(ids: string[]) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    )
  }

  async function markAllAsRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function deleteNotification(id: string) {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function clearAll() {
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications([])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        aria-label={unread > 0 ? `${unread} notificações não lidas` : 'Notificações'}
        aria-expanded={open}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-16 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-none">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notificações
            </h2>
            <div className="flex gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-500 dark:hover:bg-zinc-700"
                  title="Marcar todas como lidas"
                  aria-label="Marcar todas como lidas"
                >
                  <CheckCheck aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-700"
                  title="Limpar todas"
                  aria-label="Limpar todas"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-96">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Bell aria-hidden="true" className="mb-2 h-8 w-8" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM
                const Icon = config.icon
                return (
                  <div
                    key={n.id}
                    className={`group relative flex gap-3 border-b border-zinc-50 px-3 py-3 transition hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:bg-zinc-700/50 sm:px-4 ${
                      !n.read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                    }`}
                  >
                    {!n.read && (
                      <div className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {n.message}
                      </p>
                      <p
                        className="mt-1 text-[10px] text-zinc-500"
                        title={formatDate(new Date(n.createdAt))}
                      >
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead([n.id])}
                          className="rounded p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-emerald-500 dark:hover:bg-zinc-600"
                          title="Marcar como lida"
                          aria-label="Marcar como lida"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(n)}
                        className="rounded p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-600"
                        title="Excluir"
                        aria-label="Excluir notificação"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir notificação"
        message={`Tem certeza que deseja excluir a notificação "${confirmDelete?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={() => confirmDelete && deleteNotification(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmClearAll}
        title="Limpar todas as notificações"
        message="Tem certeza que deseja excluir todas as notificações? Esta ação não pode ser desfeita."
        confirmLabel="Limpar todas"
        confirmVariant="danger"
        onConfirm={() => {
          clearAll()
          setConfirmClearAll(false)
        }}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  )
}
