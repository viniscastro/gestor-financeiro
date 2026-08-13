'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Plus, Search } from 'lucide-react'
import TransactionForm from '@/components/transaction-form'
import TransactionList from '@/components/transaction-list'
import { CATEGORY_LABEL } from '@/lib/categories'
import { formatBRL } from '@/lib/format'
import type { TransactionDto } from '@/lib/types'

type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [monthFilter, setMonthFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionDto | null>(null)
  const router = useRouter()

  async function reload() {
    try {
      const res = await fetch('/api/transactions', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar')
      setTransactions((await res.json()) as TransactionDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar as transações.')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchTransactions() {
      try {
        const res = await fetch('/api/transactions', { cache: 'no-store' })
        if (!res.ok) throw new Error('Erro ao carregar')
        const data = (await res.json()) as TransactionDto[]
        if (!cancelled) {
          setTransactions(data)
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar as transações.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTransactions()
    return () => {
      cancelled = true
    }
  }, [])

  const months = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of transactions) {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) {
        map.set(key, d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions])

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (typeFilter !== 'ALL' && t.transactionType !== typeFilter) return false
        if (monthFilter !== 'ALL' && !t.date.startsWith(monthFilter)) return false
        if (search) {
          const q = search.toLowerCase()
          const label = (CATEGORY_LABEL[t.category] ?? '').toLowerCase()
          if (!t.description.toLowerCase().includes(q) && !label.includes(q)) return false
        }
        return true
      }),
    [transactions, typeFilter, monthFilter, search]
  )

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.transactionType === 'INCOME') income += t.amount
      else expense += t.amount
    }
    return { income, expense, balance: income - expense }
  }, [filtered])

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta transação?')) return
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Erro ao excluir a transação.')
      return
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    router.refresh()
  }

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    reload()
    router.refresh()
  }

  const selectClass =
    'rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-emerald-500'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Transações</h1>
          <p className="text-sm text-zinc-400">Entradas e saídas em um só lugar</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Nova transação
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Entradas</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">{formatBRL(totals.income)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Saídas</p>
          <p className="mt-1 text-lg font-bold text-rose-400">{formatBRL(totals.expense)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Resultado</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatBRL(totals.balance)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-emerald-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className={selectClass}
        >
          <option value="ALL">Todas</option>
          <option value="INCOME">Entradas</option>
          <option value="EXPENSE">Saídas</option>
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={selectClass}
        >
          <option value="ALL">Todos os meses</option>
          {months.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : (
        <TransactionList
          transactions={filtered}
          onEdit={(t) => {
            setEditing(t)
            setFormOpen(true)
          }}
          onDelete={handleDelete}
        />
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSaved={handleSaved}
        transaction={editing}
      />
    </div>
  )
}
