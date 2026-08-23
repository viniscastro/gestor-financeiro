'use client'

import { useRef, useCallback, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseToCents(display: string): number {
  const cleaned = display.replace(/[^\d]/g, '')
  return cleaned ? Number(cleaned) : 0
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  autoFocus?: boolean
}

export default function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  required,
  autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const cents = Math.round(Number(value || 0) * 100)

  const commit = useCallback(
    (newCents: number) => {
      onChange(newCents > 0 ? String(newCents / 100) : '')
    },
    [onChange]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newCents = parseToCents(e.target.value)
      commit(newCents)
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const len = inputRef.current.value.length
          inputRef.current.setSelectionRange(len, len)
        }
      })
    },
    [commit]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const step = e.key === 'ArrowUp' ? 10 : -10
      commit(Math.max(0, cents + step))
    },
    [cents, commit]
  )

  const handleFocus = useCallback(() => setFocused(true), [])
  const handleBlur = useCallback(() => setFocused(false), [])

  const step = useCallback(
    (delta: number) => {
      commit(Math.max(0, cents + delta))
      inputRef.current?.focus()
    },
    [cents, commit]
  )

  const display = cents > 0 ? formatCents(cents) : ''

  const btnClass =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 transition hover:bg-zinc-100 active:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => step(-10)}
        className={btnClass}
        aria-label="Diminuir valor"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        required={required}
        autoFocus={autoFocus}
        role="spinbutton"
        aria-valuenow={cents}
        aria-valuemin={0}
        aria-label="Valor em reais"
        className={`${className} text-center`}
      />
      <button
        type="button"
        onClick={() => step(10)}
        className={btnClass}
        aria-label="Aumentar valor"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
