import { z } from 'zod'

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'Escolha a conta de origem'),
  toAccountId: z.string().min(1, 'Escolha a conta de destino'),
  amount: z.number().positive('O valor deve ser maior que zero'),
  date: z.string().min(1, 'Informe a data'),
  description: z.string().trim().max(100).optional().default(''),
})

export type TransferInput = z.infer<typeof transferSchema>
