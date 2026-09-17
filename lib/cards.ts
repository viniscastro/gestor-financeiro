import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { CreditCardDto, CreditCardStatementDto } from '@/lib/types'

export const creditCardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  last4: z
    .string()
    .max(4, 'Máximo 4 dígitos')
    .optional()
    .nullable()
    .transform((v) => (v ? v.replace(/\D/g, '') : null)),
  creditLimit: z.number().positive('Informe o limite do cartão'),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
  color: z.string().default('#10b981'),
})

export type CreditCardInput = z.infer<typeof creditCardSchema>

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function toCreditCardDto(card: {
  id: string
  name: string
  last4: string | null
  creditLimit: number
  closingDay: number
  dueDay: number
  color: string
  position: number
}): CreditCardDto {
  return {
    id: card.id,
    name: card.name,
    last4: card.last4,
    creditLimit: card.creditLimit,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    color: card.color,
    position: card.position,
  }
}

type InvoiceWindow = {
  monthKey: string
  dueDate: Date
  start: Date
  end: Date
}

export function invoiceWindow(card: { closingDay: number; dueDay: number }, due: Date): InvoiceWindow {
  const y = due.getFullYear()
  const m = due.getMonth()
  const lastDayDue = new Date(y, m + 1, 0).getDate()
  const dueDate = new Date(y, m, Math.min(card.dueDay, lastDayDue))

  const prevLastDay = new Date(y, m, 0).getDate()
  // Start INCLUSIVO: dia do fechamento do mês anterior. Uma compra feita no dia
  // do fechamento ("virada do cartão") pertence à fatura do mês seguinte.
  const start = new Date(y, m - 1, Math.min(card.closingDay, prevLastDay))
  const lastDayStart = new Date(y, m + 1, 0).getDate()
  // End EXCLUSIVO: próprio dia do fechamento desta fatura. Compras no dia do
  // fechamento entram na fatura seguinte (borda tratada pelo start inclusivo).
  // As queries devem usar `date >= start && date < end`.
  const end = new Date(y, m, Math.min(card.closingDay, lastDayStart))

  return { monthKey: `${y}-${String(m + 1).padStart(2, '0')}`, dueDate, start, end }
}

export function nextInvoiceWindow(card: { closingDay: number; dueDay: number }, from: Date): InvoiceWindow {
  const y = from.getFullYear()
  const m = from.getMonth()
  for (let i = 0; i < 24; i++) {
    const dueCandidateMo = (m + i) % 12
    const dueCandidateY = y + Math.floor((m + i) / 12)
    const lastDay = new Date(dueCandidateY, dueCandidateMo + 1, 0).getDate()
    const dueCandidate = new Date(dueCandidateY, dueCandidateMo, Math.min(card.dueDay, lastDay))
    if (dueCandidate >= from) {
      return invoiceWindow(card, dueCandidate)
    }
  }
  return invoiceWindow(card, from)
}

export async function computeInvoiceTotal(
  userId: string,
  cardId: string,
  window: InvoiceWindow
): Promise<number> {
  const [expenses, incomes] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        creditCardId: cardId,
        transactionType: 'EXPENSE',
        date: { gte: window.start, lt: window.end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        creditCardId: cardId,
        transactionType: 'INCOME',
        date: { gte: window.start, lt: window.end },
      },
      _sum: { amount: true },
    }),
  ])
  return (expenses._sum.amount ?? 0) - (incomes._sum.amount ?? 0)
}

export async function getOrCreateStatement(
  userId: string,
  cardId: string,
  window: InvoiceWindow
) {
  const existing = await prisma.creditCardStatement.findUnique({
    where: { cardId_monthKey: { cardId, monthKey: window.monthKey } },
  })
  if (existing) return existing
  return prisma.creditCardStatement.create({
    data: {
      userId,
      cardId,
      monthKey: window.monthKey,
      dueDate: window.dueDate,
      status: 'OPEN',
    },
  })
}

export async function listStatements(userId: string, from: Date, months = 6) {
  const cards = await prisma.creditCard.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  const statements: CreditCardStatementDto[] = []

  for (const card of cards) {
    const current = nextInvoiceWindow(card, from)
    for (let i = 0; i < months; i++) {
      const due = new Date(current.dueDate)
      due.setMonth(due.getMonth() + i)
      const window = invoiceWindow(card, due)
      if (window.dueDate < from && i === 0) continue
      const stmt = await getOrCreateStatement(userId, card.id, window)
      const total = await computeInvoiceTotal(userId, card.id, window)
      statements.push({
        id: stmt.id,
        cardId: card.id,
        cardName: card.name,
        monthlyLabel: window.monthKey,
        monthKey: window.monthKey,
        dueDate: window.dueDate.toISOString().slice(0, 10),
        status: stmt.status === 'PAID' ? 'PAID' : 'OPEN',
        totalAmount: total,
        paidAt: stmt.paidAt ? stmt.paidAt.toISOString() : null,
      })
    }
  }

  return statements.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export async function getUpcomingCreditCardStatements(userId: string, withinDays: number) {
  const statements = await listStatements(userId, new Date(), 3)

  const now = new Date()
  const filtered = statements
    .filter((s) => s.status === 'OPEN')
    .map((s) => {
      const due = new Date(s.dueDate + 'T12:00:00')
      const diffMs = startOfDay(due).getTime() - startOfDay(now).getTime()
      return { ...s, days: Math.round(diffMs / 86_400_000) }
    })
    .filter((s) => s.days >= 0 && s.days <= withinDays && s.totalAmount > 0)
    .sort((a, b) => a.days - b.days)

  return filtered
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export {
  parseCardCsv,
  parseCardOfx,
  type ParsedCardTransaction,
} from './card-import'
