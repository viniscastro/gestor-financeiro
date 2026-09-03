import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function footerTotal(doc: jsPDF, y: number, amount: number) {
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text(`Total: ${fmt(amount)}`, 15, y)
}

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
  }>
): Buffer {
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
