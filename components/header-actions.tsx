'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { Moon, Sun, SlidersHorizontal } from 'lucide-react'

const emptySubscribe = () => () => {}

type StoredTheme = 'light' | 'dark'

const CYCLE: StoredTheme[] = ['light', 'dark']

function getInitialTheme(): StoredTheme {
  if (typeof window === 'undefined') return 'light'
  const serverTheme = (window as unknown as Record<string, unknown>).__GF_THEME__
  if (serverTheme === 'dark' || serverTheme === 'light') return serverTheme
  return 'light'
}

export default function HeaderActions() {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard'
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [theme, setTheme] = useState<StoredTheme>(getInitialTheme)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    }).catch(() => {})
  }, [theme])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-header-menu]')) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  if (!mounted) return null

  function cycle() {
    const idx = CYCLE.indexOf(theme)
    setTheme(CYCLE[(idx + 1) % CYCLE.length])
  }

  const icons = { light: Sun, dark: Moon }
  const labels = { light: 'Tema claro', dark: 'Tema escuro' }
  const Icon = icons[theme]

  if (!isDashboard) {
    return (
      <button
        type="button"
        onClick={cycle}
        title={labels[theme]}
        aria-label={`Alternar tema (atual: ${labels[theme]})`}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <Icon className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="relative" data-header-menu>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        aria-label="Menu"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={cycle}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Icon className="h-4 w-4" />
            {labels[theme]}
          </button>
          <div className="border-t border-zinc-100 dark:border-zinc-700" />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              window.dispatchEvent(new CustomEvent('toggle-dashboard-editor'))
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Editar cards
          </button>
        </div>
      )}
    </div>
  )
}
