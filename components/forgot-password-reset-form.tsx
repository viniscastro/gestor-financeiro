'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, PiggyBank } from 'lucide-react'

export default function ForgotPasswordResetForm({ initialEmail }: { initialEmail: string }) {
  const email = initialEmail
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sessionStorage.getItem('reset-code')) {
      router.replace(`/forgot-password/verify${email ? `?email=${encodeURIComponent(email)}` : ''}`)
    }
  }, [email, router])

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    const code = sessionStorage.getItem('reset-code')
    if (!code) {
      setError('Código não encontrado. Volte e solicite um novo.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 400) {
          sessionStorage.removeItem('reset-code')
          setError(`${data.error} Volte para solicitar um novo código.`)
          return
        }
        setError(data.error ?? 'Não foi possível redefinir a senha')
        return
      }
      sessionStorage.removeItem('reset-code')
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900">
          <PiggyBank className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {done ? 'Senha redefinida!' : 'Redefinir senha'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
          {done
            ? 'Você será redirecionado para o login em instantes.'
            : `Defina uma nova senha para ${email}`}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-zinc-900 dark:shadow-2xl">
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
              <KeyRound className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Tudo pronto!
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
              Agora é só entrar com a nova senha.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Fazer login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nova senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={`${inputClass} pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label={showNew ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Confirmar nova senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`${inputClass} pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Redefinir senha
            </button>
          </form>
        )}
      </div>

      {!done && (
        <Link
          href="/forgot-password"
          className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      )}
    </div>
  )
}
