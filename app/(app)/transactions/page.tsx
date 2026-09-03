'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Download, LoaderCircle, Plus, Search, FileText, Trash2, Upload } from 'lucide-react'
import TransactionForm from '@/components/transaction-form'
import TransactionList from '@/components/transaction-list'
import ConfirmDialog from '@/components/confirm-dialog'
import ImportModal from '@/components/import-modal'
import { formatBRL, formatDate, parseLocalDate } from '@/lib/format'
import { exportTransactionsToExcel } from '@/lib/excel'
import { exportMonthlyReportPdf } from '@/lib/pdf'
import { flattenCategories } from '@/lib/category'
import type { AccountDto, CategoryDto, CreditCardDto, TransactionDto } from '@/lib/types'
import DatePicker from '@/components/date-picker'
import Select, { type SelectOption } from '@/components/select'

type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionDto[]>([])
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [cards, setCards] = useState<CreditCardDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [monthFilter, setMonthFilter] = useState(currentMonthKey)
  const [accountFilter, setAccountFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<TransactionDto | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    document.title = 'Transações | Gestor Financeiro'
  }, [])

  async function reload() {
    try {
      const [txRes, accRes, catRes, cardRes] = await Promise.all([
        fetch('/api/transactions', { cache: 'no-store' }),
        fetch('/api/accounts', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/cards', { cache: 'no-store' }),
      ])
      if (!txRes.ok || !accRes.ok || !catRes.ok) throw new Error('Erro ao carregar')
      setTransactions((await txRes.json()) as TransactionDto[])
      setAccounts((await accRes.json()) as AccountDto[])
      setCategories((await catRes.json()) as CategoryDto[])
      if (cardRes.ok) setCards((await cardRes.json()) as CreditCardDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar os dados.')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      try {
        const [txRes, accRes, catRes, cardRes] = await Promise.all([
          fetch('/api/transactions', { cache: 'no-store' }),
          fetch('/api/accounts', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/cards', { cache: 'no-store' }),
        ])
        if (!txRes.ok || !accRes.ok || !catRes.ok) throw new Error('Erro ao carregar')
        const data = (await txRes.json()) as TransactionDto[]
        if (!cancelled) {
          setTransactions(data)
          setAccounts((await accRes.json()) as AccountDto[])
          setCategories((await catRes.json()) as CategoryDto[])
          if (cardRes.ok) setCards((await cardRes.json()) as CreditCardDto[])
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
      const d = parseLocalDate(t.date)
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

  const selectedCount = filtered.filter((t) => selectedIds.has(t.id)).length
  const allSelected = filtered.length > 0 && selectedCount === filtered.length

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const t of filtered) next.delete(t.id)
      } else {
        for (const t of filtered) next.add(t.id)
      }
      return next
    })
  }

  async function confirmBulkDelete() {
    const ids = filtered.filter((t) => selectedIds.has(t.id)).map((t) => t.id)
    if (ids.length === 0) return
    const results = await Promise.all(ids.map((id) => fetch(`/api/transactions/${id}`, { method: 'DELETE' })))
    setBulkOpen(false)
    setSelectedIds(new Set())
    const ok = results.every((r) => r.ok)
    if (!ok) {
      toast.error('Algumas transações não puderam ser excluídas.')
    } else {
      toast.success(`${ids.length} transações excluídas`)
    }
    reload()
    router.refresh()
  }

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
      date: formatDate(parseLocalDate(t.date)),
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
      date: formatDate(parseLocalDate(t.date)),
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

    const monthLabel = monthFilter !== 'ALL'
      ? months.find(([k]) => k === monthFilter)?.[1] ?? monthFilter
      : 'Todos os meses'

    exportMonthlyReportPdf(monthLabel, totals, rows)
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
    ...flattenCategories(categories),
  ]

  const monthOptions = useMemo(() => {
    const prev = Array.from(months)
    const now = new Date()
    const currentLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const currentEntry = [currentMonthKey(), currentLabel] as [string, string]
    const entries = prev.some(([k]) => k === currentEntry[0]) ? prev : [currentEntry, ...prev]
    return [
      { value: 'ALL', label: 'Todos os meses' },
      ...entries.map(([key, label]) => ({ value: key, label })),
    ]
  }, [months])

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

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
            />
            Selecionar todas ({filtered.length})
          </label>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Excluir selecionadas ({selectedCount})
            </button>
          )}
        </div>
      )}

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
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
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
        creditCards={cards}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir transação"
        message="Tem certeza que deseja excluir esta transação? Essa ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />

      <ConfirmDialog
        open={bulkOpen}
        title="Excluir transações"
        message={`Tem certeza que deseja excluir ${selectedCount} transação(ões) selecionada(s)? Essa ação não pode ser desfeita.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => { setBulkOpen(false); setSelectedIds(new Set()) }}
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
