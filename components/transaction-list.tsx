'use client'

import { ArrowRightLeft, Pencil, Repeat, Trash2 } from 'lucide-react'
import { formatBRL, formatDate, parseLocalDate } from '@/lib/format'
import type { TransactionDto } from '@/lib/types'

type Props = {
  transactions: TransactionDto[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (transaction: TransactionDto) => void
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, selectedIds, onToggleSelect, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-300">
          Nenhuma transação encontrada.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Clique em “Nova transação” para adicionar uma entrada ou saída.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {transactions.map((t) => {
        const isIncome = t.transactionType === 'INCOME'
        const isTransfer = Boolean(t.transferGroupId && !t.categoryName)
        return (
          <li
            key={t.id}
            className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 transition hover:border-zinc-300 sm:items-center sm:gap-4 sm:px-4             dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-700"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(t.id)}
              onChange={() => onToggleSelect(t.id)}
              aria-label={`Selecionar ${t.description}`}
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-600 sm:mt-0"
            />
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold sm:h-10 sm:w-10 ${
                isTransfer
                  ? 'bg-sky-500 text-white'
                  : isIncome
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
              }`}
            >
              {isTransfer ? <ArrowRightLeft aria-hidden="true" className="h-4 w-4" /> : isIncome ? '+' : '–'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:truncate">
                  {t.description}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      isTransfer
                        ? 'text-sky-600 dark:text-sky-400'
                        : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '–'} {formatBRL(t.amount)}
                  </p>
                  <div className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {!isTransfer && (
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(t.id)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:text-white"
                      aria-label="Excluir"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.categoryColor ?? t.accountColor }}
                    aria-hidden="true"
                  />
                  {t.categoryName ?? 'Transferência'}
                </span>
                · {t.accountName} · {formatDate(parseLocalDate(t.date))}
                {t.installmentGroupId && t.installmentCurrent && t.installmentTotal && (
                  <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
                    <Repeat aria-hidden="true" className="h-3 w-3" />
                    {t.installmentCurrent}/{t.installmentTotal}
                  </span>
                )}
                {t.recurringId && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                    <Repeat aria-hidden="true" className="h-3 w-3" />
                    Recorrente
                  </span>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
