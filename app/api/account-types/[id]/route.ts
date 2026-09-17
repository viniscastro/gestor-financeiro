import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { accountTypeSchema, toAccountTypeDto, ensureAccountTypeTable } from '@/lib/account-types'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  await ensureAccountTypeTable()

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

  try {
    const type = await prisma.accountType.update({
      where: { id, userId: session.user.id },
      data: { name: name.trim(), color, icon },
    })
    return NextResponse.json(toAccountTypeDto(type))
  } catch {
    return NextResponse.json({ error: 'Tipo não encontrado' }, { status: 404 })
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params

  await ensureAccountTypeTable()

  const type = await prisma.accountType.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, slug: true },
  })
  if (!type) {
    return NextResponse.json({ error: 'Tipo não encontrado' }, { status: 404 })
  }

  const inUse = await prisma.account.count({
    where: { userId: session.user.id, type: type.slug },
  })
  if (inUse > 0) {
    return NextResponse.json(
      { error: `Este tipo está em uso por ${inUse} conta(s). Edite as contas antes de excluir.` },
      { status: 400 }
    )
  }

  await prisma.accountType.delete({
    where: { id },
  })

  return NextResponse.json({ ok: true })
}