import type { Metadata } from 'next'
import AccountTypesManager from '@/components/account-types-manager'

export const metadata: Metadata = {
  title: 'Tipos de conta | Gestor Financeiro',
}

export default function AccountTypesPage() {
  return <AccountTypesManager />
}