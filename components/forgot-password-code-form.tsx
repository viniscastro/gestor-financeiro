'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LoaderCircle, PiggyBank, ShieldCheck } from '@/components/icons'

export default function ForgotPasswordCodeForm({ initialEmail }: { initialEmail: string }) {
  const email = initialEmail
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível validar o código')
        return
      }
      sessionStorage.setItem('reset-code', code)
      router.push(`/forgot-password/reset?email=${encodeURIComponent(email)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResending(true)

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429) {
          const match = data.error?.match(/(\d+)s/)
          if (match) setResendIn(Number(match[1]))
          else setResendIn(60)
          setError(data.error ?? 'Aguarde um pouco para reenviar')
          return
        }
        setError(data.error ?? 'Não foi possível reenviar o código')
        return
      }
      setResendIn(60)
      setCode('')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900">
          <PiggyBank className="h-7 w-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Verifique seu e-mail
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Enviamos um código de 6 dígitos para {email || 'seu e-mail'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900 dark:shadow-2xl">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Código de verificação <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className={`${inputClass} pl-10 text-center text-lg font-bold tracking-[0.5em]`}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Verificar código
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendIn > 0}
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {resending
              ? 'Enviando...'
              : resendIn > 0
                ? `Reenviar em ${resendIn}s`
                : 'Reenviar código'}
          </button>
        </div>
      </div>

      <Link
        href="/forgot-password"
        className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
    </div>
  )
}
