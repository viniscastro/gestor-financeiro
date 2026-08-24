'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: string | number
  color?: string
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
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
      <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      {payload.map((entry: TooltipEntry) => (
        <p key={String(entry.dataKey)} style={{ color: entry.color }}>
          {entry.name}: {formatBRL(Number(entry.value))}
        </p>
      ))}
    </div>
  )
}

const legendStyle = { color: 'var(--chart-axis)' }

export default function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  const hasData = data.some((m) => m.income > 0 || m.expense > 0)

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Tendência mensal
        </h2>
        <p className="mb-4 text-xs text-zinc-500">Entradas vs. saídas</p>
        <p className="py-12 text-center text-sm text-zinc-500">
          Adicione transações para ver a tendência.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Tendência mensal
      </h2>
      <p className="mb-4 text-xs text-zinc-500">Entradas vs. saídas — últimos 6 meses</p>
      <div
        className="h-56 sm:h-64"
        role="img"
        aria-label="Gráfico de barras comparando entradas e saídas nos últimos meses"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              stroke="var(--chart-axis)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="var(--chart-axis)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `R$ ${(v / 100).toLocaleString('pt-BR')}`}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
            />
            <Legend wrapperStyle={legendStyle} />
            <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
