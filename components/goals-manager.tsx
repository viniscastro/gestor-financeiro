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
import type { AccountDto, SavingsGoalDto } from '@/lib/types'
import CurrencyInput from '@/components/currency-input'
import ConfirmDialog from '@/components/confirm-dialog'
import DatePicker from '@/components/date-picker'
import Select from '@/components/select'
import Modal from '@/components/modal'
import CategoryIcon from '@/components/category-icon'
import { CATEGORY_ICONS } from '@/lib/categories'

const GOAL_ICONS = CATEGORY_ICONS

export default function GoalsManager() {
  const [goals, setGoals] = useState<SavingsGoalDto[]>([])
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoalDto | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0])
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [topupOpen, setTopupOpen] = useState(false)
  const [topupGoalId, setTopupGoalId] = useState('')
  const [topupAmount, setTopupAmount] = useState('')
  const [topupAccountId, setTopupAccountId] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<SavingsGoalDto | null>(null)

  async function reload() {
    try {
      const [gRes, aRes] = await Promise.all([
        fetch('/api/goals', { cache: 'no-store' }),
        fetch('/api/accounts', { cache: 'no-store' }),
      ])
      if (!gRes.ok || !aRes.ok) throw new Error('Erro ao carregar')
      setGoals((await gRes.json()) as SavingsGoalDto[])
      setAccounts((await aRes.json()) as AccountDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar as metas.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [gRes, aRes] = await Promise.all([
          fetch('/api/goals', { cache: 'no-store' }),
          fetch('/api/accounts', { cache: 'no-store' }),
        ])
        if (!gRes.ok || !aRes.ok) throw new Error('Erro ao carregar')
        const gData = (await gRes.json()) as SavingsGoalDto[]
        const aData = (await aRes.json()) as AccountDto[]
        if (!cancelled) {
          setGoals(gData)
          setAccounts(aData)
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar as metas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setIcon(CATEGORY_ICONS[0])
    setTargetAmount('')
    setCurrentAmount('')
    setAccountId('')
    setTargetDate('')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(goal: SavingsGoalDto) {
    setEditing(goal)
    setName(goal.name)
    setIcon(goal.icon ?? CATEGORY_ICONS[0])
    setTargetAmount(String(goal.targetAmount / 100))
    setCurrentAmount(String(goal.currentAmount / 100))
    setAccountId('')
    setTargetDate(goal.targetDate ?? '')
    setFormError('')
    setModalOpen(true)
  }

  function openTopup(goalId?: string) {
    setTopupGoalId(goalId ?? (goals.find((g) => g.percent < 100)?.id ?? ''))
    setTopupAmount('')
    setTopupAccountId(accounts[0]?.id ?? '')
    setTopupLoading(false)
    setTopupOpen(true)
  }

  async function handleTopup() {
    const goal = goals.find((g) => g.id === topupGoalId)
    if (!goal) return
    const add = Number(topupAmount)
    if (!add || add <= 0 || !topupAccountId) return
    setTopupLoading(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, amount: add, accountId: topupAccountId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Erro ao adicionar saldo.')
        return
      }
      setTopupOpen(false)
      await reload()
      toast.success(`R$ ${add.toFixed(2)} adicionado à meta "${goal.name}"`)
    } finally {
      setTopupLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name,
        icon,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        accountId: accountId || null,
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
    setConfirmTarget(goal)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const res = await fetch(`/api/goals/${confirmTarget.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      toast.error('Erro ao excluir a meta.')
      return
    }
    await reload()
    toast.success('Meta excluída', {
      duration: 10000,
      action: { label: 'Desfazer', onClick: () => undoCreate(confirmTarget!) },
    })
  }

  function formatDate(value: string): string {
    const [y, m, d] = value.split('-')
    if (!y || !m || !d) return value
    return `${d}/${m}/${y}`
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0)

  const goalOptions = goals
    .filter((g) => g.percent < 100)
    .map((g) => ({ value: g.id, label: g.name }))

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Metas de economia</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Defina objetivos e acompanhe o progresso
          </p>
        </div>
        <div className="flex items-center gap-2">
          {goals.some((g) => g.percent < 100) && (
            <button
              type="button"
              onClick={() => openTopup()}
              className="flex items-center gap-2 rounded-lg border border-emerald-500 bg-transparent px-4 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
            >
              <Wallet aria-hidden="true" className="h-4 w-4" />
              Adicionar saldo
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova meta
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Guardado</p>
        <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatBRL(totalSaved)}
        </p>
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
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Flag aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-400" />
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
                          ? 'bg-emerald-500 text-white'
                          : 'bg-sky-500 text-white'
                      }`}
                    >
                      <CategoryIcon icon={goal.icon ?? CATEGORY_ICONS[0]} className="h-5 w-5" />
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
                  <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                      aria-label="Editar"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:text-white"
                      aria-label="Excluir"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                  role="progressbar"
                  aria-valuenow={Math.min(goal.percent, 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso: ${goal.percent}%`}
                >
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
                      <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                      {formatDate(goal.targetDate)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {topupOpen && (
        <Modal
          open={topupOpen}
          onClose={() => setTopupOpen(false)}
          title="Adicionar saldo"
        >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Meta <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                </label>
                <Select
                  value={topupGoalId}
                  onChange={setTopupGoalId}
                  options={goalOptions.length > 0 ? goalOptions : [{ value: '', label: 'Nenhuma meta disponível' }]}
                  placeholder="Selecione a meta"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Valor (R$) <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                </label>
                <CurrencyInput
                  value={topupAmount}
                  onChange={setTopupAmount}
                  autoFocus
                  placeholder="0,00"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Descontar de <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                </label>
                <Select
                  value={topupAccountId}
                  onChange={setTopupAccountId}
                  options={accountOptions}
                  placeholder="Selecione a conta"
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTopupOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTopup}
                  disabled={topupLoading || !topupAmount || !topupGoalId || !topupAccountId}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {topupLoading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
        </Modal>
      )}

      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Editar meta' : 'Nova meta'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ícone
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        icon === ic
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-500'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                      aria-label={`Ícone: ${ic.replace(/-/g, ' ')}`}
                    >
                      <CategoryIcon icon={ic} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="target" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Valor da meta (R$) <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
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

              {Number(currentAmount) > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Descontar de
                  </label>
                  <Select
                    value={accountId}
                    onChange={setAccountId}
                    options={accountOptions}
                    placeholder="Selecione a conta"
                    className={inputClass}
                  />
                </div>
              )}

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
                {editing ? 'Salvar alterações' : 'Criar meta'}
              </button>
            </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir meta"
        message={`Tem certeza que deseja excluir a meta "${confirmTarget?.name ?? ''}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}
