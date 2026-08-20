'use client'

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import { Check, Eye, EyeOff, RotateCcw, X } from 'lucide-react'

const STORAGE_KEY = 'gf-dashboard-cards'
const EVENT = 'gf-cards-change'

export const CARD_IDS = [
  { id: 'saldo', label: 'Saldo total' },
  { id: 'entradas', label: 'Entradas no mês' },
  { id: 'saidas', label: 'Saídas no mês' },
  { id: 'guardado', label: 'Guardado (metas)' },
  { id: 'recorrentes', label: 'Recorrentes (mês)' },
  { id: 'proximo-vencimento', label: 'Próximo vencimento' },
  { id: 'fluxo', label: 'Fluxo do mês' },
  { id: 'orcamento', label: 'Orçamentos estourados' },
] as const

export type DashboardCardId = (typeof CARD_IDS)[number]['id']

function loadVisible(): DashboardCardId[] {
  if (typeof window === 'undefined') return CARD_IDS.map((c) => c.id)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return CARD_IDS.map((c) => c.id)
}

function saveVisible(ids: DashboardCardId[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event(EVENT))
}

let currentVisible: DashboardCardId[] = CARD_IDS.map((c) => c.id)
let initialized = false

function subscribe(callback: () => void) {
  const handler = () => callback()
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

function getSnapshot() {
  return currentVisible
}

function getServerSnapshot() {
  return CARD_IDS.map((c) => c.id)
}

export function useDashboardCards() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!initialized) {
      currentVisible = loadVisible()
      initialized = true
    }
    setMounted(true)
  }, [])

  const isVisible = useCallback(
    (id: DashboardCardId) => !mounted || currentVisible.includes(id),
    [mounted, visible]
  )

  return { visible, isVisible }
}

export default function DashboardCardEditor() {
  const [open, setOpen] = useState(false)
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    function handleToggle() {
      setOpen((o) => !o)
    }
    window.addEventListener('toggle-dashboard-editor', handleToggle)
    return () => window.removeEventListener('toggle-dashboard-editor', handleToggle)
  }, [])

  function toggle(id: DashboardCardId) {
    const next = visible.includes(id)
      ? visible.filter((x) => x !== id)
      : [...visible, id]
    currentVisible = next
    saveVisible(next)
  }

  function resetAll() {
    const all = CARD_IDS.map((c) => c.id)
    currentVisible = all
    saveVisible(all)
  }

  const allVisible = visible.length === CARD_IDS.length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Editar cards
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1">
          {CARD_IDS.map((card) => {
            const active = visible.includes(card.id)
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => toggle(card.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                }`}
              >
                {active ? (
                  <Eye className="h-4 w-4 shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 shrink-0" />
                )}
                <span className="flex-1 text-left">{card.label}</span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={resetAll}
            disabled={allVisible}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Mostrar todos
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
