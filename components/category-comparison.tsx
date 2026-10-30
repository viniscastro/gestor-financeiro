'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, LoaderCircle, ArrowRightLeft } from '@/components/icons'
import { formatBRL } from '@/lib/format'

type ComparisonItem = {
  categoryId: string
  name: string
  color: string
  amount1: number
  amount2: number
  diff: number
  pct1: number
  pct2: number
}

const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

function getDefaultRanges() {
  const now = new Date()
  const thisStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const lastStart = `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}-01`
  const lastEnd = new Date(lastYear, lastMonth + 1, 0)
  const lastEndStr = `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}-${String(lastEnd.getDate()).padStart(2, '0')}`
  return { thisStart, lastStart, lastEnd: lastEndStr }
}

export default function CategoryComparison() {
  const defaults = getDefaultRanges()
  const [from1, setFrom1] = useState(defaults.lastStart)
  const [to1, setTo1] = useState(defaults.lastEnd)
  const [from2, setFrom2] = useState(defaults.thisStart)
  const [to2, setTo2] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<{ comparison: ComparisonItem[]; total1: number; total2: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/stats/category-comparison?from1=${from1}&to1=${to1}&from2=${from2}&to2=${to2}`
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Erro ao carregar')
        return
      }
      setData(await res.json())
    } catch {
      setError('Erro ao buscar dados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center gap-2">
        <ArrowRightLeft aria-hidden="true" className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Comparativo de categorias
        </h2>
      </div>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Compare os gastos entre dois períodos diferentes
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">Período 1</legend>
          <div className="flex gap-2">
            <input
              type="date"
              value={from1}
              onChange={(e) => setFrom1(e.target.value)}
              className={`w-full ${inputClass}`}
            />
            <input
              type="date"
              value={to1}
              onChange={(e) => setTo1(e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
        </fieldset>
        <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">Período 2</legend>
          <div className="flex gap-2">
            <input
              type="date"
              value={from2}
              onChange={(e) => setFrom2(e.target.value)}
              className={`w-full ${inputClass}`}
            />
            <input
              type="date"
              value={to2}
              onChange={(e) => setTo2(e.target.value)}
              className={`w-full ${inputClass}`}
            />
          </div>
        </fieldset>
      </div>

      <button
        type="button"
        onClick={fetchData}
        disabled={loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
        Comparar
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {data && data.comparison.length === 0 && (
        <p className="mt-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum gasto encontrado nos períodos selecionados.
        </p>
      )}

      {data && data.comparison.length > 0 && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Período 1: <span className="font-medium text-slate-700 dark:text-slate-300">{formatBRL(data.total1)}</span></span>
            <span>Total Período 2: <span className="font-medium text-slate-700 dark:text-slate-300">{formatBRL(data.total2)}</span></span>
          </div>

          <ul className="space-y-2">
            {data.comparison.map((item) => {
              const increased = item.diff > 0
              const same = item.diff === 0
              const maxAmount = Math.max(item.amount1, item.amount2, 1)
              return (
                <li
                  key={item.categoryId}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                    </div>
                    {!same && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-medium ${
                          increased
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {increased ? <ArrowUp aria-hidden="true" className="h-3 w-3" /> : <ArrowDown aria-hidden="true" className="h-3 w-3" />}
                        {Math.abs(((item.diff / (item.amount1 || 1)) * 100)).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{formatBRL(item.amount1)}</span>
                      <span className="text-slate-400">{item.pct1.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{formatBRL(item.amount2)}</span>
                      <span className="text-slate-400">{item.pct2.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 gap-x-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className="h-full rounded-full bg-slate-400 dark:bg-slate-500"
                        style={{ width: `${(item.amount1 / maxAmount) * 100}%` }}
                      />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(item.amount2 / maxAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" /> Período 1
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-500" /> Período 2
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
