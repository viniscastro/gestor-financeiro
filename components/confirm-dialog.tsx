'use client'

import { AlertTriangle, LoaderCircle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmClass =
    confirmVariant === 'danger'
      ? 'bg-rose-500 hover:bg-rose-400'
      : 'bg-emerald-500 hover:bg-emerald-400'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
