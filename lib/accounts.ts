import { z } from 'zod'
import type { AccountDto } from '@/lib/types'

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da conta').max(60),
  type: z.string().min(1, 'Escolha o tipo'),
  color: z.string().min(1),
  initialBalance: z.number().optional().default(0),
})

export type AccountInput = z.infer<typeof accountSchema>

export function toAccountDto(
  account: {
    id: string
    name: string
    type: string
    color: string
    initialBalance: number
    position?: number
    transactions?: { transactionType: string; amount: number }[]
  }
): AccountDto {
  const balance =
    account.initialBalance +
    (account.transactions ?? []).reduce((sum, t) => {
      return t.transactionType === 'INCOME' ? sum + t.amount : sum - t.amount
    }, 0)
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    color: account.color,
    initialBalance: account.initialBalance,
    balance,
    position: account.position ?? 0,
  }
}
