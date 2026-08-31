import type { Metadata } from 'next'
import CardsManager from '@/components/cards-manager'

export const metadata: Metadata = {
  title: 'Cartões | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default function CardsPage() {
  return <CardsManager />
}
