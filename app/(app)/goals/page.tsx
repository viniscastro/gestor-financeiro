import type { Metadata } from 'next'
import GoalsManager from '@/components/goals-manager'

export const metadata: Metadata = {
  title: 'Metas | Gestor Financeiro',
}

export default function GoalsPage() {
  return <GoalsManager />
}
