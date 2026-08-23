'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LoaderCircle, MailCheck, PiggyBank } from 'lucide-react'

export default function VerifyEmailForm({
  initialEmail,
  isLoggedIn = false,
}: {
  initialEmail: string
  isLoggedIn?: boolean
}) {
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível confirmar o código')
        return
      }
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResending(true)

    try {
      const res = await fetch('/api/resend-verification', {
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

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900">
          <PiggyBank className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Confirme seu e-mail
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
          Enviamos um código de 6 dígitos para validar sua conta
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-zinc-900 dark:shadow-2xl">
        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
              <MailCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              E-mail confirmado!
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
              {isLoggedIn ? 'Redirecionando...' : 'Sua conta foi verificada. Agora é só entrar.'}
            </p>
            {isLoggedIn ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Ir para o painel
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Fazer login
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                E-mail <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Código de confirmação <span className="text-rose-500">*</span>
                </label>
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
                  className={`${inputClass} text-center text-lg font-bold tracking-[0.5em]`}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Confirmar código
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendIn > 0}
                className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {resending ? 'Enviando...' : resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
