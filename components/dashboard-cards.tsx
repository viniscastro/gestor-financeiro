'use client'

import { useEffect, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Flag,
  Repeat,
  AlarmClock,
  ArrowUpDown,
  Target,
} from 'lucide-react'
import { useDashboardCards, type DashboardCardId } from '@/components/dashboard-card-editor'

const ICONS: Record<DashboardCardId, React.ElementType> = {
  saldo: Wallet,
  entradas: TrendingUp,
  saidas: TrendingDown,
  guardado: Flag,
  recorrentes: Repeat,
  'proximo-vencimento': AlarmClock,
  fluxo: ArrowUpDown,
  orcamento: Target,
}

type CardData = {
  id: DashboardCardId
  label: string
  value: string
  accent: string
}

export default function DashboardCards({ cards }: { cards: CardData[] }) {
  const { isVisible } = useDashboardCards()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    function onChange() {
      forceUpdate((n) => n + 1)
    }
    window.addEventListener('gf-cards-change', onChange)
    return () => window.removeEventListener('gf-cards-change', onChange)
  }, [])

  const visibleCards = cards.filter((c) => isVisible(c.id))
  const count = visibleCards.length

  function renderCard(card: CardData, className?: string) {
    const Icon = ICONS[card.id]
    return (
      <div
        key={card.id}
        className={`rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50 sm:p-5 ${className ?? ''}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-300 sm:text-xs">
            {card.label}
          </p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${card.accent}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
        <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-2xl">
          {card.value}
        </p>
      </div>
    )
  }

  if (count === 5) {
    const top = visibleCards.slice(0, 3)
    const bottom = visibleCards.slice(3)
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {top.map((c) => renderCard(c, 'lg:col-span-2'))}
        {bottom.map((c) => renderCard(c, 'lg:col-span-3'))}
      </div>
    )
  }

  function gridClass() {
    if (count === 1) return 'grid grid-cols-1 gap-3'
    if (count === 2) return 'grid grid-cols-1 gap-3 sm:grid-cols-2'
    if (count === 3) return 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
    if (count === 4) return 'grid grid-cols-1 gap-3 sm:grid-cols-2'
    return 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
  }

  return (
    <div className={gridClass()}>
      {visibleCards.map((c) => renderCard(c))}
    </div>
  )
}
