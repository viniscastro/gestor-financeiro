export type TransactionType = 'INCOME' | 'EXPENSE'

export type RecurringKind = 'TRANSACTION' | 'TRANSFER'

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

export type SavingsGoalDto = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  percent: number
  accountId: string | null
  accountName: string | null
  accountColor: string | null
  targetDate: string | null
}

export type RecurringRuleDto = {
  id: string
  description: string
  amountCents: number
  kind: RecurringKind
  type: TransactionType | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  accountId: string
  accountName: string
  accountColor: string
  toAccountId: string | null
  toAccountName: string | null
  toAccountColor: string | null
  dayOfMonth: number
  active: boolean
  notifyDaysBefore: number
  nextDate: string
}
