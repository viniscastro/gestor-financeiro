import { z } from 'zod'
import { TRANSACTION_TYPES } from '@/lib/categories'
import type { TransactionDto } from '@/lib/types'

export const transactionSchema = z.object({
  transactionType: z.enum(TRANSACTION_TYPES),
  description: z.string().trim().min(1, 'Informe uma descrição').max(100),
  amount: z
    .number()
    .positive('O valor deve ser maior que zero'),
  accountId: z.string().min(1, 'Escolha uma conta'),
  categoryId: z.string().nullable().optional(),
  date: z.string().min(1, 'Informe a data'),
  recurringId: z.string().nullable().optional(),
  occurrenceMonth: z.string().nullable().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export function amountToCents(amount: number): number {
  return Math.round(amount * 100)
}

type TransactionWithRelations = {
  id: string
  transactionType: string
  description: string
  amount: number
  date: Date
  accountId: string | null
  categoryId: string | null
  transferGroupId: string | null
  recurringId: string | null
  occurrenceMonth: string | null
  account: { name: string; color: string } | null
  category: { id: string; name: string; color: string } | null
}

export function toTransactionDto(t: TransactionWithRelations): TransactionDto {
  return {
    id: t.id,
    transactionType: t.transactionType as TransactionDto['transactionType'],
    description: t.description,
    amount: t.amount,
    date: t.date.toISOString(),
    accountId: t.accountId,
    accountName: t.account?.name ?? '',
    accountColor: t.account?.color ?? '#10b981',
    categoryId: t.category?.id ?? null,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
    transferGroupId: t.transferGroupId,
    recurringId: t.recurringId,
    occurrenceMonth: t.occurrenceMonth,
  }
}
