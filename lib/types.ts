export type TransactionType = 'INCOME' | 'EXPENSE'

export type RecurringKind = 'TRANSACTION' | 'TRANSFER'

export type TransactionDto = {
  id: string
  transactionType: TransactionType
  description: string
  amount: number
  date: string
  accountId: string | null
  accountName: string
  accountColor: string
  creditCardId: string | null
  creditCardName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  transferGroupId: string | null
  recurringId: string | null
  occurrenceMonth: string | null
  installmentGroupId: string | null
  installmentCurrent: number | null
  installmentTotal: number | null
}

export type AccountDto = {
  id: string
  name: string
  type: string
  color: string
  initialBalance: number
  balance: number
  position: number
}

export type AccountTypeDto = {
  id: string
  slug: string
  name: string
  color: string
  icon: string
  position: number
}

export type CategoryDto = {
  id: string
  name: string
  type: TransactionType
  color: string
  icon: string
  position: number
  parentId: string | null
  children: CategoryDto[]
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
  icon: string | null
  targetAmount: number
  currentAmount: number
  percent: number
  targetDate: string | null
  autoContributeAmount: number | null
  autoContributeDayOfMonth: number | null
  autoContributeAccountId: string | null
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
  accountId: string | null
  accountName: string
  accountColor: string
  creditCardId: string | null
  creditCardName: string | null
  toAccountId: string | null
  toAccountName: string | null
  toAccountColor: string | null
  dayOfMonth: number
  active: boolean
  notifyDaysBefore: number
  position: number
  nextDate: string
}

export type CreditCardDto = {
  id: string
  name: string
  last4: string | null
  creditLimit: number
  closingDay: number
  dueDay: number
  color: string
  position: number
}

export type CreditCardStatementDto = {
  id: string
  cardId: string
  cardName: string
  monthlyLabel: string
  monthKey: string
  dueDate: string
  status: 'OPEN' | 'PAID'
  totalAmount: number
  paidAt: string | null
}

