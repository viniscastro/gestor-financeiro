import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { formatBRL, formatDateLong } from '@/lib/format'

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function nextOccurrence(dayOfMonth: number, from: Date): Date {
  const clamp = (year: number, month: number) =>
    Math.min(dayOfMonth, lastDayOfMonth(year, month))
  let date = new Date(
    from.getFullYear(),
    from.getMonth(),
    clamp(from.getFullYear(), from.getMonth())
  )
  if (date < startOfDay(from)) {
    const next = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    date = new Date(
      next.getFullYear(),
      next.getMonth(),
      clamp(next.getFullYear(), next.getMonth())
    )
  }
  return date
}

export function daysUntil(target: Date, from: Date): number {
  const a = startOfDay(from).getTime()
  const b = startOfDay(target).getTime()
  return Math.round((b - a) / 86_400_000)
}

export async function materializeRecurring(userId: string): Promise<void> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
  })
  if (rules.length === 0) return

  const now = new Date()
  const key = monthKey(now)
  const lastDay = lastDayOfMonth(now.getFullYear(), now.getMonth())

  for (const rule of rules) {
    const exists = await prisma.transaction.findFirst({
      where: { userId, recurringId: rule.id, occurrenceMonth: key },
      select: { id: true },
    })
    if (exists) continue

    await prisma.transaction.create({
      data: {
        transactionType: rule.type,
        description: rule.description,
        amount: rule.amountCents,
        date: new Date(
          now.getFullYear(),
          now.getMonth(),
          Math.min(rule.dayOfMonth, lastDay)
        ),
        userId,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        recurringId: rule.id,
        occurrenceMonth: key,
      },
    })
  }
}

export type UpcomingBill = {
  id: string
  description: string
  amountCents: number
  type: string
  categoryName: string | null
  categoryColor: string | null
  accountName: string
  accountColor: string
  date: Date
  days: number
  notifyDaysBefore: number
  lastNotifiedAt: Date | null
}

export async function getUpcomingBills(
  userId: string,
  withinDays = 30
): Promise<UpcomingBill[]> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
    include: {
      account: { select: { name: true, color: true } },
      category: { select: { name: true, color: true } },
    },
  })

  const now = new Date()
  return rules
    .map((rule) => ({
      id: rule.id,
      description: rule.description,
      amountCents: rule.amountCents,
      type: rule.type,
      categoryName: rule.category?.name ?? null,
      categoryColor: rule.category?.color ?? null,
      accountName: rule.account?.name ?? '',
      accountColor: rule.account?.color ?? '#10b981',
      date: nextOccurrence(rule.dayOfMonth, now),
      days: 0,
      notifyDaysBefore: rule.notifyDaysBefore,
      lastNotifiedAt: rule.lastNotifiedAt,
    }))
    .map((bill) => ({ ...bill, days: daysUntil(bill.date, now) }))
    .filter((bill) => bill.days >= 0 && bill.days <= withinDays)
    .sort((a, b) => a.days - b.days)
}

export async function notifyUpcomingBills(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })
  if (!user?.email) return

  const bills = await getUpcomingBills(userId)
  const toNotify = bills.filter((bill) => {
    if (bill.days > bill.notifyDaysBefore) return false
    if (bill.lastNotifiedAt && bill.lastNotifiedAt >= startOfDay(bill.date)) return false
    return true
  })

  if (toNotify.length === 0) return

  const items = toNotify.map(
    (bill) => `
      <li style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f4f4f5">
        <div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#18181b">${bill.description}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#71717a">
            ${bill.categoryName ?? 'Sem categoria'} · ${bill.accountName}
          </p>
        </div>
        <div style="text-align:right">
          <p style="margin:0;font-size:14px;font-weight:700;color:#059669">${formatBRL(bill.amountCents)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#71717a">${formatDateLong(bill.date)}</p>
        </div>
      </li>`
  )

  const greeting = user.name ? `Olá, ${user.name.split(' ')[0]}!` : 'Olá!'

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:32px 16px">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:20px 24px">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700">🐷 Gestor Financeiro</p>
        </div>
        <div style="padding:28px 24px">
          <h1 style="margin:0 0 8px;font-size:20px;color:#18181b">Contas a vencer</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#52525b">
            ${greeting} Lembrete das suas despesas recorrentes dos próximos dias:
          </p>
          <ul style="list-style:none;margin:0;padding:0">${items.join('')}</ul>
        </div>
      </div>
    </div>
  `

  const subject =
    toNotify.length === 1
      ? 'Conta a vencer: ' + toNotify[0].description
      : `${toNotify.length} contas a vencer nos próximos dias`

  await sendEmail(user.email, subject, html)
  await prisma.recurringRule.updateMany({
    where: { id: { in: toNotify.map((bill) => bill.id) } },
    data: { lastNotifiedAt: new Date() },
  })
}
