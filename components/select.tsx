'use client'

import { useEffect, useRef, useState, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  depth?: number
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

type DropdownPos = {
  top: number
  left: number
  width: number
  openAbove: boolean
}

const MAX_HEIGHT = 260
const DROPDOWN_MARGIN = 4

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
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const autoId = useId()
  const listboxId = `${autoId}-listbox`
  const labelId = `${autoId}-label`

  const selected = options.find((o) => o.value === value)
  const enabledOptions = options.filter((o) => !o.disabled)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
    setPos(null)
    triggerRef.current?.focus()
  }, [])

  const selectOption = useCallback(
    (opt: SelectOption) => {
      if (!opt.disabled) {
        onChange(opt.value)
        close()
      }
    },
    [onChange, close]
  )

  const openDropdown = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const itemHeight = 42
    const estimatedHeight = Math.min(MAX_HEIGHT, options.length * itemHeight + 12)
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_MARGIN
    const spaceAbove = rect.top - DROPDOWN_MARGIN
    const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow

    const width = Math.min(rect.width, window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const top = openAbove
      ? Math.max(8, rect.top - estimatedHeight - DROPDOWN_MARGIN)
      : rect.bottom + DROPDOWN_MARGIN

    setPos({ top, left, width, openAbove })
    setOpen(true)
    const idx = enabledOptions.findIndex((o) => o.value === value)
    setActiveIndex(idx >= 0 ? idx : 0)
  }, [options, enabledOptions, value])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const isInside =
        (ref.current && ref.current.contains(e.target as Node)) ||
        (listRef.current && listRef.current.contains(e.target as Node))
      if (!isInside) close()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    function handleViewportChange(e: Event) {
      const target = e.target as Node | null
      if (listRef.current && target && listRef.current.contains(target)) return
      close()
    }
    window.addEventListener('resize', handleViewportChange)
    document.addEventListener('scroll', handleViewportChange, true)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      document.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open, close])

  useEffect(() => {
    if (open && activeIndex >= 0) {
      const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')
      items?.[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) {
          openDropdown()
        } else if (activeIndex >= 0) {
          selectOption(enabledOptions[activeIndex])
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) {
          openDropdown()
        } else {
          setActiveIndex((i) => (i + 1) % enabledOptions.length)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) {
          setActiveIndex((i) => (i - 1 + enabledOptions.length) % enabledOptions.length)
        }
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActiveIndex(enabledOptions.length - 1)
        }
        break
    }
  }

  function handleOptionKeyDown(e: React.KeyboardEvent, opt: SelectOption) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectOption(opt)
    }
  }

  return (
    <>
      <div ref={ref} className={`relative ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-labelledby={labelId}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openDropdown())}
          onKeyDown={handleTriggerKeyDown}
          className={`flex w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 ${
            open
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-zinc-300 dark:border-zinc-700'
          } ${selected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {open && pos && typeof document !== 'undefined' &&
        createPortal(
          <div
            id={listboxId}
            ref={listRef}
            role="listbox"
            aria-labelledby={labelId}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: MAX_HEIGHT,
            }}
            className="fixed z-[100] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
          >
            {options.map((opt) => {
              const isEnabled = !opt.disabled
              const optionIndex = enabledOptions.indexOf(opt)
              const isActive = optionIndex === activeIndex
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  aria-disabled={opt.disabled || undefined}
                  data-disabled={opt.disabled || undefined}
                  tabIndex={-1}
                  onClick={() => selectOption(opt)}
                  onKeyDown={(e) => handleOptionKeyDown(e, opt)}
                  onMouseEnter={() => isEnabled && setActiveIndex(optionIndex)}
                  className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm transition ${
                    opt.value === value
                      ? 'bg-emerald-600 font-medium text-white'
                      : opt.disabled
                        ? 'cursor-not-allowed text-zinc-300 dark:text-zinc-600'
                        : isActive
                          ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100'
                          : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                  style={{ paddingLeft: `${14 + (opt.depth ?? 0) * 20}px` }}
                >
                  {opt.depth ? <span className="mr-1.5 text-zinc-400 dark:text-zinc-500">└</span> : null}
                  {opt.label}
                </div>
              )
            })}
            {!options.some((o) => o.value === value) && required && (
              <div
                role="option"
                aria-selected={false}
                aria-disabled="true"
                className="border-t border-zinc-100 px-3.5 py-2.5 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
              >
                {placeholder}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
