'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, Download, LoaderCircle, Plus, Search } from 'lucide-react'
import TransactionForm from '@/components/transaction-form'
import TransactionList from '@/components/transaction-list'
import TransferForm from '@/components/transfer-form'
import { downloadCsv, formatCentsPtBR, formatBRL, formatDate, toCsv } from '@/lib/format'
import type { AccountDto, CategoryDto, TransactionDto } from '@/lib/types'

type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionDto[]>([])
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [monthFilter, setMonthFilter] = useState('ALL')
  const [accountFilter, setAccountFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionDto | null>(null)
  const router = useRouter()

  async function reload() {
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        fetch('/api/transactions', { cache: 'no-store' }),
        fetch('/api/accounts', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ])
      if (!txRes.ok || !accRes.ok || !catRes.ok) throw new Error('Erro ao carregar')
      setTransactions((await txRes.json()) as TransactionDto[])
      setAccounts((await accRes.json()) as AccountDto[])
      setCategories((await catRes.json()) as CategoryDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar os dados.')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      try {
        const [txRes, accRes, catRes] = await Promise.all([
          fetch('/api/transactions', { cache: 'no-store' }),
          fetch('/api/accounts', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ])
        if (!txRes.ok || !accRes.ok || !catRes.ok) throw new Error('Erro ao carregar')
        const data = (await txRes.json()) as TransactionDto[]
        if (!cancelled) {
          setTransactions(data)
          setAccounts((await accRes.json()) as AccountDto[])
          setCategories((await catRes.json()) as CategoryDto[])
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar os dados.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
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
        if (accountFilter !== 'ALL' && t.accountId !== accountFilter) return false
        if (categoryFilter !== 'ALL' && t.categoryId !== categoryFilter) return false
        if (search) {
          const q = search.toLowerCase()
          const haystack = [
            t.description,
            t.categoryName ?? '',
            t.accountName,
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      }),
    [transactions, typeFilter, monthFilter, accountFilter, categoryFilter, search]
  )

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of filtered) {
      if (t.transferGroupId) continue
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
    reload()
    router.refresh()
  }

  function exportCsv() {
    const rows = filtered.map((t) => [
      formatDate(new Date(t.date)),
      t.transferGroupId
        ? 'Transferência'
        : t.transactionType === 'INCOME'
          ? 'Entrada'
          : 'Saída',
      t.description,
      formatCentsPtBR(t.amount),
      t.accountName,
      t.categoryName ?? '',
    ])
    downloadCsv(
      `transacoes_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(['Data', 'Tipo', 'Descrição', 'Valor', 'Conta', 'Categoria'], rows)
    )
  }

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    reload()
    router.refresh()
  }

  const selectClass =
    'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Transações</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Entradas e saídas em um só lugar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-600 transition hover:bg-sky-500/20 dark:border-sky-700 dark:text-sky-400"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transferir
          </button>
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
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Entradas</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatBRL(totals.income)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Saídas</p>
          <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
            {formatBRL(totals.expense)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Resultado</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totals.balance >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
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
            placeholder="Buscar por descrição, categoria ou conta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-500"
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
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className={selectClass}
        >
          <option value="ALL">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={selectClass}
        >
          <option value="ALL">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-800 dark:bg-zinc-900/60">
          <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
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
        accounts={accounts}
        categories={categories}
      />

      <TransferForm
        open={transferOpen}
        accounts={accounts}
        onClose={() => setTransferOpen(false)}
        onDone={() => {
          setTransferOpen(false)
          handleSaved()
        }}
      />
    </div>
  )
}
