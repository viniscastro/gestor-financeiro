'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { CATEGORY_LABEL } from '@/lib/categories'
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
        <p className="text-sm text-zinc-400">Nenhuma transação encontrada.</p>
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
        return (
          <li
            key={t.id}
            className="group flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition hover:border-zinc-700"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              {isIncome ? '+' : '–'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{t.description}</p>
              <p className="text-xs text-zinc-500">
                {CATEGORY_LABEL[t.category] ?? t.category} · {formatDate(new Date(t.date))}
              </p>
            </div>

            <p
              className={`shrink-0 text-sm font-semibold ${
                isIncome ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isIncome ? '+' : '–'} {formatBRL(t.amount)}
            </p>

            <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onEdit(t)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
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
