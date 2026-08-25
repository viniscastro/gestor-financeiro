'use client'

import { useState } from 'react'
import { Send, Sparkles, Bug, Info, CheckCircle } from 'lucide-react'

type NotifyType = 'FEATURE' | 'BUG' | 'SYSTEM'

const TYPE_OPTIONS: { value: NotifyType; label: string; icon: typeof Sparkles; activeClass: string; idleClass: string; iconActiveClass: string }[] = [
  { value: 'FEATURE', label: 'Nova funcionalidade', icon: Sparkles, activeClass: 'badge-feature-active', idleClass: 'badge-feature-idle', iconActiveClass: 'badge-feature-icon' },
  { value: 'BUG', label: 'Bug corrigido', icon: Bug, activeClass: 'badge-bug-active', idleClass: 'badge-bug-idle', iconActiveClass: 'badge-bug-icon' },
  { value: 'SYSTEM', label: 'Sistema', icon: Info, activeClass: 'badge-system-active', idleClass: 'badge-system-idle', iconActiveClass: 'badge-system-icon' },
]

export default function AdminNotify() {
  const [type, setType] = useState<NotifyType>('FEATURE')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSent(false)

    if (!title.trim() || !message.trim()) {
      setError('Título e mensagem são obrigatórios.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), type }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao enviar notificação.')
        return
      }
      setSent(true)
      setTitle('')
      setMessage('')
      setType('FEATURE')
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSending(false)
    }
  }

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type)!

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-800">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tipo
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${active ? opt.activeClass : opt.idleClass}`}
                >
                  <Icon aria-hidden="true" className={`h-4 w-4 ${active ? opt.iconActiveClass : 'text-zinc-400 dark:text-zinc-500'}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor="notify-title" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Título
          </label>
          <input
            id="notify-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Novo relatório de estatísticas disponível"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="notify-message" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Mensagem
          </label>
          <textarea
            id="notify-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Descreva o que foi adicionado ou corrigido..."
            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">
            {error}
          </p>
        )}

        {sent && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">
            <CheckCircle aria-hidden="true" className="h-4 w-4" />
            Notificação enviada com sucesso para todos os usuários!
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !title.trim() || !message.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </button>
        </div>
      </form>
    </div>
  )
}
