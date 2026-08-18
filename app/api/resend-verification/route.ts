import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendVerificationCode } from '@/lib/email'
import {
  generateVerificationCode,
  storeVerificationCode,
  RESEND_COOLDOWN_MS,
} from '@/lib/verification'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

const resendSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
})

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.auth, 'resend-verification')
  if (rateLimited) return rateLimited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = resendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'Usuário não encontrado. Faça o cadastro primeiro.' },
      { status: 404 }
    )
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: 'Este e-mail já foi confirmado.' },
      { status: 400 }
    )
  }

  if (user.verificationSentAt) {
    const elapsed = Date.now() - user.verificationSentAt.getTime()
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: `Aguarde ${waitSeconds}s para reenviar o código.` },
        { status: 429 }
      )
    }
  }

  const code = generateVerificationCode()
  await storeVerificationCode(user.id, code)

  try {
    await sendVerificationCode(normalizedEmail, code)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
