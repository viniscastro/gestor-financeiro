import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toGoalDto } from '@/lib/goal'
import { amountToCents } from '@/lib/transactions'

const topupSchema = z.object({
  goalId: z.string().min(1, 'Selecione uma meta'),
  amount: z.number().positive('Informe um valor maior que zero'),
  accountId: z.string().min(1, 'Selecione uma conta'),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Params) {
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

  const parsed = topupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const { amount, accountId } = parsed.data
  const amountCents = amountToCents(amount)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, userId: session.user!.id },
      })
      if (!account) throw new Error('Conta não encontrada')

      const goal = await tx.savingsGoal.findFirst({
        where: { id, userId: session.user!.id },
      })
      if (!goal) throw new Error('Meta não encontrada')

      await tx.transaction.create({
        data: {
          userId: session.user!.id,
          accountId,
          transactionType: 'EXPENSE',
          description: `Aporte: ${goal.name}`,
          amount: amountCents,
          date: new Date(),
        },
      })

      const updatedGoal = await tx.savingsGoal.update({
        where: { id },
        data: { currentAmount: { increment: amountCents } },
      })

      return updatedGoal
    })

    return NextResponse.json(toGoalDto(result))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao adicionar saldo'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
