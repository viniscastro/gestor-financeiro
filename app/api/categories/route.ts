import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { categorySchema, toCategoryDto } from '@/lib/category'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(categories.map(toCategoryDto))
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

  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, type, color, icon } = parsed.data

  const existing = await prisma.category.findUnique({
    where: {
      userId_name_type: {
        userId: session.user.id,
        name,
        type,
      },
    },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Já existe uma categoria com este nome' },
      { status: 409 }
    )
  }

  const category = await prisma.category.create({
    data: {
      userId: session.user.id,
      name,
      type,
      color,
      icon,
    },
  })

  return NextResponse.json(toCategoryDto(category), { status: 201 })
}
