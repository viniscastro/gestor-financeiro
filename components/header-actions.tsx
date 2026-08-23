'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { Moon, Sun, SlidersHorizontal } from 'lucide-react'
import NotificationBell from '@/components/notification-bell'

const emptySubscribe = () => () => {}

type StoredTheme = 'light' | 'dark'

const CYCLE: StoredTheme[] = ['light', 'dark']

export default function HeaderActions({ defaultTheme = 'light' }: { defaultTheme?: StoredTheme }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard'
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [theme, setTheme] = useState<StoredTheme>(defaultTheme)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const persistTheme = useCallback((t: StoredTheme) => {
    fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-header-menu]')) {
        setMenuOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    if (menuOpen) {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  if (!mounted) return null

  function cycle() {
    const idx = CYCLE.indexOf(theme)
    const next = CYCLE[(idx + 1) % CYCLE.length]
    setTheme(next)
    persistTheme(next)
  }

  const icons = { light: Sun, dark: Moon }
  const labels = { light: 'Tema claro', dark: 'Tema escuro' }
  const Icon = icons[theme]

  if (!isDashboard) {
    return (
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={cycle}
          title={labels[theme]}
          aria-label={`Alternar tema (atual: ${labels[theme]})`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <NotificationBell />
      <div className="relative" data-header-menu>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label="Menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={cycle}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
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
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              Editar cards
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
