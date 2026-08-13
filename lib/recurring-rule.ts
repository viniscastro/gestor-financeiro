import { z } from 'zod'
import { TRANSACTION_TYPES } from '@/lib/categories'
import type { RecurringRuleDto, TransactionType } from '@/lib/types'
import { nextOccurrence } from '@/lib/recurring'

export const recurringRuleSchema = z.object({
  description: z.string().trim().min(1, 'Informe a descrição').max(100),
  amount: z.number().positive('O valor deve ser maior que zero'),
  type: z.enum(TRANSACTION_TYPES),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().min(1, 'Escolha a conta'),
  dayOfMonth: z.coerce
    .number()
    .int('Dia inválido')
    .min(1, 'Dia inválido')
    .max(31, 'Dia inválido'),
  notifyDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  active: z.boolean().optional(),
})

export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>

export function toRecurringRuleDto(rule: {
  id: string
  description: string
  amountCents: number
  type: string
  dayOfMonth: number
  active: boolean
  notifyDaysBefore: number
  accountId: string
  account: { name: string; color: string } | null
  categoryId: string | null
  category: { name: string; color: string } | null
}): RecurringRuleDto {
  return {
    id: rule.id,
    description: rule.description,
    amountCents: rule.amountCents,
    type: rule.type as TransactionType,
    categoryId: rule.categoryId,
    categoryName: rule.category?.name ?? null,
    categoryColor: rule.category?.color ?? null,
    accountId: rule.accountId,
    accountName: rule.account?.name ?? '',
    accountColor: rule.account?.color ?? '#10b981',
    dayOfMonth: rule.dayOfMonth,
    active: rule.active,
    notifyDaysBefore: rule.notifyDaysBefore,
    nextDate: nextOccurrence(rule.dayOfMonth, new Date()).toISOString(),
  }
}
