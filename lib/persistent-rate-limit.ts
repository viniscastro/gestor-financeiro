import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, type RateLimitConfig } from '@/lib/rate-limit'
import { clientIp } from '@/lib/with-rate-limit'

// Contador compartilhado entre as instâncias serverless, para fluxos sensíveis a
// tentativas repetidas. Se o banco ou a tabela não responderem, usa o limite em
// memória: a proteção enfraquece, mas o login continua disponível.
export async function consumeRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + config.windowMs)

  try {
    const [row] = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt}::timestamp)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= ${now}::timestamp THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now}::timestamp THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count"
    `

    if (Math.random() < 0.01) {
      await prisma.rateLimit.deleteMany({ where: { resetAt: { lte: now } } }).catch(() => {})
    }

    return row.count <= config.max
  } catch (err) {
    console.warn('[rate-limit] Usando limite em memória:', err instanceof Error ? err.message : err)
    return rateLimit(key, config).ok
  }
}

export async function withPersistentRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyPrefix: string
): Promise<NextResponse | null> {
  const ok = await consumeRateLimit(`${keyPrefix}:${clientIp(request)}`, config)
  if (ok) return null
  return NextResponse.json({ error: 'Muitas requisições. Tente novamente em breve.' }, { status: 429 })
}
