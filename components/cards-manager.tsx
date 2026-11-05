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
} from '@/components/icons'
import jsPDF from 'jspdf'
import autoTable, { type CellInput } from 'jspdf-autotable'
import Modal from '@/components/modal'
import ConfirmDialog from '@/components/confirm-dialog'
import ColorPicker from '@/components/color-picker'
import CurrencyInput from '@/components/currency-input'
import DatePicker from '@/components/date-picker'
import Select from '@/components/select'
import { toast } from 'sonner'
import { CATEGORY_COLORS } from '@/lib/categories'
import { descriptionWithInstallment, formatBRL, todayLocalISO } from '@/lib/format'
import { flattenCategories } from '@/lib/category'
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
  

  const dragItem = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const touchCurrentIndex = useRef<number | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addCardId, setAddCardId] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addDate, setAddDate] = useState<string>(todayLocalISO())
  const [addCategory, setAddCategory] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addInstallments, setAddInstallments] = useState('')

  const [editTx, setEditTx] = useState<TransactionDto | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSaving, setEditSaving] = useState(false)

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
  const categoryOptions = flattenCategories(expenseCategories)

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial; o estado muda só após a resposta da rede
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

  // Nenhum mês vem selecionado: as compras só aparecem depois que a pessoa
  // escolhe uma fatura, e ao recolher o cartão a escolha é descartada.
  function toggleExpand(cardId: string) {
    const willOpen = expanded !== cardId
    setExpanded(willOpen ? cardId : null)
    setSelectedMonth((prev) => {
      const next = { ...prev }
      delete next[cardId]
      return next
    })
    setCardTx((prev) => {
      const next = { ...prev }
      delete next[cardId]
      return next
    })
  }

  async function reloadSelectedMonth(cardId: string) {
    const month = selectedMonth[cardId]
    if (month) await loadMonth(cardId, month)
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
    setCardTx((prev) => ({ ...prev, [cardId]: [] }))
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
          transactionType: 'EXPENSE',
          installments: addInstallments ? Math.max(1, Math.min(48, Number(addInstallments))) : 1,
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
      await reloadSelectedMonth(addCardId)
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
      await reloadSelectedMonth(importCardId)
    } finally {
      setImportSaving(false)
    }
  }

  function openEditTx(t: TransactionDto) {
    setEditTx(t)
    setEditDesc(t.description)
    setEditAmount((t.amount / 100).toFixed(2))
    setEditDate(t.date.slice(0, 10))
    setEditCategory(t.categoryId ?? '')
  }

  async function handleEditTx(e: React.FormEvent) {
    e.preventDefault()
    if (!editTx) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: editTx.transactionType,
          description: editDesc,
          amount: Number(editAmount),
          date: editDate,
          categoryId: editCategory || null,
          creditCardId: editTx.creditCardId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao editar a compra')
        return
      }
      toast.success('Compra atualizada')
      setEditTx(null)
      const cardId = editTx.creditCardId
      if (cardId) await reloadSelectedMonth(cardId)
      reload()
    } finally {
      setEditSaving(false)
    }
  }

  function printStatementPdf(card: CreditCardDto, monthKey: string, tx: TransactionDto[]) {
    if (!monthKey || tx.length === 0) return
    const items = tx.filter((t) => t.transactionType === 'EXPENSE')
    const discounts = tx.filter((t) => t.transactionType === 'INCOME')
    const total = items.reduce((s, t) => s + t.amount, 0) - discounts.reduce((s, t) => s + t.amount, 0)
    const rows: CellInput[][] = tx.map((t) => {
      const label = t.transactionType === 'INCOME' ? ' (estorno)' : ''
      const description = descriptionWithInstallment(
        t.description,
        t.installmentCurrent,
        t.installmentTotal
      )
      return [
        formatDDMMYYYY(t.date.slice(0, 10)),
        String(description + label),
        formatBRL(t.amount),
      ]
    })

    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text(card.name, 14, 20)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Fatura ${monthLabel(monthKey)}`, 14, 28)
    doc.setTextColor(0)
    autoTable(doc, {
      startY: 36,
      head: [['Data', 'Produto', 'Valor']],
      body: rows,
      theme: 'striped',
    })
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 36
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total: ${formatBRL(total)}`, 196, finalY + 12, { align: 'right' })
    doc.save(`${card.name}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-slate-200 p-12 dark:bg-slate-700">
        <LoaderCircle className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie seus cartões de crédito, faturas e importe extratos.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" />
          Novo cartão
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-12 text-slate-500 dark:text-slate-400 dark:border-slate-700">
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
            const activeMonth = month
            // Sem mês escolhido, o uso do limite considera as faturas ainda não
            // pagas: as pagas já liberaram o limite.
            const spent = activeMonth
              ? cardStatements.find((s) => s.monthKey === activeMonth)?.totalAmount ?? 0
              : cardStatements.filter((s) => s.status !== 'PAID').reduce((sum, s) => sum + s.totalAmount, 0)
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
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-800 transition ${
                  dragOverIndex === index
                    ? 'border-t-2 border-t-brand-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    data-touch-grip
                    className="flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
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
                      <p className="break-words font-semibold text-slate-900 dark:text-slate-100">
                        {card.name}
                      </p>
                      {card.last4 && (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tracking-widest text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          •••• {card.last4}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>Limite {formatBRL(card.creditLimit)}</span>
                      <span>Fecha dia {card.closingDay}</span>
                      <span>Vence dia {card.dueDay}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(card.id)}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700"
                    aria-label={isOpen ? 'Recolher' : 'Expandir'}
                    title={isOpen ? 'Recolher' : 'Expandir'}
                  >
                    <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(card)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCard(card)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500 hover:text-white dark:text-slate-400"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {activeMonth ? `Gasto em ${monthLabel(activeMonth)}:` : 'Gasto total (faturas em aberto):'} {formatBRL(spent)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{spentPct}% do limite</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${spentPct}%`, backgroundColor: card.color }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Usado {formatBRL(spent)} de {formatBRL(card.creditLimit)}
                  </p>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 p-4 dark:border-slate-700">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {cardStatements.slice(0, 6).map((s) => {
                          const isSel = activeMonth === s.monthKey
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => changeMonth(card.id, s.monthKey)}
                              aria-pressed={isSel}
                              style={isSel ? { backgroundColor: card.color } : undefined}
                              className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition ${
                                isSel
                                  ? 'border-transparent shadow-md'
                                  : 'border-slate-200 hover:border-transparent hover:shadow-md dark:border-slate-700'
                              }`}
                            >
                              <span className={`flex items-center gap-1.5 text-xs font-semibold ${isSel ? 'text-white' : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>
                                {monthLabel(s.monthKey)}
                                {s.status === 'PAID' && (
                                  <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                    Paga
                                  </span>
                                )}
                              </span>
                              <span className={`text-[11px] font-medium ${isSel ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
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
                            setAddDate(todayLocalISO())
                            setAddCategory('')
                            setAddInstallments('')
                            setAddOpen(true)
                          }}
                          className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-500"
                        >
                          <Plus className="mr-1 inline h-3.5 w-3.5" />
                          Compra avulsa
                        </button>
                        <button
                          type="button"
                          onClick={() => printStatementPdf(card, activeMonth, tx)}
                          disabled={!activeMonth || tx.length === 0}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                          title={activeMonth ? 'Exportar esta fatura em PDF' : 'Selecione um mês para exportar a fatura'}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImportCardId(card.id)
                            setImportCategory('')
                            setImportOpen(true)
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Importar CSV/OFX
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const ms = cardStatements.find((s) => s.monthKey === activeMonth)
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
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {monthLabel(ms.monthKey)} · Vence {formatDDMMYYYY(ms.dueDate)}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={paid || !canPay}
                            onClick={() => openPay(ms)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              canPay && !paid
                                ? 'Marcar fatura como paga'
                                : 'Disponível para faturas abertas, com valor, de 7 dias antes até o dia do vencimento'
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                            Marcar como paga
                          </button>
                        </div>
                      )
                    })()}

                    {!activeMonth ? (
                      <p className="py-6 text-center text-sm text-slate-400">
                        Selecione um mês acima para ver as compras da fatura.
                      </p>
                    ) : tx.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">
                        Nenhuma compra neste mês. Adicione uma compra ou importe o extrato.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {tx.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{t.description}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {formatDDMMYYYY(t.date.slice(0, 10))}{t.categoryName ? ` · ${t.categoryName}` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span
                                className={`font-semibold ${
                                  t.transactionType === 'INCOME'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {t.transactionType === 'INCOME' ? '+' : '-'} {formatBRL(t.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditTx(t)}
                                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700"
                                title="Editar compra"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Limite (R$) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput value={form.creditLimit} onChange={(v) => setForm({ ...form, creditLimit: v })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Cor</label>
            <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar cartão'}
          </button>
        </form>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar compra no cartão">
        <form onSubmit={handleAddPurchase} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput value={addAmount} onChange={setAddAmount} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Data <span className="text-rose-500">*</span>
              </label>
              <DatePicker value={addDate} onChange={setAddDate} required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
            <Select
              value={addCategory}
              onChange={setAddCategory}
              options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Número de parcelas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={addInstallments}
              onChange={(e) => setAddInstallments(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="1"
              required
              className={inputClass}
            />
            {addInstallments === '1' && (
              <p className="mt-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">à vista</p>
            )}
          </div>
          <button
            type="submit"
            disabled={addSaving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {addSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Adicionar compra
          </button>
        </form>
      </Modal>

      <Modal open={!!editTx} onClose={() => setEditTx(null)} title="Editar compra">
        <form onSubmit={handleEditTx} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Descrição <span className="text-rose-500">*</span>
            </label>
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput value={editAmount} onChange={setEditAmount} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Data <span className="text-rose-500">*</span>
              </label>
              <DatePicker value={editDate} onChange={setEditDate} required />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
            <Select
              value={editCategory}
              onChange={setEditCategory}
              options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
            />
          </div>
          <button
            type="submit"
            disabled={editSaving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
          >
            {editSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </button>
        </form>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar fatura (CSV/OFX)">
        {parsedPreview ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria padrão</label>
              <Select
                value={importCategory}
                onChange={setImportCategory}
                options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/50">
              <span className="text-slate-500 dark:text-slate-400">
                Marque o que deve ser <strong>abatido da fatura</strong>. Saídas somam ao total e
                entradas subtraem. Desmarcado é registrado como entrada sem vínculo com a fatura.
              </span>
              <button
                type="button"
                onClick={toggleAllPreview}
                className="shrink-0 rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {parsedPreview.length > 0 && previewSelected.size === parsedPreview.length
                  ? 'Desmarcar todas'
                  : 'Marcar todas'}
              </button>
            </div>
            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-700/50 dark:border-slate-700">
              {parsedPreview.map((t, i) => {
                const selected = previewSelected.has(i)
                return (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePreview(i)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {t.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDDMMYYYY(t.date)}</p>
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
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Trocar arquivo
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importSaving}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria padrão</label>
              <Select
                value={importCategory}
                onChange={setImportCategory}
                options={[{ value: '', label: 'Sem categoria' }, ...categoryOptions]}
              />
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500 dark:text-slate-400 transition hover:border-brand-500 hover:bg-brand-50 dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-brand-500">
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
              <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fatura {monthLabel(payStmt.monthKey)} · {formatBRL(payStmt.totalAmount)}
            </p>
          )}
          <div>
            <label htmlFor="pay-account" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!payAccId || paySaving}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
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
