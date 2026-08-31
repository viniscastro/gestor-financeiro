'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle, Upload, Trash2 } from 'lucide-react'
import Modal from '@/components/modal'
import Select from '@/components/select'
import { parseCsv, parseOfx, type ParsedTransaction } from '@/lib/import'
import { formatBRL } from '@/lib/format'
import type { AccountDto, CategoryDto } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  accounts: AccountDto[]
  categories: CategoryDto[]
}

export default function ImportModal({ open, onClose, onSaved, accounts, categories }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedTransaction[]>([])
  const [error, setError] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [importing, setImporting] = useState(false)

  function reset() {
    setFileName('')
    setParsed([])
    setError('')
    setAccountId(accounts[0]?.id ?? '')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setError('')
    setParsed([])

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'ofx' && ext !== 'qfx') {
      setError('Formato nao suportado. Use CSV ou OFX.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      let items: ParsedTransaction[] = []
      if (ext === 'csv') {
        items = parseCsv(content)
      } else {
        items = parseOfx(content)
      }
      if (items.length === 0) {
        setError('Nenhuma transacao encontrada no arquivo.')
        return
      }
      items.sort((a, b) => a.date.localeCompare(b.date))
      setParsed(items)
    }
    reader.onerror = () => setError('Nao foi possivel ler o arquivo.')
    reader.readAsText(file, 'utf-8')
  }

  async function handleImport() {
    if (!accountId || parsed.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          transactions: parsed.map((t) => ({
            date: t.date,
            description: t.description,
            amountCents: t.amountCents,
            type: t.rawType,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Erro ao importar')
        return
      }
      toast.success(`${parsed.length} transacoes importadas`, { duration: 10000 })
      reset()
      onSaved()
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setImporting(false)
    }
  }

  const totalIncome = parsed
    .filter((t) => t.rawType === 'INCOME')
    .reduce((s, t) => s + t.amountCents, 0)
  const totalExpense = parsed
    .filter((t) => t.rawType === 'EXPENSE')
    .reduce((s, t) => s + t.amountCents, 0)

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))

  return (
    <Modal open={open} onClose={handleClose} title="Importar extrato" wide>
      <div className="space-y-5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Importe transacoes de extratos bancarios em CSV ou OFX.
        </p>

        <div>
          <label
            htmlFor="import-file"
            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center transition hover:border-emerald-400 dark:border-zinc-600 dark:hover:border-emerald-500"
          >
            <Upload aria-hidden="true" className="h-6 w-6 text-zinc-400" />
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              {fileName || 'Clique para selecionar CSV ou OFX'}
            </span>
          </label>
          <input
            ref={inputRef}
            id="import-file"
            type="file"
            accept=".csv,.ofx,.qfx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        {parsed.length > 0 && (
          <>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Transacoes</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{parsed.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Entradas</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(totalIncome)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Saidas</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatBRL(totalExpense)}</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Descricao</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((t, i) => (
                    <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-700/50">
                      <td className="whitespace-nowrap px-3 py-1.5 text-zinc-600 dark:text-zinc-400">
                        {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="truncate px-3 py-1.5 text-zinc-900 dark:text-zinc-100">{t.description}</td>
                      <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${t.rawType === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.rawType === 'INCOME' ? '+' : '-'}{formatBRL(t.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && (
                <p className="px-3 py-2 text-xs text-zinc-500">
                  ...e mais {parsed.length - 50} transacoes
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Conta de destino
              </label>
              <Select
                value={accountId}
                onChange={setAccountId}
                options={accountOptions}
                placeholder="Selecione..."
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !accountId}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload aria-hidden="true" className="h-4 w-4" />
                )}
                Importar {parsed.length} transacoes
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
