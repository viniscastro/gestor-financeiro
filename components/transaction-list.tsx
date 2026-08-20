'use client'

import { ArrowRightLeft, Pencil, Repeat, Trash2 } from 'lucide-react'
import { formatBRL, formatDate } from '@/lib/format'
import type { TransactionDto } from '@/lib/types'

type Props = {
  transactions: TransactionDto[]
  onEdit: (transaction: TransactionDto) => void
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, onEdit, onDelete }: Props) {
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
            className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-700"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                isTransfer
                  ? 'bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400'
                  : isIncome
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isTransfer ? <ArrowRightLeft className="h-4 w-4" /> : isIncome ? '+' : '–'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {t.description}
              </p>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.categoryColor ?? t.accountColor }}
                  />
                  {t.categoryName ?? 'Transferência'}
                </span>
                · {t.accountName} · {formatDate(new Date(t.date))}
                {t.recurringId && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                    <Repeat className="h-3 w-3" />
                    Recorrente
                  </span>
                )}
              </p>
            </div>

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

            <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
              {!isTransfer && (
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
