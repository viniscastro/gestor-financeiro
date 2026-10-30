'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ArrowLeftRight,
  Building2,
  Calculator,
  CreditCard,
  LayoutGrid,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PiggyBank,
  PieChart,
  Repeat,
  Send,
  Settings,
  Target,
  Wallet,
  X,
} from '@/components/icons'
import Avatar from '@/components/avatar'
import HeaderActions from '@/components/header-actions'

type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  theme?: string | null
  role?: string | null
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Contas', icon: Wallet },
  { href: '/categories', label: 'Categorias', icon: LayoutGrid },
  { href: '/account-types', label: 'Tipos', icon: Building2 },
  { href: '/budgets', label: 'Orçamentos', icon: Calculator },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/recurring', label: 'Recorrentes', icon: Repeat },
  { href: '/cards', label: 'Cartões', icon: CreditCard },
  { href: '/stats', label: 'Estatísticas', icon: PieChart },
  { href: '/account', label: 'Conta', icon: Settings },
]

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Administração', icon: Send },
]

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const isAdmin = user.role === 'ADMIN'

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectTo: '/login' })
  }

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const nav = (
    <>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <PiggyBank aria-hidden="true" className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Gestor Financeiro
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {[...NAV_ITEMS, ...(isAdmin ? ADMIN_NAV_ITEMS : [])].map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <item.icon aria-hidden="true" weight={active ? 'fill' : 'regular'} className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

<div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Link href="/account" className="mb-3 flex items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800">
          <Avatar name={user.name} image={user.image} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
              {user.name ?? 'Usuário'}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-rose-500 hover:text-white dark:text-slate-300 dark:hover:text-white disabled:opacity-60"
        >
          {signingOut ? (
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut aria-hidden="true" className="h-5 w-5" />
          )}
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <HeaderActions defaultTheme={user.theme === 'dark' ? 'dark' : 'light'} />
      </div>

      {!open && (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-background lg:flex">
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside id="mobile-nav" className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-background">
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
