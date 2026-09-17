import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CARD_PAID_SENTINEL, monthKey } from '@/lib/recurring'
import { invoiceWindow, nextInvoiceWindow, computeInvoiceTotal } from '@/lib/cards'

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function monthStart(year: number, monthIndex: number, dayOfMonth: number): Date {
  return new Date(year, monthIndex, Math.min(dayOfMonth, lastDayOfMonth(year, monthIndex)))
}

type CardLike = { closingDay: number; dueDay: number }

function invoiceLabelFor(card: CardLike, date: Date) {
  const y = date.getFullYear()
  const m = date.getMonth()
  for (let i = -4; i <= 4; i++) {
    const ny = y + Math.floor((m + i) / 12)
    const nm = ((m + i) % 12 + 12) % 12
    const w = invoiceWindow(card, new Date(ny, nm, 1))
    if (date.getTime() >= w.start.getTime() && date.getTime() < w.end.getTime()) {
      return {
        label: w.monthKey,
        dueDate: w.dueDate.toISOString(),
        start: w.start.toISOString(),
        end: w.end.toISOString(),
      }
    }
  }
  return null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const userId = session.user.id
  const now = new Date()
  const currentMonth = monthKey(now)

  const cards = await prisma.creditCard.findMany({
    where: { userId },
    select: { id: true, name: true, closingDay: true, dueDay: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const allRules = await prisma.recurringRule.findMany({
    where: { userId },
    select: {
      id: true,
      description: true,
      kind: true,
      type: true,
      amountCents: true,
      dayOfMonth: true,
      active: true,
      accountId: true,
      creditCardId: true,
      lastMaterializedMonth: true,
      lastPaidMonth: true,
      createdAt: true,
      account: { select: { name: true } },
      creditCard: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const since = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const cardTransactions = []
  for (const card of cards) {
    const txns = await prisma.transaction.findMany({
      where: { userId, creditCardId: card.id, date: { gte: since } },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        recurringId: true,
        installmentGroupId: true,
        occurrenceMonth: true,
        transactionType: true,
      },
      orderBy: { date: 'asc' },
    })
    cardTransactions.push({
      cardId: card.id,
      cardName: card.name,
      transactions: txns.map((t) => ({
        id: t.id,
        description: t.description,
        transactionType: t.transactionType,
        amount: t.amount,
        date: t.date.toISOString().slice(0, 10),
        recurringId: t.recurringId,
        installationGroupId: t.installmentGroupId ?? null,
        occurrenceMonth: t.occurrenceMonth,
      })),
    })
  }

  const rules = await prisma.recurringRule.findMany({
    where: { userId, creditCardId: { not: null } },
    select: {
      id: true,
      description: true,
      kind: true,
      type: true,
      amountCents: true,
      dayOfMonth: true,
      active: true,
      categoryId: true,
      accountId: true,
      creditCardId: true,
      lastMaterializedMonth: true,
      lastPaidMonth: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const cardsMap = new Map(cards.map((c) => [c.id, c]))

  const statements = []
  for (const card of cards) {
    const entries = []
    const current = nextInvoiceWindow(card, now)
    for (let i = 0; i < 4; i++) {
      const due = new Date(current.dueDate)
      due.setMonth(due.getMonth() + i)
      const w = invoiceWindow(card, due)
      entries.push({
        label: w.monthKey,
        dueDate: w.dueDate.toISOString().slice(0, 10),
        windowStart: w.start.toISOString().slice(0, 10),
        windowEnd: w.end.toISOString().slice(0, 10),
        total: await computeInvoiceTotal(userId, card.id, w),
      })
    }
    statements.push({ id: card.id, name: card.name, statements: entries })
  }

  const ruleReports = []
  for (const rule of rules) {
    const card = cardsMap.get(rule.creditCardId!)
    const closing = card?.closingDay
    const months: Array<{ key: string; expectedDate: string }> = []
    if (closing && rule.dayOfMonth >= closing) {
      const cm = now.getMonth()
      const cy = now.getFullYear()
      const pm = cm === 0 ? 11 : cm - 1
      const py = cm === 0 ? cy - 1 : cy
      months.push({
        key: `${py}-${String(pm + 1).padStart(2, '0')}`,
        expectedDate: monthStart(py, pm, rule.dayOfMonth).toISOString().slice(0, 10),
      })
    }
    const effCurrent = closing
      ? Math.min(rule.dayOfMonth, lastDayOfMonth(now.getFullYear(), now.getMonth()))
      : rule.dayOfMonth
    if (now.getDate() >= effCurrent) {
      months.push({
        key: currentMonth,
        expectedDate: monthStart(now.getFullYear(), now.getMonth(), rule.dayOfMonth)
          .toISOString()
          .slice(0, 10),
      })
    }

    const txns = await prisma.transaction.findMany({
      where: { userId, recurringId: rule.id },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        occurrenceMonth: true,
        installmentGroupId: true,
        creditCardId: true,
        createdAt: true,
      },
      orderBy: { date: 'asc' },
    })

    const plan = []
    for (const m of months) {
      const existing = txns.find((t) => t.occurrenceMonth === m.key)
      plan.push({
        ...m,
        sentinelExpected: CARD_PAID_SENTINEL,
        existing: existing
          ? {
              id: existing.id,
              date: existing.date.toISOString().slice(0, 10),
              amount: existing.amount,
              creditCardId: existing.creditCardId,
              installmentGroupId: existing.installmentGroupId ?? null,
              fallsOnInvoice: invoiceLabelFor(cardsMap.get(rule.creditCardId!)!, existing.date),
            }
          : null,
      })
    }

    ruleReports.push({
      rule: {
        id: rule.id,
        description: rule.description,
        kind: rule.kind,
        type: rule.type,
        amountCents: rule.amountCents,
        dayOfMonth: rule.dayOfMonth,
        active: rule.active,
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        creditCard: card ? { id: card.id, name: card.name, closingDay: card.closingDay, dueDay: card.dueDay } : null,
        lastMaterializedMonth: rule.lastMaterializedMonth,
        lastPaidMonth: rule.lastPaidMonth,
        createdAt: rule.createdAt.toISOString(),
      },
      planForToday: plan,
      transactions: txns.map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        date: t.date.toISOString().slice(0, 10),
        occurrenceMonth: t.occurrenceMonth,
        installmentGroupId: t.installmentGroupId ?? null,
        fallsOnInvoice: invoiceLabelFor(cardsMap.get(rule.creditCardId!)!, t.date),
      })),
    })
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    nowDate: now.toISOString().slice(0, 10),
    currentMonth,
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      closingDay: c.closingDay,
      dueDay: c.dueDay,
      createdAt: c.createdAt.toISOString(),
    })),
    statements,
    allRules: allRules.map((r) => ({
      id: r.id,
      description: r.description,
      kind: r.kind,
      type: r.type,
      amountCents: r.amountCents,
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      account: r.account?.name ?? null,
      creditCard: r.creditCard?.name ?? null,
      lastMaterializedMonth: r.lastMaterializedMonth,
      lastPaidMonth: r.lastPaidMonth,
      createdAt: r.createdAt.toISOString(),
    })),
    cardTransactions,
    ruleReports,
  })
}