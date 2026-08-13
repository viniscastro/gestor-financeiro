export type TransactionDto = {
  id: string
  transactionType: 'INCOME' | 'EXPENSE'
  description: string
  amount: number
  category: string
  date: string
}
