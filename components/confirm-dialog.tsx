'use client'

import { AlertTriangle, LoaderCircle, ShieldCheck } from '@/components/icons'
import Modal from '@/components/modal'

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
  const confirmClass =
    confirmVariant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500'
      : 'bg-brand-600 hover:bg-brand-500'

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            confirmVariant === 'primary' ? 'bg-brand-500' : 'bg-rose-500'
          }`}
        >
          {confirmVariant === 'primary' ? (
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-white" />
          ) : (
            <AlertTriangle aria-hidden="true" className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {message}
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
        >
          {loading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
