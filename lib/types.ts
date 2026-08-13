export type TransactionType = 'INCOME' | 'EXPENSE'

export type TransactionDto = {
  id: string
  transactionType: TransactionType
  description: string
  amount: number
  date: string
  accountId: string
  accountName: string
  accountColor: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  transferGroupId: string | null
  recurringId: string | null
}

export type AccountDto = {
  id: string
  name: string
  type: string
  color: string
  initialBalance: number
  balance: number
}

export type CategoryDto = {
  id: string
  name: string
  type: TransactionType
  color: string
  icon: string
}

export type BudgetDto = {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string
  amountCents: number
  spent: number
}

export type RecurringRuleDto = {
  id: string
  description: string
  amountCents: number
  type: TransactionType
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  accountId: string
  accountName: string
  accountColor: string
  dayOfMonth: number
  active: boolean
  notifyDaysBefore: number
  nextDate: string
}
