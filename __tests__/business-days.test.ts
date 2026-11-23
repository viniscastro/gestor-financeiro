import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { easterSunday, isBusinessDay, nextBusinessDay } from '@/lib/business-days'
import { invoiceWindow, invoiceWindowForMonth, nextInvoiceWindow } from '@/lib/cards'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('business days', () => {
  it('computes Easter', () => {
    expect(ymd(easterSunday(2025))).toBe('2025-04-20')
    expect(ymd(easterSunday(2026))).toBe('2026-04-05')
    expect(ymd(easterSunday(2027))).toBe('2027-03-28')
  })

  it('keeps a business day unchanged', () => {
    expect(ymd(nextBusinessDay(new Date(2026, 10, 23)))).toBe('2026-11-23') // segunda
  })

  it('moves weekends to Monday', () => {
    expect(ymd(nextBusinessDay(new Date(2026, 10, 21)))).toBe('2026-11-23') // sábado
    expect(ymd(nextBusinessDay(new Date(2026, 10, 22)))).toBe('2026-11-23') // domingo
  })

  it('skips national holidays', () => {
    expect(isBusinessDay(new Date(2026, 8, 7))).toBe(false) // Independência (segunda)
    expect(ymd(nextBusinessDay(new Date(2026, 8, 7)))).toBe('2026-09-08')
    expect(ymd(nextBusinessDay(new Date(2026, 10, 20)))).toBe('2026-11-23') // Consciência Negra (sexta)
    expect(ymd(nextBusinessDay(new Date(2026, 11, 25)))).toBe('2026-12-28') // Natal (sexta)
  })

  it('skips Carnival, Good Friday and Corpus Christi', () => {
    expect(ymd(nextBusinessDay(new Date(2026, 1, 16)))).toBe('2026-02-18') // seg/ter de Carnaval
    expect(ymd(nextBusinessDay(new Date(2026, 3, 3)))).toBe('2026-04-06') // Sexta-feira Santa
    expect(ymd(nextBusinessDay(new Date(2026, 5, 4)))).toBe('2026-06-05') // Corpus Christi
  })
})

describe('card due date', () => {
  const card = { closingDay: 3, dueDay: 10 }

  it('postpones the due date and keeps the monthKey', () => {
    // 10/01/2027 é domingo
    const w = invoiceWindowForMonth(card, '2027-01')
    expect(w.monthKey).toBe('2027-01')
    expect(ymd(w.dueDate)).toBe('2027-01-11')
  })

  it('can move the due date into the next month', () => {
    const w = invoiceWindow({ closingDay: 20, dueDay: 28 }, new Date(2026, 1, 1)) // 28/02/2026 sábado
    expect(w.monthKey).toBe('2026-02')
    expect(ymd(w.dueDate)).toBe('2026-03-02')
  })

  it('keeps a postponed invoice current until its adjusted due date', () => {
    const c = { closingDay: 20, dueDay: 28 }
    expect(nextInvoiceWindow(c, new Date(2026, 2, 1, 10)).monthKey).toBe('2026-02')
    expect(nextInvoiceWindow(c, new Date(2026, 2, 3, 10)).monthKey).toBe('2026-03')
  })
})
