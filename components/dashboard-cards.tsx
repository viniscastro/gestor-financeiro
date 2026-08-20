'use client'

import { useEffect, useState } from 'react'
import { useDashboardCards, type DashboardCardId } from '@/components/dashboard-card-editor'

type CardData = {
  id: DashboardCardId
  label: string
  value: string
  icon: React.ElementType
  accent: string
}

export default function DashboardCards({ cards }: { cards: CardData[] }) {
  const { isVisible } = useDashboardCards()
  const [mounted, setMounted] = useState(false)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    setMounted(true)
    function onChange() {
      forceUpdate((n) => n + 1)
    }
    window.addEventListener('dashboard-cards-changed', onChange)
    return () => window.removeEventListener('dashboard-cards-changed', onChange)
  }, [])

  const visibleCards = mounted
    ? cards.filter((c) => isVisible(c.id))
    : cards

  const count = visibleCards.length

  function gridCols() {
    if (count <= 3) return `grid-cols-${count}`
    if (count === 4) return 'grid-cols-2'
    return 'grid-cols-6'
  }

  function span(i: number) {
    if (count <= 3) return ''
    if (count === 4) return ''
    return i < 3 ? 'col-span-2' : 'col-span-3'
  }

  return (
    <div className={`grid gap-4 ${gridCols()}`}>
      {visibleCards.map((card, i) => (
        <div
          key={card.id}
          className={`rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60 ${span(i)}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {card.label}
            </p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
