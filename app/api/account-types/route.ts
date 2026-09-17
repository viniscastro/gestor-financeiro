import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { accountTypeSchema, slugify, toAccountTypeDto, ensureAccountTypeTable } from '@/lib/account-types'
import { DEFAULT_ACCOUNT_TYPES } from '@/lib/categories'

async function ensureUserAccountTypes(userId: string): Promise<void> {
  await ensureAccountTypeTable()

  const count = await prisma.accountType.count({ where: { userId } })
  if (count === 0) {
    await prisma.accountType.createMany({
      data: DEFAULT_ACCOUNT_TYPES.map((t, i) => ({
        id: `at_${userId}_${t.slug}`,
        userId,
        slug: t.slug,
        name: t.name,
        color: t.color,
        icon: t.icon,
        position: i,
      })),
    })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await ensureUserAccountTypes(session.user.id)

  const types = await prisma.accountType.findMany({
    where: { userId: session.user.id },
    orderBy: { position: 'asc' },
  })

  return NextResponse.json(types.map(toAccountTypeDto))
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await ensureUserAccountTypes(session.user.id)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const parsed = accountTypeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, color, icon } = parsed.data
  const slug = slugify(name)

  const existing = await prisma.accountType.findUnique({
    where: { userId_slug: { userId: session.user.id, slug } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Já existe um tipo com este nome' },
      { status: 409 }
    )
  }

  const maxPos = await prisma.accountType.aggregate({
    where: { userId: session.user.id },
    _max: { position: true },
  })

  const type = await prisma.accountType.create({
    data: {
      userId: session.user.id,
      slug,
      name: name.trim(),
      color,
      icon,
      position: (maxPos._max.position ?? -1) + 1,
    },
  })

  return NextResponse.json(toAccountTypeDto(type), { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await ensureUserAccountTypes(session.user.id)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { ids } = body as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const updates = ids.map((id, index) =>
    prisma.accountType.update({
      where: { id, userId: session.user.id },
      data: { position: index },
    })
  )

  await prisma.$transaction(updates)

  return NextResponse.json({ ok: true })
}