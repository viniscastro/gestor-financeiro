'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { Moon, Sun, SlidersHorizontal } from 'lucide-react'

const STORAGE_KEY = 'gf-theme'
const COOKIE_NAME = 'gf-theme'
const emptySubscribe = () => () => {}

type StoredTheme = 'light' | 'dark'

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

function readStoredTheme(): StoredTheme {
  if (typeof window === 'undefined') return 'light'
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  const cv = readCookie(COOKIE_NAME)
  if (cv === 'light' || cv === 'dark') {
    window.localStorage.setItem(STORAGE_KEY, cv)
    return cv
  }
  return 'light'
}

const CYCLE: StoredTheme[] = ['light', 'dark']

export default function HeaderActions() {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard'
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [theme, setTheme] = useState<StoredTheme>(readStoredTheme)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function apply() {
      const dark = theme === 'dark'
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    window.localStorage.setItem(STORAGE_KEY, theme)
    setCookie(COOKIE_NAME, theme)
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
