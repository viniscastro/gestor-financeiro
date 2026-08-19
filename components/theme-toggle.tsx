'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'gf-theme'
const emptySubscribe = () => () => {}

type StoredTheme = 'light' | 'dark'

function readStoredTheme(): StoredTheme {
  if (typeof window === 'undefined') return 'light'
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'light'
}

const CYCLE: StoredTheme[] = ['light', 'dark']

export default function ThemeToggle() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [theme, setTheme] = useState<StoredTheme>(readStoredTheme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const dark = theme === 'dark'
      document.documentElement.classList.toggle('dark', dark)
    }

    apply()
    window.localStorage.setItem(STORAGE_KEY, theme)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  if (!mounted) return null

  function cycle() {
    const idx = CYCLE.indexOf(theme)
    setTheme(CYCLE[(idx + 1) % CYCLE.length])
  }

  const icons = { light: Sun, dark: Moon }
  const labels = { light: 'Tema claro', dark: 'Tema escuro' }
  const Icon = icons[theme]

  return (
    <button
      type="button"
      onClick={cycle}
      title={labels[theme]}
      aria-label={`Alternar tema (atual: ${labels[theme]})`}
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
