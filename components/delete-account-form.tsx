'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { LoaderCircle, Mail, Trash2 } from 'lucide-react'

export default function DeleteAccountForm({ email }: { email: string }) {
  const [step, setStep] = useState<'idle' | 'code'>('idle')
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleRequestCode() {
    setError('')
    setResending(true)
    try {
      const res = await fetch('/api/account/request-delete-code', {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível enviar o código')
        return
      }
      setStep('code')
    } finally {
      setResending(false)
    }
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível excluir a conta')
        return
      }
      await signOut({ redirectTo: '/' })
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900">
          <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400">
            Excluir conta
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-300">
            Remove sua conta ({email}) e todas as transações permanentemente.
          </p>
        </div>
      </div>

      {step === 'idle' ? (
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-400 bg-white accent-red-500 dark:border-zinc-600 dark:bg-zinc-800"
            />
            <span>
              Entendo que esta ação é{' '}
              <strong className="text-rose-600 dark:text-rose-400">irreversível</strong> e que
              todas as minhas transações serão apagadas.
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleRequestCode}
            disabled={!confirm || resending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Solicitar código de exclusão
          </button>
        </div>
      ) : (
        <form onSubmit={handleDelete} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Enviamos um código de 6 dígitos para <strong>{email}</strong>.
          </p>

          <div>
            <label
              htmlFor="delete-code"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Código de confirmação
            </label>
            <input
              id="delete-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              className={`${inputClass} text-center text-lg font-bold tracking-[0.5em]`}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('idle'); setCode(''); setError('') }}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Excluir minha conta
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
