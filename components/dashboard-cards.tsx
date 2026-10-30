'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Flag,
  Repeat,
  AlarmClock,
  ArrowUpDown,
  Target,
} from '@/components/icons'
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

export default function DashboardCards({ cards, initialCards }: { cards: CardData[]; initialCards?: DashboardCardId[] | null }) {
  const { isVisible } = useDashboardCards(initialCards)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    function onChange() {
      forceUpdate((n) => n + 1)
    }
    window.addEventListener('gf-cards-change', onChange)
    return () => window.removeEventListener('gf-cards-change', onChange)
  }, [])

  const visibleCards = cards.filter((c) => isVisible(c.id))

  return (
    <>
      {/* Desktop grid */}
      <div className="hidden space-y-3 sm:block">
        <DesktopGrid cards={visibleCards} />
      </div>
      {/* Mobile carousel */}
      <div className="block sm:hidden">
        <MobileCarousel cards={visibleCards} />
      </div>
    </>
  )
}

function DesktopGrid({ cards }: { cards: CardData[] }) {
  function renderCard(card: CardData, spanClass: string) {
    const Icon = ICONS[card.id]
    return (
      <div
        key={card.id}
        className={`${spanClass} rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300 sm:text-xs">
            {card.label}
          </p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${card.accent}`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
        <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
          {card.value}
        </p>
      </div>
    )
  }

  const rows: CardData[][] = []
  const remaining = [...cards]
  while (remaining.length > 0) {
    const take = remaining.length <= 2 ? remaining.length : Math.min(3, remaining.length)
    rows.push(remaining.splice(0, take))
  }

  const spanByRowLen: Record<number, string> = {
    1: 'col-span-12',
    2: 'col-span-12 sm:col-span-6',
    3: 'col-span-12 sm:col-span-4',
    4: 'col-span-12 sm:col-span-3',
  }

  return (
    <>
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-12 gap-3">
          {row.map((c) => renderCard(c, spanByRowLen[row.length] ?? 'sm:col-span-4 lg:col-span-4'))}
        </div>
      ))}
    </>
  )
}

function MobileCarousel({ cards }: { cards: CardData[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const touchDelta = useRef(0)
  const isSwiping = useRef(false)

  const updateIndex = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const cardWidth = el.clientWidth
    if (cardWidth === 0) return
    const idx = Math.round(scrollLeft / cardWidth)
    setActiveIndex(Math.min(Math.max(idx, 0), cards.length - 1))
  }, [cards.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', updateIndex, { passive: true })
    return () => el.removeEventListener('scroll', updateIndex)
  }, [updateIndex])

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX
    touchDelta.current = 0
    isSwiping.current = false
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStart.current === null) return
    const delta = touchStart.current - e.touches[0].clientX
    touchDelta.current = delta
    isSwiping.current = Math.abs(delta) > 5
  }

  function onTouchEnd() {
    if (!isSwiping.current) return
    const threshold = 50
    const el = containerRef.current
    if (!el) return
    const cardWidth = el.clientWidth
    if (Math.abs(touchDelta.current) > threshold) {
      if (touchDelta.current > 0 && activeIndex < cards.length - 1) {
        el.scrollTo({ left: (activeIndex + 1) * cardWidth, behavior: 'smooth' })
      } else if (touchDelta.current < 0 && activeIndex > 0) {
        el.scrollTo({ left: (activeIndex - 1) * cardWidth, behavior: 'smooth' })
      }
    }
    touchStart.current = null
  }

  function goTo(index: number) {
    const el = containerRef.current
    if (!el) return
    const cardWidth = el.clientWidth
    el.scrollTo({ left: index * cardWidth, behavior: 'smooth' })
  }

  if (cards.length === 0) return null

  return (
    <div>
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-3 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {cards.map((card) => {
          const Icon = ICONS[card.id]
          return (
            <div
              key={card.id}
              className="w-full shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  {card.label}
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-2">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? 'w-5 bg-brand-500'
                  : 'w-1.5 bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label={`Ir para ${card.label}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
