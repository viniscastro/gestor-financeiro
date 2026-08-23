import type { Metadata } from 'next'
import AccountsManager from '@/components/accounts-manager'

export const metadata: Metadata = {
  title: 'Contas | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default function AccountsPage() {
  return <AccountsManager />
}
