'use client'

import { useRef, useState } from 'react'
import { Camera, LoaderCircle, ScanLine, X } from 'lucide-react'
import Modal from '@/components/modal'
import { parseReceiptText, type ReceiptData } from '@/lib/receipt'

type Props = {
  open: boolean
  onClose: () => void
  onParsed: (data: ReceiptData) => void
}

export default function ReceiptScanner({ open, onClose, onParsed }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ReceiptData | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem válida')
      return
    }
    setError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function runOcr() {
    if (!preview) return
    setProcessing(true)
    setError('')
    try {
      const Tesseract = await import('tesseract.js')
      const { data } = await Tesseract.recognize(preview, 'por')
      const parsed = parseReceiptText(data.text)
      setResult(parsed)
    } catch {
      setError('Erro ao processar a imagem. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  function handleUse() {
    if (result) onParsed(result)
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Escanear nota fiscal">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-zinc-500 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
          >
            <Camera className="h-10 w-10" />
            <span className="text-sm font-medium">Tirar foto ou selecionar imagem</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              JPG, PNG — nota fiscal ou recibo
            </span>
          </button>
        ) : (
          <>
            <div className="relative">
              <img
                src={preview}
                alt="Nota fiscal"
                className="max-h-64 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
              />
              {!processing && (
                <button
                  type="button"
                  onClick={reset}
                  className="absolute right-2 top-2 rounded-full bg-zinc-900/60 p-1 text-white transition hover:bg-zinc-900/80"
                  aria-label="Remover imagem"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {processing ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <LoaderCircle className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Processando imagem...
                </span>
              </div>
            ) : result ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Dados extraídos:
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-zinc-500">Valor</span>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {result.amount || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Data</span>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {result.date || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Descrição</span>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {result.description || '—'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUse}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Usar dados
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={runOcr}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <ScanLine className="h-4 w-4" />
                Extrair dados
              </button>
            )}
          </>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
