'use client'

import { useEffect, useRef, useState } from 'react'
import {
  GripVertical,
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
import ConfirmDialog from '@/components/confirm-dialog'
import Modal from '@/components/modal'
import { toast } from 'sonner'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/categories'
import ColorPicker from '@/components/color-picker'

export default function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<TransactionType>('INCOME')
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0])
  const [newIcon, setNewIcon] = useState<string>(CATEGORY_ICONS[0])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [tab, setTab] = useState<TransactionType>('INCOME')
  const [editing, setEditing] = useState<CategoryDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<CategoryDto | null>(null)
  const dragItem = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const touchCurrentIndex = useRef<number | null>(null)

  useEffect(() => {
    function onStart(e: TouchEvent) {
      const grip = (e.target as HTMLElement).closest('[data-touch-grip]')
      if (!grip) return
      e.preventDefault()
      const li = grip.closest('li[data-drag-index]')
      if (!li) return
      const idx = Number(li.getAttribute('data-drag-index'))
      if (isNaN(idx)) return
      touchCurrentIndex.current = idx
      dragItem.current = idx
      setTouchDragging(true)
    }
    document.addEventListener('touchstart', onStart, { passive: false })
    return () => document.removeEventListener('touchstart', onStart)
  }, [])

  useEffect(() => {
    if (!touchDragging) return

    function onMove(e: TouchEvent) {
      if (touchCurrentIndex.current === null) return
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const li = el?.closest('li[data-drag-index]') as HTMLElement | null
      if (li) {
        const idx = Number(li.getAttribute('data-drag-index'))
        if (!isNaN(idx)) setDragOverIndex(idx)
      }
    }

    function onEnd() {
      if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
        const updated = [...categories]
        const [moved] = updated.splice(dragItem.current, 1)
        updated.splice(dragOverIndex, 0, moved)
        setCategories(updated)
        const ids = updated.map((c) => c.id)
        fetch('/api/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
      }
      setDragOverIndex(null)
      dragItem.current = null
      touchCurrentIndex.current = null
      setTouchDragging(false)
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [touchDragging, dragOverIndex, categories])

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
    return () => { cancelled = true }
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
    setConfirmTarget(cat)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const res = await fetch(`/api/categories/${confirmTarget.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir a categoria.')
      return
    }
    await reload()
    toast.success('Categoria excluída', {
      action: { label: 'Desfazer', onClick: () => undoCreate(confirmTarget!) },
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

  function handleDragStart(index: number) {
    dragItem.current = index
  }

  function handleDragEnter(index: number) {
    setDragOverIndex(index)
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverIndex === null) {
      setDragOverIndex(null)
      dragItem.current = null
      return
    }
    if (dragItem.current === dragOverIndex) {
      setDragOverIndex(null)
      dragItem.current = null
      return
    }

    const updated = [...categories]
    const [moved] = updated.splice(dragItem.current, 1)
    updated.splice(dragOverIndex, 0, moved)
    setCategories(updated)

    const ids = updated.map((c) => c.id)
    fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })

    setDragOverIndex(null)
    dragItem.current = null
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  const filtered = categories.filter((c) => c.type === tab)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Categorias</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Gerencie as categorias de entradas e saídas
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(tab)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova categoria
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'INCOME'}
          onClick={() => setTab('INCOME')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'INCOME'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
          }`}
        >
                  <TrendingUp aria-hidden="true" className="h-4 w-4" />
          Entrada
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'EXPENSE'}
          onClick={() => setTab('EXPENSE')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'EXPENSE'
              ? 'bg-rose-500 text-white shadow'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
          }`}
        >
                  <TrendingDown aria-hidden="true" className="h-4 w-4" />
          Saída
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-700 dark:bg-zinc-800">
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Tags aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
            Nenhuma categoria {tab === 'EXPENSE' ? 'de saída' : 'de entrada'}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((cat, index) => (
              <li
                key={cat.id}
                data-drag-index={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  dragOverIndex === index ? 'border-t-2 border-t-emerald-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    data-touch-grip
                    className="flex h-10 w-10 touch-none cursor-grab items-center justify-center text-zinc-300 transition hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                  >
                    <GripVertical aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                    style={{ backgroundColor: cat.color }}
                  >
                    <CategoryIcon icon={cat.icon} className="h-4 w-4 text-white" />
                  </div>
                </div>
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {cat.name}
                </span>
                <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Editar"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-red-500 hover:text-white dark:text-zinc-300 dark:hover:text-white"
                    aria-label="Excluir"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Editar categoria' : 'Nova categoria'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="catName" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
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

              <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                  type="button"
                  role="tab"
                  aria-selected={newType === 'INCOME'}
                  onClick={() => setNewType('INCOME')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    newType === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
                  }`}
                >
          <TrendingUp aria-hidden="true" className="h-4 w-4" />
                  Entrada
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={newType === 'EXPENSE'}
                  onClick={() => setNewType('EXPENSE')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    newType === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
                  }`}
                >
          <TrendingDown aria-hidden="true" className="h-4 w-4" />
                  Saída
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Cor
                </label>
                <ColorPicker value={newColor} onChange={setNewColor} />
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
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-500'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                      aria-label={`Ícone: ${ic.replace(/-/g, ' ')}`}
                    >
                      <CategoryIcon icon={ic} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {editing ? 'Salvar alterações' : 'Criar categoria'}
              </button>
            </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir a categoria "${confirmTarget?.name ?? ''}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}
