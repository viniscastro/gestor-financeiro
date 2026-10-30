import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'
import { rateLimit } from '@/lib/rate-limit'

const verifySchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  code: z.string().trim().regex(/^\d{6}$/, 'Código inválido'),
})

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.auth, 'verify-reset-code')
  if (rateLimited) return rateLimited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { email, code } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const emailLimit = rateLimit(`reset-code:${normalizedEmail}`, RATE_LIMITS.auth)
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Solicite um novo código em alguns minutos.' },
      { status: 429 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user || !user.resetCode || !user.resetExpires) {
    return NextResponse.json(
      { error: 'Código inválido ou expirado. Solicite um novo.' },
      { status: 400 }
    )
  }

  if (user.resetExpires.getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'Código expirado. Solicite um novo.' },
      { status: 400 }
    )
  }

  const valid = await bcrypt.compare(code, user.resetCode)
  if (!valid) {
    return NextResponse.json(
      { error: 'Código incorreto. Verifique e tente novamente.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
