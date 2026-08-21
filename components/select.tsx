'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  id?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  id,
  required,
  disabled,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, close])

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-zinc-300 dark:border-zinc-700'
        } ${selected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'} ${className}`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value)
                  setOpen(false)
                }
              }}
              className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm transition ${
                opt.value === value
                  ? 'bg-emerald-500 font-medium text-white'
                  : opt.disabled
                    ? 'text-zinc-300 dark:text-zinc-600'
                    : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {!options.some((o) => o.value === value) && required && (
            <div className="border-t border-zinc-100 px-3.5 py-2.5 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
              {placeholder}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
