import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findParentProblem } from '@/lib/category-parent'
import { categorySchema, toCategoryDto } from '@/lib/category'

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

  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { name, type, color, icon, parentId } = parsed.data

  if (parentId) {
    const problem = await findParentProblem({ userId: session.user.id, parentId, type, categoryId: id })
    if (problem) {
      return NextResponse.json({ error: problem.error }, { status: problem.status })
    }
  }

  try {
    const category = await prisma.category.update({
      where: { id, userId: session.user.id },
      data: { name, type, color, icon, parentId: parentId ?? null },
    })
    return NextResponse.json(toCategoryDto(category))
  } catch {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  try {
    await prisma.category.delete({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }
}
