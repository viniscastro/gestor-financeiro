import { prisma } from '@/lib/prisma'
import { formatBRL } from '@/lib/format'
import webPush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string
) {
  try {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Notification" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "message" TEXT NOT NULL, "read" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"))`.catch(() => {})
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")`.catch(() => {})
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt")`.catch(() => {})

    await prisma.notification.create({
      data: { userId, type, title, message },
    })

    sendPushNotification(userId, { title, body: message, tag: `notification-${type}`, type })
  } catch (err) {
    console.error('[createNotification]', err)
  }
}

async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; tag?: string; type?: string }
) {
  if (!vapidPublicKey || !vapidPrivateKey) return

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    })

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            tag: payload.tag || 'gestor-notification',
            type: payload.type || '',
            url: '/dashboard',
          })
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error('[sendPushNotification]', err)
        }
      }
    }
  } catch (err) {
    console.error('[sendPushNotification]', err)
  }
}

export async function notifyTransaction(
  userId: string,
  type: 'INCOME' | 'EXPENSE',
  description: string,
  amountCents: number
) {
  const label = type === 'INCOME' ? 'Entrada registrada' : 'Saída registrada'
  const sign = type === 'INCOME' ? '+' : '-'
  const message = `${sign} ${formatBRL(amountCents)} — ${description}`
  await createNotification(userId, type, label, message)
}

export async function notifyBillWarning(
  userId: string,
  bills: Array<{
    description: string
    amountCents: number
    date: Date
    days: number
  }>
) {
  if (bills.length === 0) return

  const existing = await prisma.notification.findMany({
    where: { userId, type: 'BILL', read: false },
    select: { message: true },
  })
  const existingMessages = new Set(existing.map((n) => n.message))

  for (const bill of bills) {
    const dayLabel = bill.days === 0
      ? 'vence hoje'
      : bill.days === 1
        ? 'vence amanhã'
        : `vence em ${bill.days} dias`
    const message = `${bill.description} — ${formatBRL(bill.amountCents)} ${dayLabel}`
    if (existingMessages.has(message)) continue
    await createNotification(userId, 'BILL', 'Conta a vencer', message)
  }
}

export async function notifyFeature(title: string, message: string, type = 'FEATURE') {
  const users = await prisma.user.findMany({ select: { id: true } })
  for (const user of users) {
    await createNotification(user.id, type, title, message)
  }
}

export async function notifyBudgetAlert(
  userId: string,
  categoryName: string,
  spentCents: number,
  limitCents: number
) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: 'BUDGET',
      createdAt: { gte: startOfMonth },
      message: { startsWith: `${categoryName} —` },
    },
  })
  if (existing) return

  const pct = Math.round((spentCents / limitCents) * 100)
  const message = `${categoryName} — ${pct}% do limite atingido (${formatBRL(spentCents)} de ${formatBRL(limitCents)})`
  await createNotification(userId, 'BUDGET', 'Alerta de orçamento', message)
}

export async function notifyMonthlySummary(
  userId: string,
  monthLabel: string,
  incomeCents: number,
  expenseCents: number,
  balanceCents: number
) {
  const title = `Resumo de ${monthLabel}`
  const existing = await prisma.notification.findFirst({
    where: { userId, type: 'MONTHLY_SUMMARY', title },
  })
  if (existing) return

  const balanceSign = balanceCents >= 0 ? '+' : ''
  const message = `Entradas: ${formatBRL(incomeCents)} | Saídas: ${formatBRL(expenseCents)} | Saldo: ${balanceSign}${formatBRL(balanceCents)}`
  await createNotification(userId, 'MONTHLY_SUMMARY', title, message)
}
