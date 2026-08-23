import type { Metadata } from 'next'
import Link from 'next/link'
import { PiggyBank } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gestor Financeiro — Controle financeiro pessoal',
  description:
    'Gerencie suas entradas, saídas, contas, orçamentos, metas e recorrências em um só lugar. Gráficos, estatísticas e backup incluídos.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0e0e12]">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-[#0e0e12]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <PiggyBank className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Gestor Financeiro
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#09090b]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500">
              <PiggyBank className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Gestor Financeiro
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} Gestor Financeiro. Feito por Vinícius Castro.
          </p>
        </div>
      </footer>
    </div>
  )
}
