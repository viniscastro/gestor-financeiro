'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, LoaderCircle, Trash2 } from 'lucide-react'
import Avatar from '@/components/avatar'

const MAX_DIMENSION = 512

function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas não suportado'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('Imagem inválida'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'))
    reader.readAsDataURL(file)
  })
}

export default function AvatarUpload({
  name,
  image,
}: {
  name: string
  image?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function saveImage(next: string | null) {
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/account/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível atualizar a foto')
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem (JPG, PNG, WebP...)')
      return
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      await saveImage(dataUrl)
    } catch {
      setError('Não foi possível processar a imagem')
    }
  }

  const baseButton =
    'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} image={image} className="h-16 w-16 text-lg" />
        {saving && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <LoaderCircle className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={saving}
            className={`${baseButton} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
          >
            <Camera className="h-4 w-4" />
            Trocar foto
          </button>
          {image && (
            <button
              type="button"
              onClick={() => saveImage(null)}
              disabled={saving}
              className={`${baseButton} border border-zinc-300 bg-white text-rose-600 hover:bg-rose-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-rose-500/10`}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          JPG, PNG ou WebP de até 2 MB.
        </p>
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
