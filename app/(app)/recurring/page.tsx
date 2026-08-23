import type { Metadata } from 'next'
import RecurringManager from '@/components/recurring-manager'

export const metadata: Metadata = {
  title: 'Recorrências | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default function RecurringPage() {
  return <RecurringManager />
}
