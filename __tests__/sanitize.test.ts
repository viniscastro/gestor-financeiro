import { describe, it, expect } from 'vitest'
import { sanitize, sanitizeObject } from '@/lib/sanitize'

describe('sanitize', () => {
  it('removes HTML tags', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('')
    expect(sanitize('<img src=x onerror=alert(1)>')).toBe('')
    expect(sanitize('<b>bold</b>')).toBe('bold')
  })

  it('preserves plain text', () => {
    expect(sanitize('Aluguel')).toBe('Aluguel')
    expect(sanitize('R$ 1.500,00')).toBe('R$ 1.500,00')
    expect(sanitize('Netflix - assinatura')).toBe('Netflix - assinatura')
  })

  it('handles empty and special strings', () => {
    expect(sanitize('')).toBe('')
    expect(sanitize('<')).toBe('&lt;')
    expect(sanitize('>')).toBe('>')
    expect(sanitize('&amp;')).toBe('&amp;')
  })
})

describe('sanitizeObject', () => {
  it('sanitizes string values in objects', () => {
    const input = {
      name: '<script>alert(1)</script>Aluguel',
      amount: 1500,
      desc: 'Teste <b>normal</b>',
    }
    const result = sanitizeObject(input)

    expect(result.name).toBe('Aluguel')
    expect(result.amount).toBe(1500)
    expect(result.desc).toBe('Teste normal')
  })

  it('does not modify non-string values', () => {
    const input = { num: 42, bool: true, arr: [1, 2, 3] }
    const result = sanitizeObject(input)

    expect(result.num).toBe(42)
    expect(result.bool).toBe(true)
    expect(result.arr).toEqual([1, 2, 3])
  })
})
