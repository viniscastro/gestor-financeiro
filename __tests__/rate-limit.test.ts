import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    // Clean up by creating entries that will expire
    rateLimit('cleanup:test', { windowMs: 1, max: 1 })
  })

  it('allows requests within limit', () => {
    const result = rateLimit('test:user1', { windowMs: 60000, max: 5 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks requests over limit', () => {
    const key = 'test:burst'
    const config = { windowMs: 60000, max: 3 }

    rateLimit(key, config)
    rateLimit(key, config)
    rateLimit(key, config)
    const result = rateLimit(key, config)

    expect(result.ok).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after window expires', async () => {
    const key = 'test:expire'
    const config = { windowMs: 100, max: 1 }

    rateLimit(key, config)
    const blocked = rateLimit(key, config)
    expect(blocked.ok).toBe(false)

    await new Promise((r) => setTimeout(r, 150))

    const after = rateLimit(key, config)
    expect(after.ok).toBe(true)
  })

  it('tracks different keys independently', () => {
    const config = { windowMs: 60000, max: 1 }

    rateLimit('key:a', config)
    const a = rateLimit('key:a', config)
    const b = rateLimit('key:b', config)

    expect(a.ok).toBe(false)
    expect(b.ok).toBe(true)
  })
})
