import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendVerificationCode } from '@/lib/email'
import { generateVerificationCode, CODE_TTL_MS } from '@/lib/verification'
import { ensureDefaultData } from '@/lib/defaults'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Este e-mail já está cadastrado' },
      { status: 409 }
    )
  }

  const code = generateVerificationCode()
  const passwordHash = await bcrypt.hash(password, 10)
  const codeHash = await bcrypt.hash(code, 10)
  const now = new Date()

  const created = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: passwordHash,
      emailVerified: null,
      verificationCode: codeHash,
      verificationExpires: new Date(now.getTime() + CODE_TTL_MS),
      verificationSentAt: now,
    },
  })

  await ensureDefaultData(created.id)

  try {
    await sendVerificationCode(normalizedEmail, code)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    await prisma.user.deleteMany({ where: { email: normalizedEmail } })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: normalizedEmail }, { status: 201 })
}
