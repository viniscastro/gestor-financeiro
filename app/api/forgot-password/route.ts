import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetCode } from '@/lib/email'
import {
  generateVerificationCode,
  storeResetCode,
  RESEND_COOLDOWN_MS,
} from '@/lib/verification'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

const forgotSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
})

export async function POST(request: NextRequest) {
  try {
    const rateLimited = withRateLimit(request, RATE_LIMITS.auth, 'forgot-password')
    if (rateLimited) return rateLimited

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const parsed = forgotSchema.safeParse(body)
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

    // Não revelar se o e-mail existe: para e-mails desconhecidos também retorna ok.
    if (!user || !user.password) {
      return NextResponse.json({ ok: true })
    }

    if (user.resetSentAt) {
      const elapsed = Date.now() - user.resetSentAt.getTime()
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
        return NextResponse.json(
          { error: `Aguarde ${waitSeconds}s para reenviar o código.` },
          { status: 429 }
        )
      }
    }

    const code = generateVerificationCode()
    await storeResetCode(user.id, code)

    try {
      await sendPasswordResetCode(normalizedEmail, code)
    } catch {
      console.error(`[forgot-password] Falha ao enviar e-mail para ${normalizedEmail}. Código: ${code}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[forgot-password] Erro inesperado:', message)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
