'use client'

import { useRef } from 'react'
import { Pipette } from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/categories'

type Props = {
  value: string
  onChange: (color: string) => void
  className?: string
}

export default function ColorPicker({ value, onChange, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-7 w-7 shrink-0 rounded-full transition ${
              value === c ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900' : ''
            }`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed transition ${
            !CATEGORY_COLORS.includes(value as typeof CATEGORY_COLORS[number])
              ? 'border-zinc-400 dark:border-zinc-500'
              : 'border-zinc-300 dark:border-zinc-600'
          }`}
          style={
            !CATEGORY_COLORS.includes(value as typeof CATEGORY_COLORS[number])
              ? { backgroundColor: value }
              : undefined
          }
          title="Cor personalizada"
        >
          {!CATEGORY_COLORS.includes(value as typeof CATEGORY_COLORS[number]) ? null : (
            <Pipette className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          )}
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
