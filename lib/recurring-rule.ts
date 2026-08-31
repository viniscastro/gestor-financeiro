import { z } from 'zod'
import { TRANSACTION_TYPES } from '@/lib/categories'
import type { RecurringKind, RecurringRuleDto, TransactionType } from '@/lib/types'
import { nextOccurrenceStr } from '@/lib/recurring'

const base = {
  description: z.string().trim().min(1, 'Informe a descrição').max(100),
  amount: z.number().positive('O valor deve ser maior que zero'),
  dayOfMonth: z.coerce
    .number()
    .int('Dia inválido')
    .min(1, 'Dia inválido')
    .max(31, 'Dia inválido'),
  active: z.boolean().optional(),
}

export const recurringRuleSchema = z.discriminatedUnion('kind', [
  z.object({
    ...base,
    kind: z.literal('TRANSACTION'),
    type: z.enum(TRANSACTION_TYPES),
    accountId: z.string().nullable().optional(),
    creditCardId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    notifyDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  }),
  z.object({
    ...base,
    kind: z.literal('TRANSFER'),
    fromAccountId: z.string().min(1, 'Escolha a conta de origem'),
    toAccountId: z.string().min(1, 'Escolha a conta de destino'),
    notifyDaysBefore: z.coerce.number().int().min(0).max(30).default(0),
  }),
])

export const recurringRulePatchSchema = z.object({
  kind: z.enum(['TRANSACTION', 'TRANSFER']).optional(),
  description: z.string().trim().min(1, 'Informe a descrição').max(100).optional(),
  amount: z.number().positive('O valor deve ser maior que zero').optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  accountId: z.string().nullable().optional(),
  creditCardId: z.string().nullable().optional(),
  toAccountId: z.string().min(1).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  dayOfMonth: z.coerce.number().int().min(1, 'Dia inválido').max(31, 'Dia inválido').optional(),
  notifyDaysBefore: z.coerce.number().int().min(0).max(30).optional(),
  active: z.boolean().optional(),
})

export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>
export type RecurringRulePatch = z.infer<typeof recurringRulePatchSchema>

export function toRecurringRuleDto(rule: {
  id: string
  description: string
  amountCents: number
  kind: string
  type: string
  dayOfMonth: number
  active: boolean
  notifyDaysBefore: number
  position: number
  accountId: string | null
  account: { name: string; color: string } | null
  creditCardId: string | null
  creditCard: { name: string } | null
  categoryId: string | null
  category: { name: string; color: string } | null
  toAccountId: string | null
  toAccount: { name: string; color: string } | null
}): RecurringRuleDto {
  const isTransfer = rule.kind === 'TRANSFER'
  return {
    id: rule.id,
    description: rule.description,
    amountCents: rule.amountCents,
    kind: rule.kind as RecurringKind,
    type: isTransfer ? null : (rule.type as TransactionType),
    categoryId: rule.categoryId,
    categoryName: isTransfer ? null : (rule.category?.name ?? null),
    categoryColor: isTransfer ? null : (rule.category?.color ?? null),
    accountId: rule.accountId,
    accountName: rule.account?.name ?? '',
    accountColor: rule.account?.color ?? '#10b981',
    creditCardId: isTransfer ? null : rule.creditCardId,
    creditCardName: isTransfer ? null : (rule.creditCard?.name ?? null),
    toAccountId: isTransfer ? rule.toAccountId : null,
    toAccountName: isTransfer ? (rule.toAccount?.name ?? null) : null,
    toAccountColor: isTransfer ? (rule.toAccount?.color ?? null) : null,
    dayOfMonth: rule.dayOfMonth,
    active: rule.active,
    notifyDaysBefore: rule.notifyDaysBefore,
    position: rule.position,
    nextDate: nextOccurrenceStr(rule.dayOfMonth, new Date()),
  }
}
