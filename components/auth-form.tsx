'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, LoaderCircle, PiggyBank } from '@/components/icons'

type Mode = 'login' | 'register'

type Props = {
  initialMode?: Mode
}

export default function AuthForm({ initialMode }: Props = {}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        if (password !== confirmPassword) {
          setError('As senhas não coincidem')
          return
        }
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

      const code = result?.code ?? result?.error

      if (code === 'email_not_verified') {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }

      if (code === 'db_unavailable') {
        setError('Não foi possível conectar ao servidor. Tente novamente em instantes.')
        return
      }

      if (code === 'rate_limited') {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
        return
      }

      if (result?.error) {
        setError('E-mail ou senha inválidos')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente em instantes.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
          <PiggyBank className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Gestor Financeiro
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Controle suas entradas e saídas em um só lugar
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900 dark:shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirmar senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                  setConfirmPassword('')
                }}
                className="flex w-full items-center justify-center rounded-lg border border-brand-500 px-4 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-500 hover:text-white dark:text-brand-400 dark:hover:text-white"
              >
                Criar conta
              </button>
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
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
                  setConfirmPassword('')
                }}
                className="flex w-full items-center justify-center rounded-lg border border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                Já tenho conta
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Ao criar a conta, enviaremos um código para confirmar seu e-mail.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
