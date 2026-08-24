'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Download, LoaderCircle, Plus, Search, FileText, Upload } from 'lucide-react'
import TransactionForm from '@/components/transaction-form'
import TransactionList from '@/components/transaction-list'
import ConfirmDialog from '@/components/confirm-dialog'
import ImportModal from '@/components/import-modal'
import { formatBRL, formatDate } from '@/lib/format'
import { exportTransactionsToExcel } from '@/lib/excel'
import { exportMonthlyReportPdf } from '@/lib/pdf'
import type { AccountDto, CategoryDto, TransactionDto } from '@/lib/types'
import DatePicker from '@/components/date-picker'
import Select, { type SelectOption } from '@/components/select'

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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<TransactionDto | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    document.title = 'Transações | Gestor Financeiro'
  }, [])

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
        if (dateFrom && t.date < dateFrom) return false
        if (dateTo && t.date > dateTo + 'T23:59:59') return false
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
    [transactions, typeFilter, monthFilter, accountFilter, categoryFilter, search, dateFrom, dateTo]
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
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    setConfirmTarget(tx)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const tx = confirmTarget
    const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      toast.error('Erro ao excluir a transação.')
      return
    }
    reload()
    router.refresh()
    toast.success('Transação excluída', {
      duration: 10000,
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(tx),
      },
    })
  }

  async function undoCreate(tx: TransactionDto) {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionType: tx.transactionType,
        description: tx.description,
        amount: tx.amount / 100,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        date: tx.date,
        recurringId: tx.recurringId ?? null,
        occurrenceMonth: tx.occurrenceMonth ?? null,
      }),
    })
    if (res.ok) {
      reload()
      router.refresh()
    }
  }

  function exportExcel() {
    const rows = filtered.map((t) => ({
      date: formatDate(new Date(t.date)),
      type: t.transferGroupId
        ? 'Transferência'
        : t.transactionType === 'INCOME'
          ? 'Entrada'
          : 'Saída',
      description: t.description,
      amount: t.amount,
      accountName: t.accountName,
      categoryName: t.categoryName ?? '',
    }))
    exportTransactionsToExcel(rows)
  }

  function exportPdf() {
    const rows = filtered.map((t) => ({
      date: formatDate(new Date(t.date)),
      type: t.transferGroupId
        ? 'Transferencia'
        : t.transactionType === 'INCOME'
          ? 'Entrada'
          : 'Saida',
      description: t.description,
      amount: t.amount,
      accountName: t.accountName,
      categoryName: t.categoryName ?? '',
    }))

    const categoryMap = new Map<string, { label: string; color: string; amount: number }>()
    for (const t of filtered) {
      if (t.transferGroupId || t.transactionType !== 'EXPENSE') continue
      const key = t.categoryId ?? 'sem-categoria'
      const existing = categoryMap.get(key)
      if (existing) {
        existing.amount += t.amount
      } else {
        categoryMap.set(key, {
          label: t.categoryName ?? 'Sem categoria',
          color: t.categoryColor ?? '#71717A',
          amount: t.amount,
        })
      }
    }
    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount)

    const monthLabel = monthFilter !== 'ALL'
      ? months.find(([k]) => k === monthFilter)?.[1] ?? monthFilter
      : 'Todos os meses'

    exportMonthlyReportPdf(monthLabel, totals, rows, categoryBreakdown)
  }

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    reload()
    router.refresh()
  }

  const typeOptions: SelectOption[] = [
    { value: 'ALL', label: 'Todas' },
    { value: 'INCOME', label: 'Entradas' },
    { value: 'EXPENSE', label: 'Saídas' },
  ]

  const accountOptions = [
    { value: 'ALL', label: 'Todas as contas' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ]

  const categoryOptions = [
    { value: 'ALL', label: 'Todas as categorias' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ]

  const monthOptions = [
    { value: 'ALL', label: 'Todos os meses' },
    ...months.map(([key, label]) => ({ value: key, label })),
  ]

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
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Upload aria-hidden="true" className="h-4 w-4" />
            Importar
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          >
            <FileText aria-hidden="true" className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova transação
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Entradas</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatBRL(totals.income)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Saídas</p>
          <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
            {formatBRL(totals.expense)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
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
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            aria-label="Buscar transações"
            placeholder="Buscar por descrição, categoria ou conta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
          options={typeOptions}
          className="sm:w-auto min-w-[160px]"
        />
        <Select
          value={accountFilter}
          onChange={setAccountFilter}
          options={accountOptions}
          className="sm:w-auto min-w-[160px]"
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          className="sm:w-auto min-w-[160px]"
        />
        <Select
          value={monthFilter}
          onChange={setMonthFilter}
          options={monthOptions}
          className="sm:w-auto min-w-[160px]"
        />
        <DatePicker
          value={dateFrom}
          onChange={setDateFrom}
          className="sm:w-auto min-w-[140px]"
        />
        <DatePicker
          value={dateTo}
          onChange={setDateTo}
          className="sm:w-auto min-w-[140px]"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-700 dark:bg-zinc-800">
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
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

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir transação"
        message="Tem certeza que deseja excluir esta transação? Essa ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={() => { setImportOpen(false); reload(); router.refresh() }}
        accounts={accounts}
        categories={categories}
      />
    </div>
  )
}
