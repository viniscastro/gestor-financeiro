import { z } from 'zod'
import type { BudgetDto } from '@/lib/types'
import { prisma } from '@/lib/prisma'

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Escolha a categoria'),
  amount: z.number().positive('O valor deve ser maior que zero'),
})

export type BudgetInput = z.infer<typeof budgetSchema>

export async function computeSpent(userId: string, categoryId: string): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      transactionType: 'EXPENSE',
      categoryId,
      date: { gte: startOfMonth },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0
}

export function toBudgetDto(budget: {
  id: string
  categoryId: string
  amountCents: number
  category: { name: string; color: string }
  spent?: number
}): BudgetDto {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    categoryColor: budget.category.color,
    amountCents: budget.amountCents,
    spent: budget.spent ?? 0,
  }
}
