import ExcelJS from 'exceljs'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF10B981' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF9FAFB' },
}
const CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = CELL_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 28
}

function autoWidth(ws: ExcelJS.Worksheet, min = 10, max = 40) {
  ws.columns.forEach((col) => {
    if (!col || !col.eachCell) return
    let longest = min
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length
      if (len > longest) longest = len
    })
    col.width = Math.min(longest + 3, max)
  })
}

function downloadBuffer(filename: string, buffer: ArrayBuffer) {
  if (typeof document === 'undefined') return
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function applyRowStyle(row: ExcelJS.Row, index: number) {
  if (index % 2 === 1) {
    row.eachCell((cell) => { cell.fill = ALT_ROW_FILL })
  }
  row.eachCell((cell) => {
    cell.border = CELL_BORDER
    cell.alignment = { vertical: 'middle' }
  })
}

const GREEN = { argb: 'FF10B981' }
const RED = { argb: 'FFF43F5E' }
const GRAY = { argb: 'FF71717A' }

export async function exportTransactionsToExcel(
  rows: Array<{
    date: string
    type: string
    description: string
    amount: number
    accountName: string
    categoryName: string
  }>
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Transações', { views: [{ state: 'frozen', ySplit: 1 }] })

  ws.columns = [
    { header: 'Data', key: 'date', width: 14 },
    { header: 'Tipo', key: 'type', width: 15 },
    { header: 'Descrição', key: 'description', width: 35 },
    { header: 'Valor', key: 'amount', width: 18 },
    { header: 'Conta', key: 'accountName', width: 20 },
    { header: 'Categoria', key: 'categoryName', width: 20 },
  ]

  styleHeaderRow(ws.getRow(1))

  rows.forEach((r, i) => {
    const row = ws.addRow({
      date: r.date,
      type: r.type,
      description: r.description,
      amount: r.amount / 100,
      accountName: r.accountName,
      categoryName: r.categoryName,
    })

    row.getCell('amount').numFmt = '#,##0.00'

    const typeCell = row.getCell('type')
    if (r.type === 'Entrada') {
      typeCell.font = { color: GREEN, bold: true }
    } else if (r.type === 'Saída') {
      typeCell.font = { color: RED, bold: true }
    } else {
      typeCell.font = { color: GRAY }
    }

    applyRowStyle(row, i)
  })

  autoWidth(ws)

  const buffer = await wb.xlsx.writeBuffer()
  downloadBuffer(`transacoes_${new Date().toISOString().slice(0, 10)}.xlsx`, buffer)
}

export async function exportStatsToExcel(
  monthly: Array<{ label: string; income: number; expense: number }>,
  byCategory: Array<{ label: string; color: string; amount: number }>,
  totalExpense: number
) {
  const wb = new ExcelJS.Workbook()

  if (monthly.length > 0) {
    const ws = wb.addWorksheet('Resumo Mensal', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    ws.columns = [
      { header: 'Mês', key: 'label', width: 22 },
      { header: 'Entradas', key: 'income', width: 18 },
      { header: 'Saídas', key: 'expense', width: 18 },
      { header: 'Resultado', key: 'result', width: 18 },
    ]

    styleHeaderRow(ws.getRow(1))

    monthly.forEach((m, i) => {
      const row = ws.addRow({
        label: m.label,
        income: m.income / 100,
        expense: m.expense / 100,
        result: (m.income - m.expense) / 100,
      })

      row.getCell('income').numFmt = '#,##0.00'
      row.getCell('expense').numFmt = '#,##0.00'
      row.getCell('result').numFmt = '#,##0.00'

      const result = m.income - m.expense
      row.getCell('result').font = { color: result >= 0 ? GREEN : RED, bold: true }

      applyRowStyle(row, i)
    })

    autoWidth(ws)

    const totalsRow = ws.addRow({
      label: 'TOTAL',
      income: monthly.reduce((s, m) => s + m.income, 0) / 100,
      expense: monthly.reduce((s, m) => s + m.expense, 0) / 100,
      result: monthly.reduce((s, m) => s + m.income - m.expense, 0) / 100,
    })

    totalsRow.getCell('label').font = { bold: true }
    totalsRow.getCell('income').numFmt = '#,##0.00'
    totalsRow.getCell('income').font = { bold: true }
    totalsRow.getCell('expense').numFmt = '#,##0.00'
    totalsRow.getCell('expense').font = { bold: true }
    totalsRow.getCell('result').numFmt = '#,##0.00'
    const totalResult = monthly.reduce((s, m) => s + m.income - m.expense, 0)
    totalsRow.getCell('result').font = { bold: true, color: totalResult >= 0 ? GREEN : RED }

    const totalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    totalsRow.eachCell((cell) => {
      cell.fill = totalFill
      cell.border = CELL_BORDER
      cell.alignment = { vertical: 'middle' }
    })
  }

  if (byCategory.length > 0) {
    const ws = wb.addWorksheet('Despesas por Categoria', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    ws.columns = [
      { header: 'Categoria', key: 'label', width: 25 },
      { header: 'Valor', key: 'amount', width: 18 },
      { header: 'Percentual', key: 'pct', width: 14 },
    ]

    styleHeaderRow(ws.getRow(1))

    byCategory.forEach((c, i) => {
      const pct = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0
      const row = ws.addRow({
        label: c.label,
        amount: c.amount / 100,
        pct: `${pct.toFixed(1).replace('.', ',')}%`,
      })

      row.getCell('amount').numFmt = '#,##0.00'
      row.getCell('label').font = { color: { argb: c.color.replace('#', 'FF') }, bold: true }

      applyRowStyle(row, i)
    })

    autoWidth(ws)

    const totalRow = ws.addRow({
      label: 'TOTAL',
      amount: totalExpense / 100,
      pct: '100%',
    })

    totalRow.getCell('label').font = { bold: true }
    totalRow.getCell('amount').numFmt = '#,##0.00'
    totalRow.getCell('amount').font = { bold: true }
    totalRow.getCell('pct').font = { bold: true }

    const totalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    totalRow.eachCell((cell) => {
      cell.fill = totalFill
      cell.border = CELL_BORDER
      cell.alignment = { vertical: 'middle' }
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  downloadBuffer(`relatorio_${new Date().toISOString().slice(0, 10)}.xlsx`, buffer)
}
