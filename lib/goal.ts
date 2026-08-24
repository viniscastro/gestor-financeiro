import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { monthKey } from '@/lib/recurring'
import type { SavingsGoalDto } from '@/lib/types'

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da meta').max(60),
  icon: z.string().max(10).nullable().optional(),
  targetAmount: z.number().positive('O valor da meta deve ser maior que zero'),
  currentAmount: z.number().min(0).default(0),
  accountId: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  autoContributeAmount: z.number().positive().nullable().optional(),
  autoContributeDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  autoContributeAccountId: z.string().nullable().optional(),
})

export const goalPatchSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da meta').max(60).optional(),
  icon: z.string().max(10).nullable().optional(),
  targetAmount: z.number().positive('O valor da meta deve ser maior que zero').optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().nullable().optional(),
  autoContributeAmount: z.number().positive().nullable().optional(),
  autoContributeDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  autoContributeAccountId: z.string().nullable().optional(),
})

export type GoalInput = z.infer<typeof goalSchema>
export type GoalPatch = z.infer<typeof goalPatchSchema>

export function toGoalDto(goal: {
  id: string
  name: string
  icon?: string | null
  targetAmount: number
  currentAmount: number
  targetDate: Date | null
  autoContributeAmount?: number | null
  autoContributeDayOfMonth?: number | null
  autoContributeAccountId?: string | null
  autoLastMaterializedMonth?: string | null
}): SavingsGoalDto {
  const current = Math.max(0, goal.currentAmount)

  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon ?? null,
    targetAmount: goal.targetAmount,
    currentAmount: current,
    percent: goal.targetAmount > 0 ? Math.round((current / goal.targetAmount) * 100) : 0,
    targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
    autoContributeAmount: goal.autoContributeAmount ?? null,
    autoContributeDayOfMonth: goal.autoContributeDayOfMonth ?? null,
    autoContributeAccountId: goal.autoContributeAccountId ?? null,
  }
}

let columnsReady = false

async function ensureAutoContributeColumns() {
  if (columnsReady) return
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoContributeAmount" INTEGER;
      ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoContributeDayOfMonth" INTEGER;
      ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoContributeAccountId" TEXT;
      ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoLastMaterializedMonth" TEXT;
    `)
    columnsReady = true
  } catch {
    columnsReady = true
  }
}

export async function materializeGoalContributions(userId: string): Promise<void> {
  await ensureAutoContributeColumns()

  const goals = await prisma.savingsGoal.findMany({
    where: {
      userId,
      autoContributeAmount: { not: null },
      autoContributeDayOfMonth: { not: null },
      autoContributeAccountId: { not: null },
    },
  })
  if (goals.length === 0) return

  const now = new Date()
  const key = monthKey(now)

  for (const goal of goals) {
    if (!goal.autoContributeAmount || !goal.autoContributeDayOfMonth || !goal.autoContributeAccountId) continue
    if (goal.autoLastMaterializedMonth === key) continue
    if (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount) continue

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const day = Math.min(goal.autoContributeDayOfMonth, lastDay)
    const date = new Date(now.getFullYear(), now.getMonth(), day)

    const amount = Math.min(goal.autoContributeAmount, goal.targetAmount - goal.currentAmount)

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          accountId: goal.autoContributeAccountId,
          transactionType: 'EXPENSE',
          description: `Aporte automático: ${goal.name}`,
          amount,
          date,
        },
      }),
      prisma.savingsGoal.update({
        where: { id: goal.id },
        data: {
          currentAmount: { increment: amount },
          autoLastMaterializedMonth: key,
        },
      }),
    ])
  }
}
