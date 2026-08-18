import { z } from 'zod'
import type { SavingsGoalDto } from '@/lib/types'

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da meta').max(60),
  targetAmount: z.number().positive('O valor da meta deve ser maior que zero'),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().nullable().optional(),
})

export const goalPatchSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da meta').max(60).optional(),
  targetAmount: z.number().positive('O valor da meta deve ser maior que zero').optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().nullable().optional(),
})

export type GoalInput = z.infer<typeof goalSchema>
export type GoalPatch = z.infer<typeof goalPatchSchema>

export function toGoalDto(goal: {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: Date | null
}): SavingsGoalDto {
  const current = Math.max(0, goal.currentAmount)

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: current,
    percent: goal.targetAmount > 0 ? Math.round((current / goal.targetAmount) * 100) : 0,
    targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
  }
}
