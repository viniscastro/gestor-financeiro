import { describe, it, expect } from 'vitest'
import { formatBRL, formatCentsPtBR, toCsv } from '@/lib/format'

describe('formatBRL', () => {
  it('formats cents to BRL currency', () => {
    const result = formatBRL(150000)
    expect(result).toMatch(/^R\$\s1\.500,00$/)
    expect(formatBRL(0)).toMatch(/^R\$\s0,00$/)
    expect(formatBRL(100)).toMatch(/^R\$\s1,00$/)
    expect(formatBRL(99)).toMatch(/^R\$\s0,99$/)
  })
})

describe('formatCentsPtBR', () => {
  it('formats cents to pt-BR decimal', () => {
    expect(formatCentsPtBR(150000)).toBe('1500,00')
    expect(formatCentsPtBR(0)).toBe('0,00')
    expect(formatCentsPtBR(1050)).toBe('10,50')
  })
})

describe('toCsv', () => {
  it('generates CSV with semicolon separator', () => {
    const csv = toCsv(['Name', 'Value'], [['Test', 100]])
    expect(csv).toBe('Name;Value\r\nTest;100')
  })

  it('escapes values with quotes', () => {
    const csv = toCsv(['Desc'], [['He said "hello"']])
    expect(csv).toContain('"He said ""hello"""')
  })

  it('escapes values with newlines', () => {
    const csv = toCsv(['Desc'], [['line1\nline2']])
    expect(csv).toContain('"line1\nline2"')
  })
})
