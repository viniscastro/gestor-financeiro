import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { creditCardSchema, toCreditCardDto } from '@/lib/cards'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params
  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!card) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = creditCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const data = parsed.data

  const updated = await prisma.creditCard.update({
    where: { id },
    data: {
      name: data.name,
      last4: data.last4 ?? null,
      creditLimit: Math.round(data.creditLimit * 100),
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      color: data.color,
    },
  })

  return NextResponse.json(toCreditCardDto(updated))
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params
  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!card) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.creditCardStatement.deleteMany({ where: { cardId: id } }),
    prisma.transaction.updateMany({ where: { creditCardId: id }, data: { creditCardId: null } }),
    prisma.creditCard.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
