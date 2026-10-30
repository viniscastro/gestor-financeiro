'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  GripVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
} from '@/components/icons'
import type { TransactionType } from '@/lib/types'
import type { CategoryDto } from '@/lib/types'
import CategoryIcon from '@/components/category-icon'
import ConfirmDialog from '@/components/confirm-dialog'
import Modal from '@/components/modal'
import Select from '@/components/select'
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
  const [newParentId, setNewParentId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [tab, setTab] = useState<TransactionType>('INCOME')
  const [editing, setEditing] = useState<CategoryDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<CategoryDto | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const dragItem = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchDragging, setTouchDragging] = useState(false)
  const touchCurrentIndex = useRef<number | null>(null)

  useEffect(() => {
    function onStart(e: TouchEvent) {
      const grip = (e.target as HTMLElement).closest('[data-touch-grip]')
      if (!grip) return
      e.preventDefault()
      const item = grip.closest('[data-drag-index]')
      if (!item) return
      const idx = Number(item.getAttribute('data-drag-index'))
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
      const item = el?.closest('[data-drag-index]') as HTMLElement | null
      if (item) {
        const idx = Number(item.getAttribute('data-drag-index'))
        if (!isNaN(idx)) setDragOverIndex(idx)
      }
    }

    function onEnd() {
      if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
        const filteredNow = categories.filter((c) => c.type === tab)
        const [moved] = filteredNow.splice(dragItem.current, 1)
        filteredNow.splice(dragOverIndex, 0, moved)

        const others = categories.filter((c) => c.type !== tab)
        const updated = tab === 'INCOME' ? [...filteredNow, ...others] : [...others, ...filteredNow]
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
  }, [touchDragging, dragOverIndex, categories, tab])

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

  function openCreate(type: TransactionType, parentId?: string) {
    setEditing(null)
    setNewName('')
    setNewType(type)
    setNewColor(CATEGORY_COLORS[0])
    setNewIcon(CATEGORY_ICONS[0])
    setNewParentId(parentId ?? '')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(cat: CategoryDto) {
    setEditing(cat)
    setNewName(cat.name)
    setNewType(cat.type)
    setNewColor(cat.color)
    setNewIcon(cat.icon)
    setNewParentId(cat.parentId ?? '')
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
        parentId: newParentId || null,
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

    const filteredNow = categories.filter((c) => c.type === tab)
    const [moved] = filteredNow.splice(dragItem.current, 1)
    filteredNow.splice(dragOverIndex, 0, moved)

    const others = categories.filter((c) => c.type !== tab)
    const updated = tab === 'INCOME' ? [...filteredNow, ...others] : [...others, ...filteredNow]
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
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'

  const filtered = categories.filter((c) => c.type === tab)

  const parentOptions = filtered.map((c) => ({ value: c.id, label: c.name }))

  function renderCategory(cat: CategoryDto, index: number, depth: number = 0) {
    const hasChildren = cat.children.length > 0
    const isCollapsed = collapsed.has(cat.id)
    return (
      <Fragment key={cat.id}>
        <li
          data-drag-index={depth === 0 ? index : undefined}
          draggable={depth === 0}
          onDragStart={depth === 0 ? () => handleDragStart(index) : undefined}
          onDragEnter={depth === 0 ? () => handleDragEnter(index) : undefined}
          onDragEnd={depth === 0 ? handleDragEnd : undefined}
          onDragOver={depth === 0 ? handleDragOver : undefined}
          className={`group flex items-center gap-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
            depth === 0 && dragOverIndex === index ? 'border-t-2 border-t-brand-500' : ''
          }`}
          style={{ paddingLeft: `${16 + depth * 40}px`, paddingRight: '16px' }}
        >
          {depth === 0 && (
            <div
              data-touch-grip
              className="flex h-10 w-10 shrink-0 touch-none cursor-grab items-center justify-center text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
            >
              <GripVertical aria-hidden="true" className="h-5 w-5" />
            </div>
          )}
          {depth > 0 && (
            <span className="flex w-4 shrink-0 items-center text-slate-300 dark:text-slate-600">
              <span className="block h-px w-4 bg-slate-300 dark:bg-slate-600" />
            </span>
          )}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed((prev) => {
                  const next = new Set(prev)
                  if (next.has(cat.id)) next.delete(cat.id)
                  else next.add(cat.id)
                  return next
                })
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center self-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label={isCollapsed ? 'Expandir subcategorias' : 'Recolher subcategorias'}
            >
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              />
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
            style={{ backgroundColor: cat.color }}
          >
            <CategoryIcon icon={cat.icon} className="h-4 w-4 text-white" />
          </div>
          <span className="flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {cat.name}
          </span>
          {depth > 0 && (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              sub
            </span>
          )}
          <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {depth === 0 && (
              <button
                type="button"
                onClick={() => openCreate(tab, cat.id)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Adicionar subcategoria"
                title="Adicionar subcategoria"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => openEdit(cat)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Editar"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cat)}
              className="rounded-lg p-2 text-slate-500 hover:bg-rose-500 hover:text-white dark:text-slate-300 dark:hover:text-white"
              aria-label="Excluir"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </li>
        {hasChildren && !isCollapsed && cat.children.map((child, ci) => renderCategory(child, ci, depth + 1))}
      </Fragment>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Categorias</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Gerencie as categorias de entradas e saídas
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(tab)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nova categoria
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'INCOME'}
          onClick={() => setTab('INCOME')}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === 'INCOME'
              ? 'bg-brand-600 text-white shadow'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'
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
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'
          }`}
        >
          <TrendingDown aria-hidden="true" className="h-4 w-4" />
          Saída
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 dark:border-slate-700 dark:bg-slate-800">
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-brand-600 dark:text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <Tags aria-hidden="true" className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Nenhuma categoria {tab === 'EXPENSE' ? 'de saída' : 'de entrada'}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((cat, index) => renderCategory(cat, index))}
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
                <label htmlFor="catName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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

              <div>
                <label htmlFor="catParent" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Categoria pai
                </label>
                <Select
                  id="catParent"
                  value={newParentId}
                  onChange={setNewParentId}
                  placeholder="Nenhuma (categoria raiz)"
                  options={parentOptions}
                />
              </div>

              <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  role="tab"
                  aria-selected={newType === 'INCOME'}
                  onClick={() => { setNewType('INCOME'); setNewParentId('') }}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    newType === 'INCOME'
                      ? 'bg-brand-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'
                  }`}
                >
          <TrendingUp aria-hidden="true" className="h-4 w-4" />
                  Entrada
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={newType === 'EXPENSE'}
                  onClick={() => { setNewType('EXPENSE'); setNewParentId('') }}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    newType === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'
                  }`}
                >
          <TrendingDown aria-hidden="true" className="h-4 w-4" />
                  Saída
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cor
                </label>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                          ? 'bg-brand-500 text-white ring-2 ring-brand-500'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                      aria-label={`Ícone: ${ic.replace(/-/g, ' ')}`}
                    >
                      <CategoryIcon icon={ic} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
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
