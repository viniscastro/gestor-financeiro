'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CreditCard,
  GripVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Upload,
  ChevronDown,
} from 'lucide-react'
import Modal from '@/components/modal'
import ConfirmDialog from '@/components/confirm-dialog'
import ColorPicker from '@/components/color-picker'
import CurrencyInput from '@/components/currency-input'
import Select from '@/components/select'
import { toast } from 'sonner'
import { CATEGORY_COLORS } from '@/lib/categories'
import { formatBRL } from '@/lib/format'
import type { AccountDto, CategoryDto, CreditCardDto, CreditCardStatementDto, TransactionDto } from '@/lib/types'
import { parseCardCsv, parseCardOfx } from '@/lib/card-import'

type CardForm = {
  name: string
  last4: string
  creditLimit: string
  closingDay: string
  dueDay: string
  color: string
}

const emptyForm: CardForm = {
  name: '',
  last4: '',
  creditLimit: '',
  closingDay: '1',
  dueDay: '10',
  color: CATEGORY_COLORS[0],
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${names[(m ?? 0) - 1] ?? ''}/${y}`
}

function formatDDMMYYYY(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export default function CardsManager() {
  const [cards, setCards] = useState<CreditCardDto[]>([])
  const [statements, setStatements] = useState<CreditCardStatementDto[]>([])
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCardDto | null>(null)
  const [form, setForm] = useState<CardForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [confirmCard, setConfirmCard] = useState<CreditCardDto | null>(null)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [cardTx, setCardTx] = useState<Record<string, TransactionDto[]>>({})
  const [selectedMonth, setSelectedMonth] = useState<Record<string, string>>({})
  const [hoverMonth, setHoverMonth] = useState<Record<string, string>>({})

  const dragItem = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const touchCurrentIndex = useRef<number | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addCardId, setAddCardId] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addDate, setAddDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [addCategory, setAddCategory] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importCardId, setImportCardId] = useState('')
  const [importCategory, setImportCategory] = useState('')
  const [importSaving, setImportSaving] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<
    { date: string; description: string; amountCents: number; type: 'INCOME' | 'EXPENSE' }[] | null
  >(null)
  const [previewSelected, setPreviewSelected] = useState<Set<number>>(new Set())

  const [accounts, setAccounts] = useState<AccountDto[]>([])
  const [payStmt, setPayStmt] = useState<CreditCardStatementDto | null>(null)
  const [payAccId, setPayAccId] = useState('')
  const [paySaving, setPaySaving] = useState(false)

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
  const categoryOptions = expenseCategories.map((c) => ({ value: c.id, label: c.name }))

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  async function reload() {
    try {
      const [cardsRes, stmtsRes, categoriesRes, accRes] = await Promise.all([
        fetch('/api/cards', { cache: 'no-store' }),
        fetch('/api/cards/statements', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/accounts', { cache: 'no-store' }),
      ])
      if (cardsRes.ok) setCards((await cardsRes.json()) as CreditCardDto[])
      if (stmtsRes.ok) setStatements((await stmtsRes.json()) as CreditCardStatementDto[])
      if (categoriesRes.ok) setCategories((await categoriesRes.json()) as CategoryDto[])
      if (accRes.ok) setAccounts((await accRes.json()) as AccountDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar os cartões.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    function onStart(e: TouchEvent) {
      const grip = (e.target as HTMLElement).closest('[data-touch-grip]')
      if (!grip) return
      e.preventDefault()
      const li = grip.closest('[data-drag-index]')
      if (!li) return
      const idx = Number(li.getAttribute('data-drag-index'))
      if (isNaN(idx)) return
      touchCurrentIndex.current = idx
      dragItem.current = idx
      setTouchDragging(true)
    }
    document.addEventListener('touchstart', onStart, { passive: false })
    return () => document.removeEventListener('touchstart', onStart)
  }, [])

  useEffect(() => {
    if (!touchDragging) return
    function onMove(e: TouchEvent) {
      if (touchCurrentIndex.current === null) return
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const li = el?.closest('[data-drag-index]') as HTMLElement | null
      if (li) {
        const idx = Number(li.getAttribute('data-drag-index'))
        if (!isNaN(idx)) setDragOverIndex(idx)
      }
    }
    function onEnd() {
      if (
        dragItem.current !== null &&
        dragOverIndex !== null &&
        dragItem.current !== dragOverIndex
      ) {
        const updated = [...cards]
        const [moved] = updated.splice(dragItem.current, 1)
        updated.splice(dragOverIndex, 0, moved)
        setCards(updated)
        const ids = updated.map((c) => c.id)
        fetch('/api/cards', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
      }
      setDragOverIndex(null)
      dragItem.current = null
      touchCurrentIndex.current = null
      setTouchDragging(false)
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [touchDragging, dragOverIndex, cards])

  function handleDragStart(index: number) {
    dragItem.current = index
  }

  function handleDragEnter(index: number) {
    setDragOverIndex(index)
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverIndex === null || dragItem.current === dragOverIndex) {
      setDragOverIndex(null)
      dragItem.current = null
      return
    }
    const updated = [...cards]
    const [moved] = updated.splice(dragItem.current, 1)
    updated.splice(dragOverIndex, 0, moved)
    setCards(updated)
    const ids = updated.map((c) => c.id)
    fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setDragOverIndex(null)
    dragItem.current = null
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(card: CreditCardDto) {
    setEditing(card)
    setForm({
      name: card.name,
      last4: card.last4 ?? '',
      creditLimit: (card.creditLimit / 100).toFixed(2),
      closingDay: String(card.closingDay),
      dueDay: String(card.dueDay),
      color: card.color,
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const limitValue = Number(form.creditLimit)
    if (!limitValue || limitValue <= 0) {
      setFormError('Informe o limite do cartão')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name,
        last4: form.last4,
        creditLimit: limitValue,
        closingDay: Math.min(28, Math.max(1, Number(form.closingDay) || 1)),
        dueDay: Math.min(28, Math.max(1, Number(form.dueDay) || 1)),
        color: form.color,
      }
      const res = await fetch(editing ? `/api/cards/${editing.id}` : '/api/cards', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error ?? 'Erro ao salvar o cartão')
        return
      }
      toast.success(editing ? 'Cartão atualizado' : 'Cartão criado')
      setModalOpen(false)
      reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmCard) return
    const res = await fetch(`/api/cards/${confirmCard.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Cartão excluído')
      setCards((prev) => prev.filter((c) => c.id !== confirmCard.id))
      setStatements((prev) => prev.filter((s) => s.cardId !== confirmCard.id))
    } else {
      toast.error('Erro ao excluir cartão')
    }
    setConfirmCard(null)
  }

  async function toggleExpand(cardId: string) {
    setExpanded((prev) => (prev === cardId ? null : cardId))
    if (!(cardId in cardTx)) {
      await loadMonth(cardId, '')
    }
  }

  async function loadMonth(cardId: string, month: string) {
    try {
      const url = `/api/cards/${cardId}/transactions${month ? `?month=${month}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as TransactionDto[]
        setCardTx((prev) => ({ ...prev, [cardId]: data }))
      }
    } catch {}
  }

  function changeMonth(cardId: string, month: string) {
    setSelectedMonth((prev) => ({ ...prev, [cardId]: month }))
    loadMonth(cardId, month)
  }

  function canPayStatement(s: CreditCardStatementDto): boolean {
    if (s.status !== 'OPEN') return false
    if (s.totalAmount <= 0) return false
    const due = new Date(s.dueDate + 'T12:00:00')
    const now = new Date()
    const startDue = new Date(due)
    startDue.setHours(0, 0, 0, 0)
    const startNow = new Date(now)
    startNow.setHours(0, 0, 0, 0)
    const days = Math.round((startDue.getTime() - startNow.getTime()) / 86_400_000)
    return days >= 0 && days <= 7
  }

  function openPay(s: CreditCardStatementDto) {
    setPayStmt(s)
    setPayAccId(accounts[0]?.id ?? '')
  }

  async function confirmPay() {
    if (!payStmt || !payAccId) return
    setPaySaving(true)
    try {
      const res = await fetch('/api/bills/statement-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId: payStmt.id, accountId: payAccId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao marcar a fatura como paga')
        return
      }
      toast.success('Fatura marcada como paga')
      setPayStmt(null)
      await reload()
    } finally {
      setPaySaving(false)
    }
  }

  async function handleAddPurchase(e: React.FormEvent) {
    e.preventDefault()
    setAddSaving(true)
    try {
      const res = await fetch(`/api/cards/${addCardId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: addDesc,
          amount: Number(addAmount),
          date: addDate,
          categoryId: addCategory || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao adicionar')
        return
      }
      toast.success('Compra adicionada')
      setAddOpen(false)
      reload()
      await loadMonth(addCardId, selectedMonth[addCardId] ?? '')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    const ext = file.name.split('.').pop()?.toLowerCase()
    const parsed = ext === 'csv' ? parseCardCsv(text) : parseCardOfx(text)
    if (parsed.length === 0) {
      toast.error('Nenhuma transação reconhecida no arquivo')
      return
    }
    setImportSaving(false)
    setParsedPreview(parsed)
    setPreviewSelected(new Set(parsed.map((t, i) => (t.type === 'EXPENSE' ? i : -1)).filter((i) => i >= 0)))
  }

  function togglePreview(index: number) {
    setPreviewSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function toggleAllPreview() {
    setPreviewSelected((prev) => {
      if (parsedPreview && prev.size === parsedPreview.length) return new Set()
      return parsedPreview ? new Set(parsedPreview.map((_, i) => i)) : prev
    })
  }

  async function confirmImport() {
    if (!parsedPreview) return
    const transactions = parsedPreview.map((t, i) => ({
      ...t,
      abate: previewSelected.has(i),
    }))
    setImportSaving(true)
    try {
      const res = await fetch(`/api/cards/${importCardId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          categoryId: importCategory || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao importar')
        return
      }
      toast.success(`${data.imported ?? transactions.length} transações importadas`)
      setImportOpen(false)
      setParsedPreview(null)
      setPreviewSelected(new Set())
      reload()
      await loadMonth(importCardId, selectedMonth[importCardId] ?? '')
    } finally {
      setImportSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-zinc-200 p-12 dark:bg-zinc-700">
        <LoaderCircle className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gerencie seus cartões de crédito, faturas e importe extratos.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Novo cartão
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 p-12 text-zinc-500 dark:border-zinc-700">
          <CreditCard className="h-10 w-10" />
          <p className="text-sm">Nenhum cartão cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, index) => {
            const isOpen = expanded === card.id
            const tx = cardTx[card.id] ?? []
            const month = selectedMonth[card.id] ?? ''
            const cardStatements = statements.filter((s) => s.cardId === card.id)
            const spent = cardStatements.find((s) => s.status === 'OPEN' && s.totalAmount > 0)?.totalAmount ?? 0
            const spentPct = card.creditLimit > 0 ? Math.min(100, Math.round((spent / card.creditLimit) * 100)) : 0
            return (
              <div
                key={card.id}
                data-drag-index={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-800 transition ${
                  dragOverIndex === index
                    ? 'border-t-2 border-t-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    data-touch-grip
                    className="flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-zinc-300 transition hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                    title="Arrastar para reordenar"
                  >
                    <GripVertical aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: card.color }}>
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(card.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="break-words font-semibold text-zinc-900 dark:text-zinc-100">
                        {card.name}
                      </p>
                      {card.last4 && (
                        <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold tracking-widest text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                          •••• {card.last4}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Limite {formatBRL(card.creditLimit)}</span>
                      <span>Fecha dia {card.closingDay}</span>
                      <span>Vence dia {card.dueDay}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(card.id)}
                    className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700"
                    aria-label={isOpen ? 'Recolher' : 'Expandir'}
                    title={isOpen ? 'Recolher' : 'Expandir'}
                  >
                    <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(card)}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCard(card)}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500 hover:text-white dark:text-zinc-400"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-700/50">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                      Gasto atual: {formatBRL(spent)}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">{spentPct}% do limite</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${spentPct}%`, backgroundColor: card.color }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                    Usado {formatBRL(spent)} de {formatBRL(card.creditLimit)}
                  </p>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-100 p-4 dark:border-zinc-700">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {cardStatements.slice(0, 6).map((s) => {
                          const isHover = hoverMonth[card.id] === s.monthKey
                          const isSel = month === s.monthKey
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => changeMonth(card.id, s.monthKey)}
                              onMouseEnter={() => setHoverMonth((p) => ({ ...p, [card.id]: s.monthKey }))}
                              onMouseLeave={() => setHoverMonth((p) => ({ ...p, [card.id]: '' }))}
                              style={isHover ? { backgroundColor: card.color } : undefined}
                              className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition ${
                                isSel
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                                  : 'border-zinc-200 hover:border-transparent dark:border-zinc-700'
                              } ${isHover ? 'shadow-md' : ''}`}
                            >
                              <span className={`flex items-center gap-1.5 text-xs font-semibold ${isHover ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {monthLabel(s.monthKey)}
                                {s.status === 'PAID' && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isHover ? 'bg-black/25 text-white' : 'bg-emerald-600 text-white'}`}>
                                    Paga
                                  </span>
                                )}
                              </span>
                              <span className={`text-[11px] font-medium ${isHover ? 'text-white/85' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                {formatBRL(s.totalAmount)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAddCardId(card.id)
                            setAddDesc('')
                            setAddAmount('')
                            setAddDate(new Date().toISOString().slice(0, 10))
                            setAddCategory('')
                            setAddOpen(true)
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                        >
                          <Plus className="mr-1 inline h-3.5 w-3.5" />
                          Compra avulsa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImportCardId(card.id)
                            setImportCategory('')
                            setImportOpen(true)
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Importar CSV/OFX
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const ms = cardStatements.find((s) => s.monthKey === month)
                      if (!ms) return null
                      const paid = ms.status === 'PAID'
                      const canPay = canPayStatement(ms)
                      return (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          {paid ? (
                            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              Fatura deste mês já foi <span className="font-bold">paga</span>
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {monthLabel(ms.monthKey)} · Vence {formatDDMMYYYY(ms.dueDate)}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={paid || !canPay}
                            onClick={() => openPay(ms)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              canPay && !paid
                                ? 'Marcar fatura como paga'
                                : 'Disponível para faturas abertas, com valor e vencendo em até 7 dias'
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                            Marcar como paga
                          </button>
                        </div>
                      )
                    })()}

                    {tx.length === 0 ? (
                      <p className="py-6 text-center text-sm text-zinc-400">
                        Nenhuma compra neste mês. Adicione uma compra ou importe o extrato.
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                        {tx.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{t.description}</p>
                              <p className="truncate text-xs text-zinc-500">
                                {formatDDMMYYYY(t.date.slice(0, 10))}{t.categoryName ? ` · ${t.categoryName}` : ''}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 font-semibold ${
                                t.transactionType === 'INCOME'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {t.transactionType === 'INCOME' ? '+' : '-'} {formatBRL(t.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cartão' : 'Novo cartão'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Nubank, Itaú..."
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Limite (R$) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput value={form.creditLimit} onChange={(v) => setForm({ ...form, creditLimit: v })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Final (últimos 4)
              </label>
              <input
                value={form.last4}
                onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="0000"
                maxLength={4}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Dia de fechamento <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={form.closingDay}
                onChange={(e) => setForm({ ...form, closingDay: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Dia de vencimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cor</label>
            <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar cartão'}
          </button>
        </form>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar compra no cartão">
        <form onSubmit={handleAddPurchase} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descrição <span className="text-rose-500">*</span>
            </label>
            <input
              value={addDesc}
              onChange={(e) => setAddDesc(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput value={addAmount} onChange={setAddAmount} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Data</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria</label>
            <Select
              value={addCategory}
              onChange={setAddCategory}
              options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
            />
          </div>
          <button
            type="submit"
            disabled={addSaving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {addSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Adicionar compra
          </button>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar fatura (CSV/OFX)">
        {parsedPreview ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria padrão</label>
              <Select
                value={importCategory}
                onChange={setImportCategory}
                options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-900/50">
              <span className="text-zinc-500">
                Marque o que deve ser <strong>abatido da fatura</strong>. Saídas somam ao total e
                entradas subtraem. Desmarcado é registrado como entrada sem vínculo com a fatura.
              </span>
              <button
                type="button"
                onClick={toggleAllPreview}
                className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {parsedPreview.length > 0 && previewSelected.size === parsedPreview.length
                  ? 'Desmarcar todas'
                  : 'Marcar todas'}
              </button>
            </div>
            <div className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 dark:divide-zinc-700/50 dark:border-zinc-700">
              {parsedPreview.map((t, i) => {
                const selected = previewSelected.has(i)
                return (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePreview(i)}
                      className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {t.description}
                      </p>
                      <p className="text-xs text-zinc-500">{formatDDMMYYYY(t.date)}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        t.type === 'EXPENSE'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {t.type === 'EXPENSE' ? '-' : '+'} {formatBRL(t.amountCents)}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => { setParsedPreview(null); setPreviewSelected(new Set()) }}
                disabled={importSaving}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Trocar arquivo
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importSaving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importSaving ? (
                  <><LoaderCircle className="h-4 w-4 animate-spin" /> Importando...</>
                ) : (
                  <>Importar {previewSelected.size} de {parsedPreview.length} na fatura</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria padrão</label>
              <Select
                value={importCategory}
                onChange={setImportCategory}
                options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
              />
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-zinc-500 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-900/50 dark:hover:border-emerald-500">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Selecione o extrato (CSV ou OFX)</span>
              <span className="text-xs">Importado direto do seu banco/cartão</span>
              <input
                type="file"
                accept=".csv,.ofx,.qfx,text/csv"
                className="hidden"
                disabled={importSaving}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportFile(f)
                }}
              />
            </label>
            {importSaving && (
              <p className="flex items-center gap-2 text-sm text-zinc-500">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Importando...
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!payStmt} onClose={() => setPayStmt(null)} title="Pagar fatura">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            confirmPay()
          }}
        >
          {payStmt && (
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Fatura {monthLabel(payStmt.monthKey)} · {formatBRL(payStmt.totalAmount)}
            </p>
          )}
          <div>
            <label htmlFor="pay-account" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Conta para débito <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
            </label>
            <Select
              id="pay-account"
              value={payAccId}
              onChange={setPayAccId}
              required
              placeholder="Selecione a conta..."
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayStmt(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!payAccId || paySaving}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paySaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Confirmar pagamento
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmCard}
        title="Excluir cartão"
        message={`Tem certeza que deseja excluir "${confirmCard?.name}"? As compras vinculadas deixarão de estar no cartão.`}
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmCard(null)}
      />
    </div>
  )
}
