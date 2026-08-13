import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { amountToCents } from '@/lib/transactions'
import { accountSchema, toAccountDto } from '@/lib/accounts'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = accountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, type, color, initialBalance } = parsed.data

  try {
    const account = await prisma.account.update({
      where: { id, userId: session.user.id },
      data: {
        name,
        type,
        color,
        initialBalance: amountToCents(initialBalance),
      },
    })
    return NextResponse.json(toAccountDto(account))
  } catch {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  const txCount = await prisma.transaction.count({
    where: { userId: session.user.id, accountId: id },
  })
  if (txCount > 0) {
    return NextResponse.json(
      { error: 'Exclua ou mova as transações desta conta antes de removê-la' },
      { status: 400 }
    )
  }

  const ruleCount = await prisma.recurringRule.count({
    where: { userId: session.user.id, accountId: id },
  })
  if (ruleCount > 0) {
    return NextResponse.json(
      { error: 'Exclua as contas recorrentes desta conta antes de removê-la' },
      { status: 400 }
    )
  }

  try {
    await prisma.account.delete({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }
}
