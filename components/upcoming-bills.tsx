'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlarmClock, Check, LoaderCircle } from 'lucide-react'
import { formatBRL } from '@/lib/format'
import type { AccountDto } from '@/lib/types'
import Modal from '@/components/modal'
import Select from '@/components/select'

export type UpcomingBillDto = {
  id: string
  description: string
  amountCents: number
  days: number
  kind?: 'BILL' | 'CARD'
}

export default function UpcomingBills({ bills }: { bills: UpcomingBillDto[] }) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [payingId, setPayingId] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [cardBill, setCardBill] = useState<UpcomingBillDto | null>(null)
  const [accId, setAccId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/accounts', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AccountDto[]) => {
        if (!cancelled) setAccounts(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function handlePay(bill: UpcomingBillDto) {
    if (bill.kind === 'CARD') {
      setAccId(accounts[0]?.id ?? '')
      setCardBill(bill)
      return
    }
    setPayingId(bill.id)
    try {
      const res = await fetch('/api/bills/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: bill.id }),
      })
      if (res.ok) {
        setDone((prev) => new Set(prev).add(bill.id))
        router.refresh()
      }
    } finally {
      setPayingId(null)
    }
  }

  async function confirmCardPay() {
    if (!cardBill || !accId) return
    setSaving(true)
    try {
      const res = await fetch('/api/bills/statement-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId: cardBill.id, accountId: accId }),
      })
      if (res.ok) {
        setDone((prev) => new Set(prev).add(cardBill.id))
        setCardBill(null)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (bills.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
      <div className="mb-2 flex items-center gap-2">
        <AlarmClock aria-hidden="true" className="h-4 w-4" />
        <h2 className="text-base font-semibold">
          Contas a vencer
        </h2>
      </div>
      <ul className="space-y-1.5">
        {bills.map((b) => {
          const isPaid = done.has(b.id)
          return (
            <li key={b.id} className="flex items-center justify-between gap-2 text-sm font-medium">
              <span className="truncate">{b.description}</span>
              <span className="shrink-0">
                {b.days === 0
                  ? 'vence hoje'
                  : b.days === 1
                    ? 'vence amanhã'
                    : `em ${b.days} dias`}{' '}
                · {formatBRL(b.amountCents)}
              </span>
              <button
                type="button"
                onClick={() => handlePay(b)}
                disabled={payingId === b.id || isPaid}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                title="Marcar como paga"
              >
                {payingId === b.id ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : isPaid ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  'Paga'
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <Link
        href="/recurring"
        className="mt-3 inline-flex text-xs font-semibold underline underline-offset-2"
      >
        Gerenciar recorrentes
      </Link>

      <Modal open={!!cardBill} onClose={() => setCardBill(null)} title="Pagar fatura">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            confirmCardPay()
          }}
        >
          {cardBill && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {cardBill.description} · {formatBRL(cardBill.amountCents)}
            </p>
          )}
          <div>
            <label htmlFor="pay-account" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Conta para débito <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
            </label>
            <Select
              id="pay-account"
              value={accId}
              onChange={setAccId}
              required
              placeholder="Selecione a conta..."
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCardBill(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!accId || saving}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Confirmar pagamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
