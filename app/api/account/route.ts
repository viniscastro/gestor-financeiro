import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
  }

  await prisma.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
