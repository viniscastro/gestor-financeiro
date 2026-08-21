'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type StoredTheme = 'light' | 'dark'

const CYCLE: StoredTheme[] = ['light', 'dark']

export default function AuthThemeToggle() {
  const [theme, setTheme] = useState<StoredTheme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark')
    setTheme(dark ? 'dark' : 'light')
    setMounted(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  if (!mounted) return null

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    setTheme(next)
    localStorage.setItem('gf-theme', next)
  }

  const Icon = theme === 'dark' ? Moon : Sun

  return (
    <button
      type="button"
      onClick={cycle}
      title={theme === 'dark' ? 'Tema escuro' : 'Tema claro'}
      aria-label={`Alternar tema (atual: ${theme === 'dark' ? 'escuro' : 'claro'})`}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
