import { z } from 'zod'
import { TRANSACTION_TYPES } from '@/lib/categories'

export const transactionSchema = z.object({
  transactionType: z.enum(TRANSACTION_TYPES),
  description: z.string().trim().min(1, 'Informe uma descrição').max(100),
  amount: z
    .number()
    .positive('O valor deve ser maior que zero'),
  category: z.string().min(1, 'Escolha uma categoria'),
  date: z.string().min(1, 'Informe a data'),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export function amountToCents(amount: number): number {
  return Math.round(amount * 100)
}
