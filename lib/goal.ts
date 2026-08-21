import { z } from 'zod'
import type { SavingsGoalDto } from '@/lib/types'

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da meta').max(60),
  icon: z.string().max(10).nullable().optional(),
  targetAmount: z.number().positive('O valor da meta deve ser maior que zero'),
  currentAmount: z.number().min(0).default(0),
  accountId: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
})

export const goalPatchSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da meta').max(60).optional(),
  icon: z.string().max(10).nullable().optional(),
  targetAmount: z.number().positive('O valor da meta deve ser maior que zero').optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().nullable().optional(),
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
  }
}
