'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ArrowLeftRight,
  ChartPie,
  Flag,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
  Target,
  Wallet,
  X,
} from 'lucide-react'
import Avatar from '@/components/avatar'
import HeaderActions from '@/components/header-actions'

type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Contas', icon: Wallet },
  { href: '/categories', label: 'Categorias', icon: Tags },
  { href: '/budgets', label: 'Orçamentos', icon: Target },
  { href: '/goals', label: 'Metas', icon: Flag },
  { href: '/recurring', label: 'Recorrentes', icon: Repeat },
  { href: '/stats', label: 'Estatísticas', icon: ChartPie },
  { href: '/account', label: 'Conta', icon: Settings },
]

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectTo: '/' })
  }

  const nav = (
    <>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
          <PiggyBank className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-lg font-bold text-zinc-900 dark:text-white">
          Gestor Financeiro
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

<div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Link href="/account" className="mb-3 flex items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/70">
          <Avatar name={user.name} image={user.image} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-200">
              {user.name ?? 'Usuário'}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-red-500/10 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 disabled:opacity-60"
        >
          {signingOut ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <HeaderActions />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
