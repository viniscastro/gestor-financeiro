import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const verifySchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  code: z.string().trim().regex(/^\d{6}$/, 'Código inválido'),
})

export async function POST(request: NextRequest) {
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

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'Código inválido ou expirado. Solicite um novo.' },
      { status: 400 }
    )
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true })
  }

  if (!user.verificationCode || !user.verificationExpires) {
    return NextResponse.json(
      { error: 'Código inválido ou expirado. Solicite um novo.' },
      { status: 400 }
    )
  }

  if (user.verificationExpires.getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'Código expirado. Solicite um novo.' },
      { status: 410 }
    )
  }

  const valid = await bcrypt.compare(code, user.verificationCode)
  if (!valid) {
    return NextResponse.json(
      { error: 'Código incorreto. Verifique e tente novamente.' },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationCode: null,
      verificationExpires: null,
    },
  })

  return NextResponse.json({ ok: true })
}
