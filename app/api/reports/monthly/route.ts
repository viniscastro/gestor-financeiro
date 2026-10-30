import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMonthlyReportPdf, buildReportEmailHtml } from '@/lib/pdf-server'
import { descriptionWithInstallment } from '@/lib/format'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    await sendMonthlyReport(session.user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar relatório'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Chamado pelo cron da Vercel, que envia "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // O cron roda no dia 1: o relatório é o do mês que acabou de fechar.
  const now = new Date()
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const users = await prisma.user.findMany({
    where: { monthlyReport: true },
    select: { id: true },
  })

  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      await sendMonthlyReport(user.id, previousMonth)
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed })
}

async function sendMonthlyReport(userId: string, reference: Date = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, monthlyReport: true },
  })
  if (!user || !user.monthlyReport) return

  const year = reference.getFullYear()
  const month = reference.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

  const monthLabel = startOfMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      account: { select: { name: true } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: 'asc' },
  })

  let monthIncome = 0
  let monthExpense = 0

  const rows = transactions.map((t) => {
    const isTransfer = Boolean(t.transferGroupId)
    const typeName = isTransfer ? 'Transferencia' : t.transactionType === 'INCOME' ? 'Entrada' : 'Saida'

    if (!isTransfer) {
      if (t.transactionType === 'INCOME') monthIncome += t.amount
      else monthExpense += t.amount
    }

    return {
      date: t.date.toLocaleDateString('pt-BR'),
      type: typeName,
      description: descriptionWithInstallment(t.description, t.installmentCurrent, t.installmentTotal),
      amount: t.amount,
      accountName: t.account?.name ?? '—',
      categoryName: t.category?.name ?? (isTransfer ? 'Transferencia' : 'Sem categoria'),
    }
  })

  const pdfBuffer = generateMonthlyReportPdf(
    monthLabel,
    { income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense },
    rows
  )

  const subject = `Relatório Mensal — ${monthLabel}`
  const html = buildReportEmailHtml(
    user.name ?? 'Usuário',
    monthLabel,
    { income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense }
  )

  await sendEmailWithAttachment(user.email, subject, html, pdfBuffer, `relatorio_${year}-${String(month + 1).padStart(2, '0')}.pdf`)
}

async function sendEmailWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachment: Buffer,
  filename: string
) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const { createTransport } = await import('nodemailer')
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: String(process.env.SMTP_PORT ?? '465') === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    const from = process.env.EMAIL_FROM ?? `Gestor Financeiro <${process.env.SMTP_USER}>`
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments: [{ filename, content: attachment }],
    })
    return
  }

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.EMAIL_FROM ?? 'Gestor Financeiro <onboarding@resend.dev>'
    const base64 = attachment.toString('base64')
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      attachments: [{ filename, content: base64 }],
    })
    if (error) throw new Error(`Falha ao enviar relatório (Resend): ${error.message}`)
    return
  }

  console.log(`[email-dev] Relatório mensal para ${to} (${filename})`)
}
