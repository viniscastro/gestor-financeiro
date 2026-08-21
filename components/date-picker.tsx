'use client'

import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, parse } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  value: string
  onChange: (date: string) => void
  required?: boolean
  className?: string
}

export default function DatePicker({ value, onChange, required, className }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const display = selected ? format(selected, 'dd/MM/yyyy') : 'dd/mm/aaaa'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-left text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${className ?? ''}`}
      >
        <span className={selected ? '' : 'text-zinc-400 dark:text-zinc-500'}>
          {display}
        </span>
        <CalendarIcon className="ml-auto h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
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
              month_grid: 'w-full border-collapse',
              weekdays: 'flex mb-1',
              weekday:
                'w-11 h-8 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 flex items-center justify-center',
              week: 'flex w-full',
              day_button:
                'relative flex h-11 w-11 items-center justify-center rounded-lg text-sm text-zinc-900 transition hover:bg-emerald-100 dark:text-zinc-100 dark:hover:bg-emerald-900/30',
              day: 'w-11 h-11 p-0',
              selected:
                'bg-emerald-500 text-white hover:bg-emerald-500 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-600',
              today: 'font-bold text-emerald-600 dark:text-emerald-400',
              outside: 'text-zinc-300 dark:text-zinc-600',
              disabled: 'text-zinc-300 dark:text-zinc-600',
            }}
          />
        </div>
      )}

      {required && !value && (
        <input tabIndex={-1} className="sr-only" required aria-hidden="true" />
      )}
    </div>
  )
}
