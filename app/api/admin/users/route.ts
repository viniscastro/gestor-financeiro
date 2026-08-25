import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { transactions: true, accounts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { userId, role } = body as { userId?: string; role?: string }

  if (!userId || !['USER', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Não é possível alterar seu próprio papel' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  await prisma.user.update({ where: { id: userId }, data: { role: role! } })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Não é possível deletar a si mesmo' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ ok: true })
}
