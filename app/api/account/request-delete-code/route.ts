import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateVerificationCode, storeDeleteCode, RESEND_COOLDOWN_MS } from '@/lib/verification'
import { sendDeleteAccountCode } from '@/lib/email'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.auth, 'request-delete-code')
  if (rateLimited) return rateLimited

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  if (user.deleteCodeSentAt) {
    const elapsed = Date.now() - user.deleteCodeSentAt.getTime()
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: `Aguarde ${waitSeconds}s para reenviar o código.` },
        { status: 429 }
      )
    }
  }

  const code = generateVerificationCode()
  await storeDeleteCode(user.id, code)

  try {
    await sendDeleteAccountCode(user.email, code)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
