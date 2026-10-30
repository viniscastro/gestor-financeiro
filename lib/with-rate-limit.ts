import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, type RateLimitConfig, RATE_LIMITS } from '@/lib/rate-limit'

export { RATE_LIMITS }
export type { RateLimitConfig }

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}

export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyPrefix?: string
): NextResponse | null {
  const key = `${keyPrefix ?? 'api'}:${clientIp(request)}`
  const result = rateLimit(key, config)

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em breve.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  return null
}
