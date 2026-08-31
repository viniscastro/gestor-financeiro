'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, GripVertical, LoaderCircle, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL, CATEGORY_COLORS } from '@/lib/categories'
import ConfirmDialog from '@/components/confirm-dialog'
import TransferForm from '@/components/transfer-form'
import ColorPicker from '@/components/color-picker'
import Modal from '@/components/modal'
import { formatBRL } from '@/lib/format'
import type { AccountDto } from '@/lib/types'
import { toast } from 'sonner'
import CurrencyInput from '@/components/currency-input'
import Select from '@/components/select'

export default function AccountsManager() {
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AccountDto | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0])
  const [initialBalance, setInitialBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<AccountDto | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const dragItem = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const touchCurrentIndex = useRef<number | null>(null)

  useEffect(() => {
    function onStart(e: TouchEvent) {
      const grip = (e.target as HTMLElement).closest('[data-touch-grip]')
      if (!grip) return
      e.preventDefault()
      const card = grip.closest('[data-account-index]')
      if (!card) return
      const idx = Number(card.getAttribute('data-account-index'))
      if (isNaN(idx)) return
      touchCurrentIndex.current = idx
      dragItem.current = idx
      setTouchDragging(true)
    }
    document.addEventListener('touchstart', onStart, { passive: false })
    return () => document.removeEventListener('touchstart', onStart)
  }, [])

  async function reload() {
    try {
      const res = await fetch('/api/accounts', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar')
      setAccounts((await res.json()) as AccountDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar as contas.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchAccounts() {
      try {
        const res = await fetch('/api/accounts', { cache: 'no-store' })
        if (!res.ok) throw new Error('Erro ao carregar')
        const data = (await res.json()) as AccountDto[]
        if (!cancelled) {
          setAccounts(data)
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar as contas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAccounts()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!touchDragging) return
    function onMove(e: TouchEvent) {
      if (touchCurrentIndex.current === null) return
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (!el) return
      const card = el.closest('[data-account-index]')
      if (card) {
        const idx = Number(card.getAttribute('data-account-index'))
        if (!isNaN(idx)) setDragOverIndex(idx)
      }
    }
    function onEnd() {
      if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
        const updated = [...accounts]
        const [moved] = updated.splice(dragItem.current, 1)
        updated.splice(dragOverIndex, 0, moved)
        setAccounts(updated)
        fetch('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: updated.map((a) => a.id) }),
        })
      }
      setTouchDragging(false)
      setDragOverIndex(null)
      touchCurrentIndex.current = null
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [touchDragging, dragOverIndex, accounts])

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
    const updated = [...accounts]
    const [moved] = updated.splice(dragItem.current, 1)
    updated.splice(dragOverIndex, 0, moved)
    setAccounts(updated)
    fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map((a) => a.id) }),
    })
    setDragOverIndex(null)
    dragItem.current = null
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function openCreate() {
    setEditing(null)
    setName('')
    setType('')
    setColor(CATEGORY_COLORS[0])
    setInitialBalance('')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(account: AccountDto) {
    setEditing(account)
    setName(account.name)
    setType(account.type)
    setColor(account.color)
    setInitialBalance(String(account.initialBalance / 100))
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
        type,
        color,
        initialBalance: Number(initialBalance || 0),
      }
      const res = await fetch(
        editing ? `/api/accounts/${editing.id}` : '/api/accounts',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Erro ao salvar a conta')
        return
      }
      setModalOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(account: AccountDto) {
    setConfirmTarget(account)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const res = await fetch(`/api/accounts/${confirmTarget.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir a conta.')
      return
    }
    await reload()
    toast.success('Conta excluída', {
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(confirmTarget!),
      },
    })
  }

  async function undoCreate(account: AccountDto) {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: account.name,
        type: account.type,
        color: account.color,
        initialBalance: account.initialBalance / 100,
      }),
    })
    if (res.ok) {
      await reload()
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Contas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Gerencie suas contas e saldos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            disabled={accounts.length < 2}
            title={accounts.length < 2 ? 'Crie pelo menos 2 contas para transferir' : undefined}
            className="flex items-center gap-2 rounded-lg border border-sky-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-sky-600 transition hover:bg-sky-500 hover:text-white dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            <ArrowRightLeft aria-hidden="true" className="h-4 w-4" />
            Transferir
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nova conta
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Saldo total
        </p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {formatBRL(totalBalance)}
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
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Wallet aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
            Nenhuma conta criada ainda.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account, index) => (
            <div
              key={account.id}
              data-account-index={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              className={`group rounded-2xl border bg-white p-5 transition dark:bg-zinc-800 ${
                dragOverIndex === index
                  ? 'border-emerald-400 border-2 dark:border-emerald-500'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div
                      data-touch-grip
                      className="flex h-10 w-10 touch-none cursor-grab items-center justify-center text-zinc-300 transition hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                    >
                      <GripVertical aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: account.color }}
                    aria-hidden="true"
                  >
                    <Wallet aria-hidden="true" className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {account.name}
                    </p>
                    <p className="text-xs text-zinc-500">{ACCOUNT_TYPE_LABEL[account.type] ?? account.type}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(account)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Editar"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(account)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:text-white"
                    aria-label="Excluir"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p
                className={`mt-4 text-xl font-bold ${
                  account.balance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatBRL(account.balance)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Saldo inicial {formatBRL(account.initialBalance)}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Editar conta' : 'Nova conta'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Ex: Carteira, Nubank..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tipo
                </label>
                <Select
                  value={type}
                  onChange={setType}
                  options={ACCOUNT_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                  placeholder="Selecione..."
                  id="type"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Cor
                </label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
              <div>
                <label htmlFor="initialBalance" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Saldo inicial (R$)
                </label>
                <CurrencyInput
                  id="initialBalance"
                  value={initialBalance}
                  onChange={setInitialBalance}
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
                {editing ? 'Salvar alterações' : 'Criar conta'}
              </button>
            </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir a conta "${confirmTarget?.name ?? ''}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
      <TransferForm
        open={transferOpen}
        accounts={accounts}
        onClose={() => setTransferOpen(false)}
        onDone={() => {
          setTransferOpen(false)
          reload()
        }}
      />
    </div>
  )
}
