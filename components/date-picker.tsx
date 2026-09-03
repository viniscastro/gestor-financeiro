'use client'

import { useEffect, useRef, useState, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, parse } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

type Props = {
  value: string
  onChange: (date: string) => void
  required?: boolean
  className?: string
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
}

function parseDateInput(text: string): string | null {
  const m = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const d = parseInt(dd, 10)
  const mo = parseInt(mm, 10)
  const y = parseInt(yyyy, 10)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null
  const test = new Date(y, mo - 1, d)
  if (test.getFullYear() !== y || test.getMonth() !== mo - 1 || test.getDate() !== d) return null
  return `${yyyy}-${mm}-${dd}`
}

export default function DatePicker({ value, onChange, required, className }: Props) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoId = useId()
  const [editing, setEditing] = useState(false)

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  useEffect(() => {
    if (!editing && selected) {
      setInputValue(format(selected, 'dd/MM/yyyy'))
    } else if (!editing && !selected) {
      setInputValue('')
    }
  }, [selected, editing])

  function commitInput() {
    setEditing(false)
    if (!inputValue.trim()) {
      if (!required) onChange('')
      else if (selected) setInputValue(format(selected, 'dd/MM/yyyy'))
      return
    }
    const iso = parseDateInput(inputValue)
    if (iso) {
      onChange(iso)
    } else if (selected) {
      setInputValue(format(selected, 'dd/MM/yyyy'))
    } else {
      setInputValue('')
    }
  }

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'))
      setOpen(false)
      inputRef.current?.focus()
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        inputRef.current?.focus()
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const updatePos = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    const width = Math.min(320, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 16 - width))
    const calHeight = 340
    const top =
      r.bottom + 6 + calHeight <= window.innerHeight
        ? r.bottom + 6
        : Math.max(8, r.top - 6 - calHeight)
    setPos({ top, left, width })
  }, [])

  const openCalendar = useCallback(() => {
    updatePos()
    commitInput()
    setOpen(true)
  }, [updatePos, commitInput])

  useEffect(() => {
    if (!open) return
    const listeners: Parameters<typeof window.addEventListener>[] = []
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={editing ? inputValue : (selected ? format(selected, 'dd/MM/yyyy') : '')}
          onChange={(e) => {
            setEditing(true)
            setInputValue(formatDateInput(e.target.value))
          }}
          onFocus={() => {
            setEditing(true)
            setInputValue(selected ? format(selected, 'dd/MM/yyyy') : '')
          }}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitInput()
            }
          }}
          required={required}
          maxLength={10}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <button
          type="button"
          aria-label="Abrir calendário"
          onClick={openCalendar}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-label="Selecionar data"
            style={pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[60] max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800"
          >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ptBR}
            defaultMonth={selected}
            showOutsideDays
            fixedWeeks
            classNames={{
              root: 'p-0',
              months: 'flex flex-col',
              month: 'w-full',
              month_caption: 'flex h-10 items-center justify-between px-1 mb-2',
              caption_label: 'text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100',
              nav: 'flex items-center gap-1',
              button_previous:
                'inline-flex items-center justify-center rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700',
              button_next:
                'inline-flex items-center justify-center rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700',
              chevron: 'h-4 w-4',
              month_grid: 'w-full',
              weekdays: 'grid grid-cols-7 gap-1 mb-1',
              weekday:
                'flex h-8 items-center justify-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500',
              week: 'grid w-full grid-cols-7 gap-1',
              day: 'w-full',
              day_button:
                'relative flex aspect-square w-full items-center justify-center rounded-lg text-sm text-zinc-900 transition hover:bg-emerald-100 dark:text-zinc-100 dark:hover:bg-emerald-900/30',
              selected:
                'bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-500',
              today: 'font-bold text-emerald-600 dark:text-emerald-400',
              outside: 'text-zinc-300 dark:text-zinc-600',
              disabled: 'text-zinc-300 dark:text-zinc-600',
            }}
          />
          </div>,
          document.body
        )}
    </div>
  )
}
