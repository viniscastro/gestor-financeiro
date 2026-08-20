'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Flag,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBRL } from '@/lib/format'
import type { SavingsGoalDto } from '@/lib/types'
import CurrencyInput from '@/components/currency-input'
import DatePicker from '@/components/date-picker'

export default function GoalsManager() {
  const [goals, setGoals] = useState<SavingsGoalDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoalDto | null>(null)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [topupGoalId, setTopupGoalId] = useState<string | null>(null)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  async function reload() {
    try {
      const res = await fetch('/api/goals', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar')
      setGoals((await res.json()) as SavingsGoalDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar as metas.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/goals', { cache: 'no-store' })
        if (!res.ok) throw new Error('Erro ao carregar')
        const data = (await res.json()) as SavingsGoalDto[]
        if (!cancelled) {
          setGoals(data)
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar as metas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setTargetAmount('')
    setCurrentAmount('')
    setTargetDate('')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(goal: SavingsGoalDto) {
    setEditing(goal)
    setName(goal.name)
    setTargetAmount(String(goal.targetAmount / 100))
    setCurrentAmount(String(goal.currentAmount / 100))
    setTargetDate(goal.targetDate ?? '')
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate: targetDate || null,
      }
      const res = await fetch(
        editing ? `/api/goals/${editing.id}` : '/api/goals',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Erro ao salvar a meta')
        return
      }
      setModalOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function undoCreate(goal: SavingsGoalDto) {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: goal.name,
        targetAmount: goal.targetAmount / 100,
        currentAmount: goal.currentAmount / 100,
        targetDate: goal.targetDate,
      }),
    })
    if (res.ok) await reload()
  }

  async function handleDelete(goal: SavingsGoalDto) {
    const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao excluir a meta.')
      return
    }
    await reload()
    toast.success('Meta excluída', {
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(goal),
      },
    })
  }

  async function handleTopup(goal: SavingsGoalDto) {
    const add = Number(topupAmount)
    if (!add || add <= 0) return
    setTopupLoading(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goal.name,
          targetAmount: goal.targetAmount / 100,
          currentAmount: goal.currentAmount / 100 + add,
          targetDate: goal.targetDate,
        }),
      })
      if (!res.ok) {
        toast.error('Erro ao adicionar saldo.')
        return
      }
      setTopupGoalId(null)
      setTopupAmount('')
      await reload()
      toast.success(`R$ ${add.toFixed(2)} adicionado à meta "${goal.name}"`)
    } finally {
      setTopupLoading(false)
    }
  }

  function formatDate(value: string): string {
    const [y, m, d] = value.split('-')
    if (!y || !m || !d) return value
    return `${d}/${m}/${y}`
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Metas de economia</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Defina objetivos e acompanhe o progresso
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Guardado</p>
        <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatBRL(totalSaved)}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-700 dark:bg-zinc-800">
          <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Flag className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
            Nenhuma meta criada ainda. Ex.: viagem, reserva de emergência, entrada do
            carro...
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const done = goal.percent >= 100
            return (
              <div
                key={goal.id}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        done
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      <Flag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {goal.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {goal.percent}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      done
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-sky-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(goal.percent, 100)}%` }}
                  />
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatBRL(goal.currentAmount)}
                    <span className="font-normal text-zinc-500"> de {formatBRL(goal.targetAmount)}</span>
                  </p>
                  {goal.targetDate && (
                    <p className="flex items-center gap-1 text-xs text-zinc-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(goal.targetDate)}
                    </p>
                  )}
                </div>

                {!done && (
                  <>
                    {topupGoalId === goal.id ? (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleTopup(goal) }
                              if (e.key === 'Escape') setTopupGoalId(null)
                            }}
                            autoFocus
                            className="w-full rounded-lg border border-emerald-500 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTopup(goal)}
                          disabled={topupLoading || !topupAmount}
                          className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {topupLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopupGoalId(null)}
                          className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setTopupGoalId(goal.id); setTopupAmount('') }}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                      >
                        <Wallet className="h-4 w-4" />
                        Adicionar saldo
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {editing ? 'Editar meta' : 'Nova meta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Ex: Viagem, Reserva de emergência..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="target" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Valor da meta (R$)
                  </label>
                  <CurrencyInput
                    id="target"
                    value={targetAmount}
                    onChange={setTargetAmount}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="targetDate" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Data alvo
                  </label>
                  <DatePicker
                    value={targetDate}
                    onChange={setTargetDate}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="current" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Valor guardado (R$)
                </label>
                <CurrencyInput
                  id="current"
                  value={currentAmount}
                  onChange={setCurrentAmount}
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
                {editing ? 'Salvar alterações' : 'Criar meta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
