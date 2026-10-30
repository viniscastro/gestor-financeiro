'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from '@/components/icons'

type Theme = 'light' | 'dark'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null)

  if (!theme) return null

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('gf-theme', next)
  }

  const Icon = theme === 'light' ? Sun : Moon
  const label = theme === 'light' ? 'Tema claro' : 'Tema escuro'

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={`Alternar tema (atual: ${label})`}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
    </button>
  )
}
