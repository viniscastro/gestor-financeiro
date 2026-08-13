'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '@/lib/format'

export type MonthlyPoint = {
  label: string
  income: number
  expense: number
}

export type CategoryPoint = {
  category: string
  label: string
  color: string
  amount: number
}

type Props = {
  monthly: MonthlyPoint[]
  byCategory: CategoryPoint[]
  totalExpense: number
}

type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: string | number
  color?: string
  payload?: { color?: string; name?: string | number }
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-zinc-300">{label}</p>
      {payload.map((entry: TooltipEntry) => (
        <p key={String(entry.dataKey)} style={{ color: entry.color }}>
          {entry.name}: {formatBRL(Number(entry.value))}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipEntry[]
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p style={{ color: entry.payload?.color }}>{entry.name}</p>
      <p className="text-zinc-300">{formatBRL(Number(entry.value))}</p>
    </div>
  )
}

export default function StatisticsCharts({ monthly, byCategory, totalExpense }: Props) {
  const hasMonthly = monthly.some((m) => m.income > 0 || m.expense > 0)
  const hasCategories = byCategory.length > 0

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-1 text-base font-semibold text-white">Entradas vs. Saídas</h2>
        <p className="mb-4 text-xs text-zinc-500">Últimos 6 meses</p>
        {hasMonthly ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `R$ ${(v / 100).toLocaleString('pt-BR')}`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                <Legend />
                <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-zinc-500">
            Adicione transações para ver o gráfico mensal.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-1 text-base font-semibold text-white">Gastos por categoria</h2>
        <p className="mb-4 text-xs text-zinc-500">
          {totalExpense > 0
            ? `Total de saídas: ${formatBRL(totalExpense)}`
            : 'Distribuição das suas saídas'}
        </p>
        {hasCategories ? (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {byCategory.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {byCategory.map((c) => {
                const pct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0
                return (
                  <li key={c.category} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="flex-1 truncate text-zinc-300">{c.label}</span>
                    <span className="text-zinc-400">{pct.toFixed(0)}%</span>
                    <span className="w-28 text-right font-medium text-zinc-100">
                      {formatBRL(c.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="py-16 text-center text-sm text-zinc-500">
            Adicione saídas para ver os gastos por categoria.
          </p>
        )}
      </div>
    </div>
  )
}
