import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { creditCardSchema, toCreditCardDto } from '@/lib/cards'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId: session.user.id },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(cards.map(toCreditCardDto))
}

export async function PATCH(request: NextRequest) {
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

  const { ids } = body as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids é obrigatório' }, { status: 400 })
  }

  const owned = await prisma.creditCard.findMany({
    where: { userId: session.user.id, id: { in: ids } },
    select: { id: true },
  })
  if (owned.length !== ids.length) {
    return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.creditCard.update({ where: { id }, data: { position: index } })
    )
  )

  return NextResponse.json({ ok: true })
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

  const parsed = creditCardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const data = parsed.data

  const maxPos = await prisma.creditCard.aggregate({
    where: { userId: session.user.id },
    _max: { position: true },
  })
  const nextPosition = (maxPos._max.position ?? -1) + 1

  const card = await prisma.creditCard.create({
    data: {
      userId: session.user.id,
      name: data.name,
      last4: data.last4 ?? null,
      creditLimit: Math.round(data.creditLimit * 100),
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      color: data.color,
      position: nextPosition,
    },
  })

  return NextResponse.json(toCreditCardDto(card), { status: 201 })
}
