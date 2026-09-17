import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename)
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function footerTotal(doc: jsPDF, y: number, amount: number) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text(`Total: ${fmt(amount)}`, pageW - 15, y, { align: 'right' })
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
  }>
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  const exits = rows.filter((r) => r.type === 'Saida')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 17, 17)
  doc.text('Relatório Mensal', 15, 22)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(85, 85, 85)
  doc.text(monthLabel, 15, 30)

  autoTable(doc, {
    startY: 42,
    head: [['DATA', 'PRODUTO', 'VALOR']],
    body: exits.map((r) => [r.date, r.description, fmt(r.amount)]),
    margin: { left: 15, right: 15 },
    theme: 'plain',
    headStyles: {
      fontSize: 8,
      fontStyle: 'bold',
      textColor: [136, 136, 136],
      fillColor: [255, 255, 255],
      lineColor: [221, 221, 221],
      lineWidth: 0.6,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [17, 17, 17],
      fillColor: [255, 255, 255],
      lineColor: [221, 221, 221],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 121 },
      2: { cellWidth: 29 },
    },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  footerTotal(doc, finalY + 12, totals.expense)

  const today = new Date().toISOString().slice(0, 10)
  downloadPdf(doc, `relatorio_${today}.pdf`)
}
