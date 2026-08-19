import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const deleteSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Código inválido'),
})

export async function DELETE(request: NextRequest) {
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

  if (user.password) {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Informe sua senha para confirmar a exclusão' },
        { status: 400 }
      )
    }

    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      const password =
        typeof body === 'object' && body !== null && 'password' in body
          ? String((body as { password?: unknown }).password ?? '')
          : ''

      if (!password) {
        return NextResponse.json(
          { error: 'Informe sua senha para confirmar a exclusão' },
          { status: 400 }
        )
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 400 })
      }
    } else {
      if (!user.deleteCode || !user.deleteCodeExpires) {
        return NextResponse.json(
          { error: 'Código inválido ou expirado. Solicite um novo.' },
          { status: 400 }
        )
      }
      if (user.deleteCodeExpires.getTime() < Date.now()) {
        return NextResponse.json(
          { error: 'Código expirado. Solicite um novo.' },
          { status: 410 }
        )
      }
      const valid = await bcrypt.compare(parsed.data.code, user.deleteCode)
      if (!valid) {
        return NextResponse.json(
          { error: 'Código incorreto. Verifique e tente novamente.' },
          { status: 400 }
        )
      }
    }
  } else {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Informe o código para confirmar a exclusão' },
        { status: 400 }
      )
    }

    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Informe um código de 6 dígitos válido' },
        { status: 400 }
      )
    }

    if (!user.deleteCode || !user.deleteCodeExpires) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado. Solicite um novo.' },
        { status: 400 }
      )
    }
    if (user.deleteCodeExpires.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Código expirado. Solicite um novo.' },
        { status: 410 }
      )
    }
    const valid = await bcrypt.compare(parsed.data.code, user.deleteCode)
    if (!valid) {
      return NextResponse.json(
        { error: 'Código incorreto. Verifique e tente novamente.' },
        { status: 400 }
      )
    }
  }

  await prisma.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
