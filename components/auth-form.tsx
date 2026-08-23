'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, LoaderCircle, PiggyBank } from 'lucide-react'

type Mode = 'login' | 'register'

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error ?? 'Não foi possível criar a conta')
          return
        }
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }

      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error === 'email_not_verified') {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }

      if (result?.error) {
        setError('E-mail ou senha inválidos')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500">
          <PiggyBank className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Gestor Financeiro
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
          Controle suas entradas e saídas em um só lugar
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-zinc-900 dark:shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nome <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              E-mail <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Senha <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setError('')
                }}
                className="flex w-full items-center justify-center rounded-lg border border-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500 hover:text-white dark:text-emerald-400 dark:hover:text-white"
              >
                Criar conta
              </button>
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </>
          )}

          {mode === 'register' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
                className="flex w-full items-center justify-center rounded-lg border border-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                Já tenho conta
              </button>
              <p className="text-center text-xs text-zinc-500">
                Ao criar a conta, enviaremos um código para confirmar seu e-mail.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
