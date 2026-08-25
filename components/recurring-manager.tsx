'use client'

import { useEffect, useRef, useState } from 'react'
import {
  GripVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/confirm-dialog'
import CurrencyInput from '@/components/currency-input'
import Select, { type SelectOption } from '@/components/select'
import Modal from '@/components/modal'
import type { TransactionType } from '@/lib/types'
import { formatBRL, formatDateLong } from '@/lib/format'
import type { AccountDto, CategoryDto, RecurringRuleDto } from '@/lib/types'

export default function RecurringManager() {
  const [rules, setRules] = useState<RecurringRuleDto[]>([])
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringRuleDto | null>(null)
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TransactionType>('INCOME')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [notifyDaysBefore, setNotifyDaysBefore] = useState('3')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<RecurringRuleDto | null>(null)
  const dragItem = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const touchCurrentIndex = useRef<number | null>(null)

  useEffect(() => {
    function onStart(e: TouchEvent) {
      const grip = (e.target as HTMLElement).closest('[data-touch-grip]')
      if (!grip) return
      e.preventDefault()
      const li = grip.closest('li[data-drag-index]')
      if (!li) return
      const idx = Number(li.getAttribute('data-drag-index'))
      if (isNaN(idx)) return
      touchCurrentIndex.current = idx
      dragItem.current = idx
      setTouchDragging(true)
    }
    document.addEventListener('touchstart', onStart, { passive: false })
    return () => document.removeEventListener('touchstart', onStart)
  }, [])

  useEffect(() => {
    if (!touchDragging) return

    function onMove(e: TouchEvent) {
      if (touchCurrentIndex.current === null) return
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const li = el?.closest('li[data-drag-index]') as HTMLElement | null
      if (li) {
        const idx = Number(li.getAttribute('data-drag-index'))
        if (!isNaN(idx)) setDragOverIndex(idx)
      }
    }

    function onEnd() {
      if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
        const updated = [...rules]
        const [moved] = updated.splice(dragItem.current, 1)
        updated.splice(dragOverIndex, 0, moved)
        setRules(updated)
        const ids = updated.map((r) => r.id)
        fetch('/api/recurring', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
      }
      setDragOverIndex(null)
      dragItem.current = null
      touchCurrentIndex.current = null
      setTouchDragging(false)
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [touchDragging, dragOverIndex, rules])

  async function reload() {
    try {
      const [rRes, aRes, cRes] = await Promise.all([
        fetch('/api/recurring', { cache: 'no-store' }),
        fetch('/api/accounts', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ])
      if (!rRes.ok || !aRes.ok || !cRes.ok) throw new Error('Erro ao carregar')
      setRules((await rRes.json()) as RecurringRuleDto[])
      setAccounts((await aRes.json()) as AccountDto[])
      setCategories((await cRes.json()) as CategoryDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar as contas recorrentes.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [rRes, aRes, cRes] = await Promise.all([
          fetch('/api/recurring', { cache: 'no-store' }),
          fetch('/api/accounts', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ])
        if (!rRes.ok || !aRes.ok || !cRes.ok) throw new Error('Erro ao carregar')
        const data = (await rRes.json()) as RecurringRuleDto[]
        if (!cancelled) {
          setRules(data)
          setAccounts((await aRes.json()) as AccountDto[])
          setCategories((await cRes.json()) as CategoryDto[])
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar as contas recorrentes.')
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
    setDescription('')
    setType('INCOME')
    setAmount('')
    setAccountId(accounts[0]?.id ?? '')
    setCategoryId('')
    setDayOfMonth('1')
    setNotifyDaysBefore('3')
    setActive(true)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(rule: RecurringRuleDto) {
    setEditing(rule)
    setDescription(rule.description)
    setType(rule.type ?? 'INCOME')
    setAmount((rule.amountCents / 100).toFixed(2))
    setAccountId(rule.accountId)
    setCategoryId(rule.categoryId ?? '')
    setDayOfMonth(String(rule.dayOfMonth))
    setNotifyDaysBefore(String(rule.notifyDaysBefore))
    setActive(rule.active)
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        kind: 'TRANSACTION',
        description,
        type,
        amount: Number(amount),
        accountId,
        categoryId: categoryId || null,
        dayOfMonth: Number(dayOfMonth),
        notifyDaysBefore: Number(notifyDaysBefore),
      }
      const res = await fetch(
        editing ? `/api/recurring/${editing.id}` : '/api/recurring',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Erro ao salvar a recorrência')
        return
      }
      setModalOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function undoCreate(rule: RecurringRuleDto) {
    const payload = {
      kind: 'TRANSACTION',
      description: rule.description,
      type: rule.type,
      amount: rule.amountCents / 100,
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      dayOfMonth: rule.dayOfMonth,
      notifyDaysBefore: rule.notifyDaysBefore,
    }
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) await reload()
  }

  async function handleDelete(id: string) {
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    setConfirmTarget(rule)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const res = await fetch(`/api/recurring/${confirmTarget.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      toast.error('Erro ao excluir a recorrência.')
      return
    }
    await reload()
    toast.success('Recorrência excluída', {
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(confirmTarget!),
      },
    })
  }

  async function toggleActive(rule: RecurringRuleDto) {
    const payload = {
      kind: 'TRANSACTION',
      description: rule.description,
      type: rule.type,
      amount: rule.amountCents / 100,
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      dayOfMonth: rule.dayOfMonth,
      notifyDaysBefore: rule.notifyDaysBefore,
      active: !rule.active,
    }
    const res = await fetch(`/api/recurring/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      setError('Erro ao atualizar a recorrência.')
      return
    }
    await reload()
  }

  const availableCategories = categories.filter((c) => c.type === type)

  function switchType(next: TransactionType) {
    setType(next)
    const available = categories.filter((c) => c.type === next)
    if (!available.some((c) => c.id === categoryId)) setCategoryId('')
  }

  function handleDragStart(index: number) {
    dragItem.current = index
  }

  function handleDragEnter(index: number) {
    setDragOverIndex(index)
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverIndex === null) {
      setDragOverIndex(null)
      dragItem.current = null
      return
    }
    if (dragItem.current === dragOverIndex) {
      setDragOverIndex(null)
      dragItem.current = null
      return
    }

    const updated = [...rules]
    const [moved] = updated.splice(dragItem.current, 1)
    updated.splice(dragOverIndex, 0, moved)
    setRules(updated)

    const ids = updated.map((r) => r.id)
    fetch('/api/recurring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })

    setDragOverIndex(null)
    dragItem.current = null
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Contas recorrentes
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Transações automáticas todo mês + lembretes por e-mail
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova recorrência
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
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Repeat aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
            Nenhuma recorrência criada. Adicione contas como aluguel, assinaturas,
            salário ou aportes mensais.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rules.map((rule, index) => {
              const isIncome = rule.type === 'INCOME'
              return (
                <li
                  key={rule.id}
                  data-drag-index={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  className={`group px-4 py-3 transition ${
                    rule.active ? '' : 'opacity-60'
                  } ${dragOverIndex === index ? 'border-t-2 border-t-emerald-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      data-touch-grip
                      className="flex h-10 w-10 touch-none cursor-grab items-center justify-center text-zinc-300 transition hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                    >
                      <GripVertical aria-hidden="true" className="h-5 w-5" />
                    </div>

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isIncome
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <TrendingDown aria-hidden="true" className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {rule.description}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 text-sm font-semibold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '–'} {formatBRL(rule.amountCents)}
                    </p>

                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.active}
                        onClick={() => toggleActive(rule)}
                        className={`relative h-7 w-12 rounded-full transition ${
                          rule.active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                        aria-label={`${rule.active ? 'Desativar' : 'Ativar'} recorrência`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                            rule.active ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(rule)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule.id)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:bg-red-500 dark:hover:text-white"
                        aria-label="Excluir"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="ml-8 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                    <span>Dia {rule.dayOfMonth}</span>
                    <span>·</span>
                    <span>{rule.accountName}</span>
                    {rule.categoryName && (
                      <>
                        <span>·</span>
                        <span>{rule.categoryName}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>Próximo: {formatDateLong(new Date(rule.nextDate + 'T12:00:00'))}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Editar recorrência' : 'Nova recorrência'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                  type="button"
                  role="tab"
                  aria-selected={type === 'INCOME'}
                  onClick={() => switchType('INCOME')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    type === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingUp aria-hidden="true" className="h-4 w-4" />
                  Entrada
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={type === 'EXPENSE'}
                  onClick={() => switchType('EXPENSE')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    type === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingDown aria-hidden="true" className="h-4 w-4" />
                  Saída
                </button>
              </div>

              <div>
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Descrição <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                </label>
                <input
                  id="description"
                  type="text"
                  placeholder="Ex: Aluguel, Netflix..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Categoria
                  </label>
                  <Select
                    id="category"
                    value={categoryId}
                    onChange={setCategoryId}
                    className={inputClass}
                    options={[
                      { value: '', label: 'Sem categoria' },
                      ...availableCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="account" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Conta <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                  </label>
                  <Select
                    id="account"
                    value={accountId}
                    onChange={setAccountId}
                    required
                    placeholder="Selecione..."
                    className={inputClass}
                    options={[
                      { value: '', label: 'Selecione...', disabled: true },
                      ...accounts.map((a) => ({ value: a.id, label: a.name })),
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Valor (R$) <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
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
                <div>
                  <label htmlFor="day" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Dia do mês <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
                  </label>
                  <input
                    id="day"
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notify" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Lembrar por e-mail (dias antes)
                </label>
                <input
                  id="notify"
                  type="number"
                  min="0"
                  max="30"
                  value={notifyDaysBefore}
                  onChange={(e) => setNotifyDaysBefore(e.target.value)}
                  className={inputClass}
                />
              </div>

              {editing && (
                <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  Ativa
                </label>
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
                {editing ? 'Salvar alterações' : 'Criar recorrência'}
              </button>
            </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir recorrência"
        message={`Tem certeza que deseja excluir a recorrência "${confirmTarget?.description ?? ''}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}
