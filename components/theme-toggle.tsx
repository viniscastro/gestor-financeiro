'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

const emptySubscribe = () => () => {}

export default function ThemeToggle() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const t = saved ?? (prefersDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', t === 'dark')
    setTheme(t)
  }, [])

  function cycle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
  }

  if (!mounted) return null

  const Icon = theme === 'light' ? Sun : Moon
  const label = theme === 'light' ? 'Tema claro' : 'Tema escuro'

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={`Alternar tema (atual: ${label})`}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
    </button>
  )
}
