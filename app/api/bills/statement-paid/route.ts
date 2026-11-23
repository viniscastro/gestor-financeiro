import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeInvoiceTotal, invoiceWindowForMonth } from '@/lib/cards'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { statementId, accountId } = body as {
    statementId?: string
    accountId?: string | null
  }
  if (!statementId) {
    return NextResponse.json({ error: 'statementId é obrigatório' }, { status: 400 })
  }

  const stmt = await prisma.creditCardStatement.findFirst({
    where: { id: statementId, userId: session.user.id },
    include: {
      card: { select: { id: true, name: true, closingDay: true, dueDay: true } },
    },
  })
  if (!stmt) {
    return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })
  }
  if (stmt.status === 'PAID') {
    return NextResponse.json({ error: 'Esta fatura já está paga' }, { status: 400 })
  }

  let debitTx = false
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
      select: { id: true },
    })
    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }
    debitTx = true
  }

  await prisma.$transaction(async (tx) => {
    await tx.creditCardStatement.update({
      where: { id: stmt.id },
      data: { status: 'PAID', paidAt: new Date() },
    })

    if (debitTx) {
      const window = invoiceWindowForMonth(stmt.card, stmt.monthKey)
      const total = await computeInvoiceTotal(session.user!.id, stmt.card.id, window)
      if (total > 0) {
        const [yy, mm] = stmt.monthKey.split('-')
        await tx.transaction.create({
          data: {
            transactionType: 'EXPENSE',
            description: `Pagamento fatura ${stmt.card.name} ${mm}/${yy}`,
            amount: total,
            date: new Date(),
            userId: session.user!.id,
            accountId: accountId!,
            creditCardId: null,
            categoryId: null,
          },
        })
      }
    }
  })

  return NextResponse.json({ ok: true })
}
