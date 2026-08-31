import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function generateMonthlyReportPdf(
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
): Buffer {
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

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

export function buildReportEmailHtml(
  userName: string,
  monthLabel: string,
  totals: { income: number; expense: number; balance: number }
): string {
  const balanceColor = totals.balance >= 0 ? '#10b981' : '#ef4444'
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:32px 16px">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:20px 24px">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700">🐷 Gestor Financeiro</p>
        </div>
        <div style="padding:28px 24px">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b">Relatório Mensal</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#52525b">
            Olá ${userName}! Aqui está o resumo financeiro de <strong>${monthLabel}</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:10px 12px;background:#ecfdf5;border-radius:8px 0 0 8px">
                <p style="margin:0;font-size:12px;color:#059669">Entradas</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#059669">${fmt(totals.income)}</p>
              </td>
              <td style="padding:10px 12px;background:#fef2f2;border-radius:0 8px 8px 0">
                <p style="margin:0;font-size:12px;color:#dc2626">Saídas</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#dc2626">${fmt(totals.expense)}</p>
              </td>
            </tr>
          </table>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
            <p style="margin:0;font-size:12px;color:#71717a">Resultado do mês</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:${balanceColor}">${fmt(totals.balance)}</p>
          </div>
          <p style="margin:0;font-size:12px;color:#a1a1aa">
            O relatório completo está anexado a este e-mail.<br>
            Para desativar os relatórios mensais, acesse sua conta no Gestor Financeiro.
          </p>
        </div>
      </div>
    </div>
  `
}
