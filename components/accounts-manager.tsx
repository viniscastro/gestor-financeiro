'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { ACCOUNT_TYPES } from '@/lib/categories'
import { CATEGORY_COLORS } from '@/lib/categories'
import { formatBRL } from '@/lib/format'
import type { AccountDto } from '@/lib/types'
import { toast } from 'sonner'
import CurrencyInput from '@/components/currency-input'

export default function AccountsManager() {
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AccountDto | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('CARTEIRA')
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0])
  const [initialBalance, setInitialBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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

  function openCreate() {
    setEditing(null)
    setName('')
    setType('CARTEIRA')
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
    const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir a conta.')
      return
    }
    await reload()
    toast.success('Conta excluída', {
      action: {
        label: 'Desfazer',
        onClick: () => undoCreate(account),
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
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </button>
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
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-700 dark:bg-zinc-800">
          <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Wallet className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
            Nenhuma conta criada ainda.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${account.color}22` }}
                  >
                    <Wallet className="h-5 w-5" style={{ color: account.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {account.name}
                    </p>
                    <p className="text-xs text-zinc-500">{account.type}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(account)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(account)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative my-8 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {editing ? 'Editar conta' : 'Nova conta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome
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
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition ${
                        color === c ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
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
                {editing ? 'Salvar alterações' : 'Criar conta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
