'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, CircleAlert, Download, Info, Sparkles, Trash2 } from 'lucide-react'
import { formatBRL } from '@/lib/format'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  FEATURE: { icon: Sparkles, color: 'text-emerald-500', label: 'Nova funcionalidade' },
  BUG: { icon: CircleAlert, color: 'text-red-500', label: 'Bug corrigido' },
  INCOME: { icon: Download, color: 'text-emerald-500', label: 'Entrada' },
  EXPENSE: { icon: CircleAlert, color: 'text-red-500', label: 'Saída' },
  BILL: { icon: Info, color: 'text-amber-500', label: 'Conta a vencer' },
  SYSTEM: { icon: Info, color: 'text-blue-500', label: 'Sistema' },
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
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800 sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notificações
            </h3>
            <div className="flex gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-500 dark:hover:bg-zinc-700"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-700"
                  title="Limpar todas"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Bell className="mb-2 h-8 w-8" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM
                const Icon = config.icon
                return (
                  <div
                    key={n.id}
                    className={`group relative flex gap-3 border-b border-zinc-50 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:bg-zinc-700/50 ${
                      !n.read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                    }`}
                  >
                    {!n.read && (
                      <div className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead([n.id])}
                          className="rounded p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-emerald-500 dark:hover:bg-zinc-600"
                          title="Marcar como lida"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotification(n.id)}
                        className="rounded p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
