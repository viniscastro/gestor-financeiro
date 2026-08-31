'use client'

import { useState } from 'react'
import { FileText, LoaderCircle } from 'lucide-react'

type Props = {
  enabled: boolean
}

export default function MonthlyReportToggle({ enabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function toggle() {
    setSaving(true)
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyReport: !enabled }),
      })
      if (res.ok) setEnabled((prev) => !prev)
    } finally {
      setSaving(false)
    }
  }

  async function sendNow() {
    setSending(true)
    setSent(false)
    try {
      const res = await fetch('/api/reports/monthly', { method: 'POST' })
      if (res.ok) setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Relatório mensal por e-mail
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Receba um PDF com o resumo do mês no dia 1 de cada mês
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`relative h-7 w-12 rounded-full transition ${
            enabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              enabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={sendNow}
            disabled={sending}
            className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-60"
          >
            {sending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Enviar agora
          </button>
          {sent && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              Relatório enviado! Verifique seu e-mail.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
