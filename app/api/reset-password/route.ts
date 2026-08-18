import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

const resetSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  code: z.string().trim().regex(/^\d{6}$/, 'Código inválido'),
  newPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request, RATE_LIMITS.auth, 'reset-password')
  if (rateLimited) return rateLimited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { email, code, newPassword } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (
    !user ||
    !user.resetCode ||
    !user.resetExpires
  ) {
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

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: passwordHash,
      emailVerified: new Date(),
      resetCode: null,
      resetExpires: null,
      resetSentAt: null,
    },
  })

  return NextResponse.json({ ok: true })
}
