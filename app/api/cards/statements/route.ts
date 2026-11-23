import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listStatements } from '@/lib/cards'
import { cleanupCardRecurringTransactions } from '@/lib/recurring'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Remove pré-gerações antigas para não inflar faturas futuras.
  await cleanupCardRecurringTransactions(session.user.id)

  const statements = await listStatements(session.user.id, new Date(), 6)
  return NextResponse.json(statements)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { statementId, paid } = body as { statementId?: string; paid?: boolean }

  if (!statementId) {
    return NextResponse.json({ error: 'statementId é obrigatório' }, { status: 400 })
  }
  // A fatura só muda de status por ação explícita: `paid` precisa vir como
  // booleano (nunca assume "paga" por omissão).
  if (typeof paid !== 'boolean') {
    return NextResponse.json({ error: 'paid deve ser true ou false' }, { status: 400 })
  }

  const stmt = await prisma.creditCardStatement.findFirst({
    where: { id: statementId, userId: session.user.id },
  })
  if (!stmt) {
    return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })
  }

  const now = new Date()
  await prisma.creditCardStatement.update({
    where: { id: stmt.id },
    data: {
      status: paid ? 'PAID' : 'OPEN',
      paidAt: paid ? now : null,
    },
  })

  return NextResponse.json({ ok: true, status: paid ? 'PAID' : 'OPEN' })
}
