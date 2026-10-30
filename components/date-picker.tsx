'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, parse } from 'date-fns'
import { CalendarIcon } from '@/components/icons'

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
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  // Texto em digitação; fora da edição o campo mostra sempre o valor recebido.
  const [display, setDisplay] = useState('')

  function commitTypedInput() {
    setEditing(false)
    if (!display.trim()) {
      if (!required && selected) onChange('')
      return
    }
    const iso = parseDateInput(display)
    if (iso) onChange(iso)
  }

  // Selecionar um dia no calendário: fecha o popup e aplica a data NA HORA
  // no campo, sem depender de onBlur/reativação.
  function handleSelect(day: Date | undefined) {
    if (!day) return
    onChange(format(day, 'yyyy-MM-dd'))
    setEditing(false)
    setOpen(false)
  }

  // Fecha o popup apenas quando o clique acontece fora do campo e do popup.
  // Evento `click` (não `mousedown`) para não fechar antes da seleção no
  // calendário disparar.
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const t = e.target as Node
      const insideInput = ref.current?.contains(t)
      const insideDialog = dialogRef.current?.contains(t)
      if (!insideInput && !insideDialog) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        inputRef.current?.focus()
      }
    }
    document.addEventListener('click', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!open) return
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
  }, [open])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={editing ? display : selected ? format(selected, 'dd/MM/yyyy') : ''}
          onChange={(e) => {
            setEditing(true)
            setDisplay(formatDateInput(e.target.value))
          }}
          onFocus={() => {
            setEditing(true)
            setDisplay(selected ? format(selected, 'dd/MM/yyyy') : '')
          }}
          onBlur={commitTypedInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTypedInput()
            }
          }}
          required={required}
          maxLength={10}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          aria-label="Abrir calendário"
          onClick={() => {
            setEditing(false)
            setOpen((o) => !o)
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Selecionar data"
            style={pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
            onMouseDown={(e) => e.preventDefault()}
            className="fixed z-[60] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
          >
            <DayPicker
              mode="single"
              key={selected ? format(selected, 'yyyy-MM-dd') : 'no-date'}
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
                caption_label: 'text-sm font-semibold capitalize text-slate-900 dark:text-slate-100',
                nav: 'flex items-center gap-1',
                button_previous:
                  'inline-flex items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700',
                button_next:
                  'inline-flex items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700',
                chevron: 'h-4 w-4',
                month_grid: 'w-full',
                weekdays: 'grid grid-cols-7 gap-1 mb-1',
                weekday:
                  'flex h-8 items-center justify-center text-[11px] font-medium text-slate-400 dark:text-slate-500',
                week: 'grid w-full grid-cols-7 gap-1',
                day: 'w-full',
                day_button:
                  'relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg text-sm text-slate-900 transition hover:bg-brand-100 dark:text-slate-100 dark:hover:bg-brand-900/30',
                selected:
                  'bg-brand-600 text-white hover:bg-brand-600 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-500',
                today: 'font-bold text-brand-600 dark:text-brand-400',
                outside: 'text-slate-300 dark:text-slate-600',
                disabled: 'text-slate-300 dark:text-slate-600',
              }}
            />
          </div>,
          document.body
        )}
    </div>
  )
}