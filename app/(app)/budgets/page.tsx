import type { Metadata } from 'next'
import BudgetsManager from '@/components/budgets-manager'

export const metadata: Metadata = {
  title: 'Orçamentos | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default function BudgetsPage() {
  return <BudgetsManager />
}
