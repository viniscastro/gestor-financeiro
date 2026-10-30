import { describe, it, expect } from 'vitest'
import { monthKey, startOfDay, nextOccurrence, daysUntil } from '@/lib/recurring'

describe('monthKey', () => {
  it('returns YYYY-MM format', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01')
    expect(monthKey(new Date(2026, 11, 1))).toBe('2026-12')
    expect(monthKey(new Date(2026, 8, 30))).toBe('2026-09')
  })

  it('pads single digit months', () => {
    expect(monthKey(new Date(2026, 0, 1))).toBe('2026-01')
    expect(monthKey(new Date(2026, 2, 15))).toBe('2026-03')
  })
})

describe('startOfDay', () => {
  it('sets time to 00:00:00', () => {
    const date = new Date(2026, 7, 18, 14, 30, 45)
    const result = startOfDay(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('preserves the date', () => {
    const date = new Date(2026, 7, 18)
    const result = startOfDay(date)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(18)
  })
})

describe('nextOccurrence', () => {
  it('returns current month if day has not passed', () => {
    const from = new Date(2026, 7, 10)
    const result = nextOccurrence(15, from)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(15)
  })

  it('returns next month if day has passed', () => {
    const from = new Date(2026, 7, 20)
    const result = nextOccurrence(15, from)
    expect(result.getMonth()).toBe(8)
    expect(result.getDate()).toBe(15)
  })

  it('clamps to last day of month', () => {
    const from = new Date(2026, 1, 1)
    const result = nextOccurrence(31, from)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(28)
  })

  it('clamps when rolling over to a shorter month', () => {
    const result = nextOccurrence(31, new Date(2026, 0, 31))
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(28)
  })
})

describe('daysUntil', () => {
  it('returns 0 for same day', () => {
    const date = new Date(2026, 7, 18)
    expect(daysUntil(date, date)).toBe(0)
  })

  it('returns positive for future', () => {
    const from = new Date(2026, 7, 18)
    const target = new Date(2026, 7, 25)
    expect(daysUntil(target, from)).toBe(7)
  })

  it('returns negative for past', () => {
    const from = new Date(2026, 7, 25)
    const target = new Date(2026, 7, 18)
    expect(daysUntil(target, from)).toBe(-7)
  })
})
