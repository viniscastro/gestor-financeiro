'use client'

import { useState } from 'react'
import { Info, LoaderCircle, TrendingDown, TrendingUp, X } from 'lucide-react'
import CurrencyInput from '@/components/currency-input'
import type { TransactionType } from '@/lib/categories'
import type { AccountDto, CategoryDto, TransactionDto } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  transaction?: TransactionDto | null
  accounts: AccountDto[]
  categories: CategoryDto[]
}

export default function TransactionForm({
  open,
  onClose,
  onSaved,
  transaction,
  accounts,
  categories,
}: Props) {
  if (!open) return null
  return (
    <TransactionFormBody
      key={transaction?.id ?? 'new'}
      transaction={transaction ?? null}
      onClose={onClose}
      onSaved={onSaved}
      accounts={accounts}
      categories={categories}
    />
  )
}

type BodyProps = {
  transaction: TransactionDto | null
  onClose: () => void
  onSaved: () => void
  accounts: AccountDto[]
  categories: CategoryDto[]
}

function TransactionFormBody({
  transaction,
  onClose,
  onSaved,
  accounts,
  categories,
}: BodyProps) {
  const [type, setType] = useState<TransactionType>(
    transaction?.transactionType ?? 'INCOME'
  )
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(
    transaction ? (transaction.amount / 100).toFixed(2) : ''
  )
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? accounts[0]?.id ?? ''
  )
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? ''
  )
  const [date, setDate] = useState(
    transaction
      ? transaction.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const availableCategories = categories.filter((c) => c.type === type)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const showTransferHint = selectedAccount !== undefined && selectedAccount.type !== 'CARTEIRA'

  function switchType(next: TransactionType) {
    setType(next)
    if (!availableCategories.some((c) => c.id === categoryId)) setCategoryId('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        transactionType: type,
        description,
        amount: Number(amount),
        accountId,
        categoryId: categoryId || null,
        date,
      }
      const res = await fetch(
        transaction ? `/api/transactions/${transaction.id}` : '/api/transactions',
        {
          method: transaction ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Erro ao salvar a transação')
        return
      }
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {transaction ? 'Editar transação' : 'Nova transação'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/80">
            <button
              type="button"
              onClick={() => switchType('INCOME')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                type === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => switchType('EXPENSE')}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                type === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Saída
            </button>
          </div>

          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descrição
            </label>
            <input
              id="description"
              type="text"
              placeholder="Ex: Mercado, Salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={100}
              className={inputClass}
            />
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
            <label htmlFor="account" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Conta
            </label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
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

          {showTransferHint && (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Movimentação entre as suas contas? Aportes e retiradas de{' '}
                {selectedAccount?.name} não devem ser registrados como Saída/Entrada —
                use <span className="font-semibold">Transferir</span> na lista de
                transações para o saldo total não mudar.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Categoria
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {transaction ? 'Salvar alterações' : 'Adicionar transação'}
          </button>
        </form>
      </div>
    </div>
  )
}
