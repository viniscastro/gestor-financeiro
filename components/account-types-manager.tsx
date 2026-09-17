'use client'

import { useEffect, useRef, useState } from 'react'
import { GripVertical, LoaderCircle, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import type { AccountTypeDto } from '@/lib/types'
import CategoryIcon from '@/components/category-icon'
import ConfirmDialog from '@/components/confirm-dialog'
import Modal from '@/components/modal'
import { toast } from 'sonner'
import { ACCOUNT_TYPE_ICONS, CATEGORY_COLORS } from '@/lib/categories'
import ColorPicker from '@/components/color-picker'

export default function AccountTypesManager() {
  const [types, setTypes] = useState<AccountTypeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0])
  const [newIcon, setNewIcon] = useState<string>(ACCOUNT_TYPE_ICONS[0])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState<AccountTypeDto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<AccountTypeDto | null>(null)
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
        const updated = [...types]
        const [moved] = updated.splice(dragItem.current, 1)
        updated.splice(dragOverIndex, 0, moved)
        setTypes(updated)
        fetch('/api/account-types', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: updated.map((t) => t.id) }),
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
  }, [touchDragging, dragOverIndex, types])

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/account-types', { cache: 'no-store' })
        if (!res.ok) throw new Error('Erro ao carregar')
        const data = (await res.json()) as AccountTypeDto[]
        if (!cancelled) {
          setTypes(data)
          setError('')
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar os tipos de conta.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  async function reload() {
    try {
      const res = await fetch('/api/account-types', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar')
      setTypes((await res.json()) as AccountTypeDto[])
      setError('')
    } catch {
      setError('Não foi possível carregar os tipos de conta.')
    }
  }

  function openCreate() {
    setEditing(null)
    setNewName('')
    setNewColor(CATEGORY_COLORS[0])
    setNewIcon(ACCOUNT_TYPE_ICONS[0])
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(type: AccountTypeDto) {
    setEditing(type)
    setNewName(type.name)
    setNewColor(type.color)
    setNewIcon(type.icon)
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = { name: newName, color: newColor, icon: newIcon }
      const res = await fetch(
        editing ? `/api/account-types/${editing.id}` : '/api/account-types',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error ?? 'Erro ao salvar tipo')
        return
      }
      setModalOpen(false)
      setEditing(null)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(type: AccountTypeDto) {
    setConfirmTarget(type)
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    const res = await fetch(`/api/account-types/${confirmTarget.id}`, { method: 'DELETE' })
    setConfirmOpen(false)
    setConfirmTarget(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Erro ao excluir o tipo.')
      return
    }
    await reload()
    toast.success('Tipo excluído')
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
    const updated = [...types]
    const [moved] = updated.splice(dragItem.current, 1)
    updated.splice(dragOverIndex, 0, moved)
    setTypes(updated)
    fetch('/api/account-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map((t) => t.id) }),
    })
    setDragOverIndex(null)
    dragItem.current = null
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Tipos de conta</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-300">
            Gerencie os tipos usados pelas suas contas
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Novo tipo
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 dark:border-zinc-700 dark:bg-zinc-800">
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <Tag aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-300">
            Nenhum tipo de conta ainda.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {types.map((type, index) => (
              <li
                key={type.id}
                data-drag-index={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                className={`group flex items-center gap-2 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  dragOverIndex === index ? 'border-t-2 border-t-emerald-500' : ''
                }`}
                style={{ paddingLeft: '16px', paddingRight: '16px' }}
              >
                <div
                  data-touch-grip
                  className="flex h-10 w-10 shrink-0 touch-none cursor-grab items-center justify-center text-zinc-300 transition hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                >
                  <GripVertical aria-hidden="true" className="h-5 w-5" />
                </div>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  style={{ backgroundColor: type.color }}
                >
                  <CategoryIcon icon={type.icon} className="h-4 w-4 text-white" />
                </div>
                <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {type.name}
                </span>
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {type.slug}
                </span>
                <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(type)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Editar"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(type)}
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
          title={editing ? 'Editar tipo de conta' : 'Novo tipo de conta'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="typeName" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nome <span className="text-rose-500">*</span><span className="sr-only"> (obrigatório)</span>
              </label>
              <input
                id="typeName"
                type="text"
                placeholder="Ex: Conta conjunta, Vale alimentação..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                maxLength={40}
                className={inputClass}
              />
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
                {ACCOUNT_TYPE_ICONS.map((ic) => (
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
              {editing ? 'Salvar alterações' : 'Criar tipo'}
            </button>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir tipo de conta"
        message={`Tem certeza que deseja excluir o tipo "${confirmTarget?.name ?? ''}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </div>
  )
}