'use client'

import { useEffect, useState } from 'react'
import {
  LoaderCircle,
  Pencil,
  Plus,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { TransactionType } from '@/lib/types'
import type { CategoryDto } from '@/lib/types'
import CategoryIcon from '@/components/category-icon'
import { toast } from 'sonner'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/categories'

export default function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<TransactionType>('EXPENSE')
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0])
  const [newIcon, setNewIcon] = useState<string>(CATEGORY_ICONS[0])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [tab, setTab] = useState<TransactionType>('EXPENSE')
  const [editing, setEditing] = useState<CategoryDto | null>(null)

  async function reload() {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar')
      setCategories((await res.json()) as CategoryDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar as categorias.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' })
        if (!res.ok) throw new Error('Erro ao carregar')
        const data = (await res.json()) as CategoryDto[]
        if (!cancelled) {
          setCategories(data)
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar as categorias.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  function openCreate(type: TransactionType) {
    setEditing(null)
    setNewName('')
    setNewType(type)
    setNewColor(CATEGORY_COLORS[0])
    setNewIcon(CATEGORY_ICONS[0])
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(cat: CategoryDto) {
    setEditing(cat)
    setNewName(cat.name)
    setNewType(cat.type)
    setNewColor(cat.color)
    setNewIcon(cat.icon)
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: newName,
        type: newType,
        color: newColor,
        icon: newIcon,
      }
      const res = await fetch(
        editing ? `/api/categories/${editing.id}` : '/api/categories',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Erro ao salvar categoria')
        return
      }
      setModalOpen(false)
      setEditing(null)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: CategoryDto) {
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir a categoria.')
      return
    }
    await reload()
    toast.success('Categoria excluída', {
      action: { label: 'Desfazer', onClick: () => undoCreate(cat) },
    })
  }

  async function undoCreate(cat: CategoryDto) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon }),
    })
    if (res.ok) await reload()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  const filtered = categories.filter((c) => c.type === tab)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Categorias</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie as categorias de entradas e saídas
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(tab)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Nova categoria
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/80">
        <button
          type="button"
          onClick={() => setTab('EXPENSE')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'EXPENSE'
              ? 'bg-rose-500 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          Saída
        </button>
        <button
          type="button"
          onClick={() => setTab('INCOME')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'INCOME'
              ? 'bg-emerald-500 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Entrada
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-800 dark:bg-zinc-900/60">
          <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <Tags className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma categoria {tab === 'EXPENSE' ? 'de saída' : 'de entrada'}.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((cat) => (
              <li
                key={cat.id}
                className="group flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: cat.color + '20', color: cat.color }}
                >
                  <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {cat.name}
                </span>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="catName" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome
                </label>
                <input
                  id="catName"
                  type="text"
                  placeholder="Ex: Farmácia, Freelance..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  maxLength={40}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setNewType('EXPENSE')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    newType === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  Saída
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('INCOME')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    newType === 'INCOME'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Entrada
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`h-7 w-7 rounded-full transition ${
                        newColor === c ? 'ring-2 ring-offset-2 ring-emerald-500' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ícone
                </label>
                <div className="flex flex-wrap gap-1">
                  {CATEGORY_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewIcon(ic)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        newIcon === ic
                          ? 'bg-emerald-500/15 text-emerald-600 ring-2 ring-emerald-500 dark:text-emerald-400'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                      aria-label={ic}
                    >
                      <CategoryIcon icon={ic} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editing ? 'Salvar alterações' : 'Criar categoria'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
