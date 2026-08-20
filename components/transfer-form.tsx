'use client'

import { useState } from 'react'
import { ArrowRightLeft, LoaderCircle, X } from 'lucide-react'
import CurrencyInput from '@/components/currency-input'
import type { AccountDto } from '@/lib/types'

type Props = {
  open: boolean
  accounts: AccountDto[]
  onClose: () => void
  onDone: () => void
}

export default function TransferForm({ open, accounts, onClose, onDone }: Props) {
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          date,
          description: description || '',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Erro ao fazer a transferência')
        return
      }
      setFromAccountId('')
      setToAccountId('')
      setAmount('')
      setDescription('')
      onDone()
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Transferência entre contas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fromAccount" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Da conta
            </label>
            <select
              id="fromAccount"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="toAccount" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Para a conta
            </label>
            <select
              id="toAccount"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {accounts
                .filter((a) => a.id !== fromAccountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Valor (R$)
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
              <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Data
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descrição (opcional)
            </label>
            <input
              id="description"
              type="text"
              placeholder="Ex: Economia"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            Transferir
          </button>
        </form>
      </div>
    </div>
  )
}
