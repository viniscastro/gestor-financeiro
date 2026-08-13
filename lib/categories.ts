export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salário', color: '#10b981' },
  { id: 'freelance', label: 'Freelance', color: '#14b8a6' },
  { id: 'investments', label: 'Investimentos', color: '#22c55e' },
  { id: 'gifts', label: 'Presentes', color: '#84cc16' },
  { id: 'other_income', label: 'Outros', color: '#a3e635' },
] as const

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Alimentação', color: '#f97316' },
  { id: 'transport', label: 'Transporte', color: '#eab308' },
  { id: 'housing', label: 'Moradia', color: '#8b5cf6' },
  { id: 'health', label: 'Saúde', color: '#ec4899' },
  { id: 'leisure', label: 'Lazer', color: '#f43f5e' },
  { id: 'education', label: 'Educação', color: '#06b6d4' },
  { id: 'bills', label: 'Contas', color: '#6366f1' },
  { id: 'other_expense', label: 'Outros', color: '#78716c' },
] as const

export const CATEGORY_COLOR: Record<string, string> = {
  ...Object.fromEntries(INCOME_CATEGORIES.map((c) => [c.id, c.color])),
  ...Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c.color])),
}

export const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(INCOME_CATEGORIES.map((c) => [c.id, c.label])),
  ...Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c.label])),
}

export const TYPE_COLOR: Record<TransactionType, string> = {
  INCOME: '#10b981',
  EXPENSE: '#f43f5e',
}
