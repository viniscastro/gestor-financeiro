import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { CreditCardDto, CreditCardStatementDto } from '@/lib/types'
import { nextBusinessDay } from '@/lib/business-days'

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
  // Vencimento que cai em fim de semana ou feriado é adiado para o próximo dia
  // útil. A fatura continua identificada pelo mês nominal (monthKey).
  const dueDate = nextBusinessDay(new Date(y, m, Math.min(card.dueDay, lastDayDue)))

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

// Janela da fatura a partir do mês nominal ("YYYY-MM"). Use isto em vez do
// dueDate gravado: com o ajuste para dia útil o vencimento pode cair no mês
// seguinte ao da fatura.
export function invoiceWindowForMonth(card: { closingDay: number; dueDay: number }, monthKey: string): InvoiceWindow {
  const [y, m] = monthKey.split('-').map(Number)
  return invoiceWindow(card, new Date(y, m - 1, 1))
}

export function nextInvoiceWindow(card: { closingDay: number; dueDay: number }, from: Date): InvoiceWindow {
  const y = from.getFullYear()
  const m = from.getMonth()
  const today = startOfDay(from)
  // Começa no mês anterior: um vencimento adiado (ex.: 28/02 num sábado vai
  // para 02/03) ainda pode ser a fatura vigente no início do mês.
  for (let i = -1; i < 24; i++) {
    const w = invoiceWindow(card, new Date(y, m + i, 1))
    // A fatura cujo vencimento é hoje continua sendo a "fatura vigente"
    // durante todo o dia do vencimento.
    if (w.dueDate >= today) return w
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
  if (existing) {
    // Mantém o vencimento gravado em dia com a regra de dia útil.
    if (existing.dueDate.getTime() !== window.dueDate.getTime()) {
      return prisma.creditCardStatement.update({
        where: { id: existing.id },
        data: { dueDate: window.dueDate },
      })
    }
    return existing
  }
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

    // Faturas vencidas continuam em aberto até a pessoa marcar como paga:
    // nunca são tratadas como pagas só porque o vencimento passou.
    const overdue = await prisma.creditCardStatement.findMany({
      where: { userId, cardId: card.id, status: { not: 'PAID' }, monthKey: { lt: current.monthKey } },
      orderBy: { monthKey: 'asc' },
    })
    for (const old of overdue) {
      const window = invoiceWindowForMonth(card, old.monthKey)
      const total = await computeInvoiceTotal(userId, card.id, window)
      if (total <= 0) continue
      const stmt = await getOrCreateStatement(userId, card.id, window)
      statements.push(toStatementDto(stmt, card, window, total))
    }

    const [cy, cm] = current.monthKey.split('-').map(Number)
    for (let i = 0; i < months; i++) {
      const window = invoiceWindow(card, new Date(cy, cm - 1 + i, 1))
      const stmt = await getOrCreateStatement(userId, card.id, window)
      const total = await computeInvoiceTotal(userId, card.id, window)
      statements.push(toStatementDto(stmt, card, window, total))
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
    // Inclui as vencidas (days < 0): seguem pendentes até serem marcadas como pagas.
    .filter((s) => s.days <= withinDays && s.totalAmount > 0)
    .sort((a, b) => a.days - b.days)

  return filtered
}

function toStatementDto(
  stmt: { id: string; status: string; paidAt: Date | null },
  card: { id: string; name: string },
  window: InvoiceWindow,
  total: number
): CreditCardStatementDto {
  return {
    id: stmt.id,
    cardId: card.id,
    cardName: card.name,
    monthlyLabel: window.monthKey,
    monthKey: window.monthKey,
    dueDate: toLocalISODate(window.dueDate),
    status: stmt.status === 'PAID' ? 'PAID' : 'OPEN',
    totalAmount: total,
    paidAt: stmt.paidAt ? stmt.paidAt.toISOString() : null,
  }
}

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
