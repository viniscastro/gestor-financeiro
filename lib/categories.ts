export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TYPE_COLOR: Record<TransactionType, string> = {
  INCOME: '#10b981',
  EXPENSE: '#f43f5e',
}

export const ACCOUNT_TYPES = [
  { id: 'CARTEIRA', label: 'Carteira' },
  { id: 'CONTA_CORRENTE', label: 'Conta corrente' },
  { id: 'POUPANCA', label: 'Poupança' },
  { id: 'DINHEIRO', label: 'Dinheiro' },
  { id: 'INVESTIMENTO', label: 'Investimento' },
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]['id']

export const ACCOUNT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPES.map((a) => [a.id, a.label])
)

// Tipos padrão semeados para cada usuário (slug == valor usado hoje em
// Account.type, mantendo contas existentes compatíveis).
export const DEFAULT_ACCOUNT_TYPES = [
  { slug: 'CARTEIRA', name: 'Carteira', color: '#10b981', icon: 'wallet' },
  { slug: 'CONTA_CORRENTE', name: 'Conta corrente', color: '#6366f1', icon: 'building-2' },
  { slug: 'POUPANCA', name: 'Poupança', color: '#22c55e', icon: 'piggy-bank' },
  { slug: 'DINHEIRO', name: 'Dinheiro', color: '#f97316', icon: 'banknote' },
  { slug: 'INVESTIMENTO', name: 'Investimento', color: '#8b5cf6', icon: 'trending-up' },
] as const

export type DefaultCategory = {
  slug: string
  name: string
  type: TransactionType
  color: string
  icon: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { slug: 'salary', name: 'Salário', type: 'INCOME', color: '#10b981', icon: 'briefcase' },
  { slug: 'freelance', name: 'Freelance', type: 'INCOME', color: '#14b8a6', icon: 'laptop' },
  { slug: 'investments', name: 'Investimentos', type: 'INCOME', color: '#22c55e', icon: 'trending-up' },
  { slug: 'gifts', name: 'Presentes', type: 'INCOME', color: '#84cc16', icon: 'gift' },
  { slug: 'other_income', name: 'Outros', type: 'INCOME', color: '#a3e635', icon: 'coins' },
  { slug: 'food', name: 'Alimentação', type: 'EXPENSE', color: '#f97316', icon: 'utensils' },
  { slug: 'transport', name: 'Transporte', type: 'EXPENSE', color: '#eab308', icon: 'bus' },
  { slug: 'housing', name: 'Moradia', type: 'EXPENSE', color: '#8b5cf6', icon: 'home' },
  { slug: 'health', name: 'Saúde', type: 'EXPENSE', color: '#ec4899', icon: 'heart-pulse' },
  { slug: 'leisure', name: 'Lazer', type: 'EXPENSE', color: '#f43f5e', icon: 'gamepad-2' },
  { slug: 'education', name: 'Educação', type: 'EXPENSE', color: '#06b6d4', icon: 'graduation-cap' },
  { slug: 'bills', name: 'Contas', type: 'EXPENSE', color: '#6366f1', icon: 'receipt' },
  { slug: 'other_expense', name: 'Outros', type: 'EXPENSE', color: '#78716c', icon: 'tag' },
]

export const CATEGORY_COLORS = [
  '#10b981',
  '#14b8a6',
  '#22c55e',
  '#84cc16',
  '#a3e635',
  '#f97316',
  '#eab308',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#06b6d4',
  '#6366f1',
  '#78716c',
] as const

export const CATEGORY_ICONS = [
  'tag',
  'wallet',
  'shopping-cart',
  'utensils',
  'bus',
  'car',
  'home',
  'heart-pulse',
  'gamepad-2',
  'graduation-cap',
  'receipt',
  'briefcase',
  'laptop',
  'trending-up',
  'gift',
  'coins',
  'credit-card',
  'phone',
  'dumbbell',
  'paw-print',
  'baby',
  'shirt',
  'plane',
  'book-open',
] as const

export const ACCOUNT_TYPE_ICONS = [
  'wallet',
  'building-2',
  'piggy-bank',
  'banknote',
  'trending-up',
  'coins',
  'credit-card',
  'briefcase',
  'laptop',
  'plane',
  'shopping-cart',
  'tag',
] as const
