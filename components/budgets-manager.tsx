'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import CategoryIcon from '@/components/category-icon'
import ConfirmDialog from '@/components/confirm-dialog'
import CurrencyInput from '@/components/currency-input'
import Select from '@/components/select'
import Modal from '@/components/modal'
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<BudgetDto | null>(null)

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
    if (!budget) return
    setConfirmTarget(budget)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const res = await fetch(`/api/budgets/${confirmTarget.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir o orçamento.')
      return
    }
    toast.success('Orçamento excluído', {
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(confirmTarget!),
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Orçamentos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Defina limites mensais por categoria
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={available.length === 0}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Novo orçamento
        </button>
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
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Target aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
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
                className="group rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: budget.categoryColor }}
                    >
                      <CategoryIcon
                        icon={
                          categories.find((c) => c.id === budget.categoryId)?.icon
                        }
                        className="h-4 w-4 text-white"
                      />
                    </div>
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {budget.categoryName}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(budget)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      aria-label="Editar"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(budget.id)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:text-white"
                      aria-label="Excluir"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
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

                <div
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso: ${Math.round(pct)}%${over ? ' — orçamento excedido' : ''}`}
                >
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
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Editar orçamento' : 'Novo orçamento'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Categoria <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                </label>
                <Select
                  value={categoryId}
                  onChange={setCategoryId}
                  options={
                    editing
                      ? [{ value: editing.categoryId, label: editing.categoryName }]
                      : available.map((c) => ({ value: c.id, label: c.name }))
                  }
                  id="category"
                  required
                  disabled={Boolean(editing)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Limite mensal (R$) <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                </label>
                <CurrencyInput
                  id="amount"
                  placeholder="0,00"
                  value={amount}
                  onChange={setAmount}
                  required
                  className={inputClass}
                />
              </div>
              {formError && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {editing ? 'Salvar alterações' : 'Criar orçamento'}
              </button>
            </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir orçamento"
        message={`Tem certeza que deseja excluir o orçamento da categoria "${confirmTarget?.categoryName ?? ''}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}
