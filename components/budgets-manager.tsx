'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import CategoryIcon from '@/components/category-icon'
import { toast } from 'sonner'
import { formatBRL } from '@/lib/format'
import type { BudgetDto, CategoryDto } from '@/lib/types'

export default function BudgetsManager() {
  const [budgets, setBudgets] = useState<BudgetDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetDto | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function reload() {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch('/api/budgets', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ])
      if (!bRes.ok || !cRes.ok) throw new Error('Erro ao carregar')
      setBudgets((await bRes.json()) as BudgetDto[])
      setCategories((await cRes.json()) as CategoryDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar os orçamentos.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch('/api/budgets', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ])
        if (!bRes.ok || !cRes.ok) throw new Error('Erro ao carregar')
        const data = (await bRes.json()) as BudgetDto[]
        if (!cancelled) {
          setBudgets(data)
          setCategories((await cRes.json()) as CategoryDto[])
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar os orçamentos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
  const budgetedIds = new Set(budgets.map((b) => b.categoryId))
  const available = expenseCategories.filter((c) => !budgetedIds.has(c.id))

  function openCreate() {
    setEditing(null)
    setCategoryId(available[0]?.id ?? '')
    setAmount('')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(budget: BudgetDto) {
    setEditing(budget)
    setCategoryId(budget.categoryId)
    setAmount((budget.amountCents / 100).toFixed(2))
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = { categoryId, amount: Number(amount) }
      const res = await fetch(
        editing ? `/api/budgets/${editing.id}` : '/api/budgets',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Erro ao salvar o orçamento')
        return
      }
      setModalOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function undoCreate(budget: BudgetDto) {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: budget.categoryId, amountCents: budget.amountCents / 100 }),
    })
    if (res.ok) await reload()
  }

  async function handleDelete(id: string) {
    const budget = budgets.find((b) => b.id === id)
    const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir o orçamento.')
      return
    }
    toast.success('Orçamento excluído', {
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(budget!),
      },
    })
    await reload()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Orçamentos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Defina limites mensais por categoria
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={available.length === 0}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Novo orçamento
        </button>
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
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <Target className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum orçamento definido. Crie um para começar a acompanhar seus gastos.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const pct =
              budget.amountCents > 0
                ? Math.min(100, (budget.spent / budget.amountCents) * 100)
                : 0
            const over = budget.spent > budget.amountCents
            return (
              <li
                key={budget.id}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${budget.categoryColor}22` }}
                    >
                      <CategoryIcon
                        icon={
                          categories.find((c) => c.id === budget.categoryId)?.icon
                        }
                        className="h-4 w-4"
                      />
                    </div>
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                      {budget.categoryName}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(budget)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(budget.id)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Gastos no mês: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatBRL(budget.spent)}</span>
                  </span>
                  <span>
                    Limite: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatBRL(budget.amountCents)}</span>
                  </span>
                </div>

                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      over ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {over && (
                  <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    Excedeu o orçamento em {formatBRL(budget.spent - budget.amountCents)}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
              {editing ? 'Editar orçamento' : 'Novo orçamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Categoria
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  disabled={Boolean(editing)}
                  className={inputClass}
                >
                  {editing ? (
                    <option value={editing.categoryId}>{editing.categoryName}</option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Selecione...
                      </option>
                      {available.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Limite mensal (R$)
                </label>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[R$\s]/g, '').replace(/\./g, '')
                      value = (Number(value) / 100).toFixed(2).replace('.', ',')
                      setAmount(value)
                    }}
                  required
                  className={inputClass}
                />
              </div>
              {formError && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editing ? 'Salvar alterações' : 'Criar orçamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
