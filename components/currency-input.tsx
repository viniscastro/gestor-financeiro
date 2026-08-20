'use client'

import { useState, useEffect } from 'react'

function formatDisplay(raw: string): string {
  if (!raw) return ''
  const num = Number(raw)
  if (isNaN(num)) return raw
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
  placeholder = 'R$0,00',
  className,
  required,
  autoFocus,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) {
      setDraft(value)
    }
  }, [value, editing])

  function handleFocus() {
    setDraft(value)
    setEditing(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value)
  }

  function handleBlur() {
    setEditing(false)
    const cleaned = draft.replace(/[^\d.,]/g, '').replace(',', '.')
    const num = Number(cleaned)
    if (!isNaN(num) && num >= 0) {
      onChange(String(num))
    } else {
      setDraft(value)
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={editing ? draft : formatDisplay(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      required={required}
      autoFocus={autoFocus}
      className={className}
    />
  )
}
