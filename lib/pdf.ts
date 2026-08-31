import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename)
}

export function exportMonthlyReportPdf(
  monthLabel: string,
  totals: { income: number; expense: number; balance: number },
  rows: Array<{
    date: string
    type: string
    description: string
    amount: number
    accountName: string
    categoryName: string
  }>,
  categoryBreakdown: Array<{ label: string; color: string; amount: number }>
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatorio Mensal', pageW / 2, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(monthLabel, pageW / 2, 28, { align: 'center' })

  doc.setDrawColor(220)
  doc.line(15, 32, pageW - 15, 32)

  const sumY = 40
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('Resumo', 15, sumY)

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  doc.text('Entradas:', 15, sumY + 8)
  doc.setTextColor(16, 185, 129)
  doc.text(fmt(totals.income), 50, sumY + 8)

  doc.setTextColor(40)
  doc.text('Saidas:', 15, sumY + 15)
  doc.setTextColor(244, 63, 94)
  doc.text(fmt(totals.expense), 50, sumY + 15)

  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.text('Resultado:', 15, sumY + 22)
  doc.setTextColor(totals.balance >= 0 ? 16 : 244, totals.balance >= 0 ? 185 : 63, totals.balance >= 0 ? 129 : 94)
  doc.text(fmt(totals.balance), 50, sumY + 22)

  let tableStartY = sumY + 32

  if (categoryBreakdown.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Despesas por Categoria', 15, tableStartY)
    tableStartY += 4

    autoTable(doc, {
      startY: tableStartY,
      head: [['Categoria', 'Valor', '%']],
      body: categoryBreakdown.map((c) => [
        c.label,
        fmt(c.amount),
        totals.expense > 0 ? ((c.amount / totals.expense) * 100).toFixed(1).replace('.', ',') + '%' : '0%',
      ]),
      foot: [['TOTAL', fmt(totals.expense), '100%']],
      margin: { left: 15, right: 15 },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [243, 244, 246], textColor: [40, 40, 40], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 112 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
      },
    })

    tableStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('Transacoes', 15, tableStartY)
  tableStartY += 4

  autoTable(doc, {
    startY: tableStartY,
    head: [['Data', 'Tipo', 'Descricao', 'Valor', 'Conta', 'Categoria']],
    body: rows.map((r) => [
      r.date,
      r.type,
      r.description,
      fmt(r.amount),
      r.accountName,
      r.categoryName,
    ]),
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 19 },
      1: { cellWidth: 17 },
      2: { cellWidth: 41 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 28 },
      5: { cellWidth: 32 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 1) {
        const val = String(data.cell.raw)
        if (val === 'Entrada') data.cell.styles.textColor = [16, 185, 129]
        else if (val === 'Saida') data.cell.styles.textColor = [244, 63, 94]
        else data.cell.styles.textColor = [113, 113, 122]
      }
    },
  })

  const today = new Date().toISOString().slice(0, 10)
  downloadPdf(doc, `relatorio_${today}.pdf`)
}
