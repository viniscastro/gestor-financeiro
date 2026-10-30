type RateLimitEntry = { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

export interface RateLimitConfig {
  windowMs: number
  max: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): { ok: boolean; remaining: number; retryAfterMs: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { ok: true, remaining: config.max - 1, retryAfterMs: 0 }
  }

  entry.count++

  if (entry.count > config.max) {
    const retryAfterMs = entry.resetAt - now
    return { ok: false, remaining: 0, retryAfterMs }
  }

  return { ok: true, remaining: config.max - entry.count, retryAfterMs: 0 }
}

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 10 },
  api: { windowMs: 60 * 1000, max: 120 },
  upload: { windowMs: 60 * 1000, max: 10 },
  // Por conta, somando todos os IPs: atrapalha tentativas distribuídas sem
  // bloquear quem erra a senha algumas vezes.
  account: { windowMs: 15 * 60 * 1000, max: 20 },
} as const
