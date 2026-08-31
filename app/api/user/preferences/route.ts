import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true, dashboardCards: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    theme: user.theme,
    dashboardCards: user.dashboardCards ? JSON.parse(user.dashboardCards) : null,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (body.theme !== undefined) {
    if (body.theme !== 'light' && body.theme !== 'dark') {
      return NextResponse.json({ error: 'Tema inválido' }, { status: 400 })
    }
    data.theme = body.theme
  }

  if (body.dashboardCards !== undefined) {
    if (!Array.isArray(body.dashboardCards)) {
      return NextResponse.json({ error: 'Cards inválidos' }, { status: 400 })
    }
    data.dashboardCards = JSON.stringify(body.dashboardCards)
  }

  if (body.monthlyReport !== undefined) {
    data.monthlyReport = Boolean(body.monthlyReport)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  })

  return NextResponse.json({ ok: true })
}
