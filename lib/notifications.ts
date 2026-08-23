import { prisma } from '@/lib/prisma'
import { formatBRL } from '@/lib/format'

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
  } catch (err) {
    console.error('[createNotification]', err)
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

  for (const bill of bills) {
    const dayLabel = bill.days === 0
      ? 'vence hoje'
      : bill.days === 1
        ? 'vence amanhã'
        : `vence em ${bill.days} dias`
    const message = `${bill.description} — ${formatBRL(bill.amountCents)} ${dayLabel}`
    await createNotification(userId, 'BILL', 'Conta a vencer', message)
  }
}

export async function notifyFeature(title: string, message: string, type = 'FEATURE') {
  const users = await prisma.user.findMany({ select: { id: true } })
  for (const user of users) {
    await createNotification(user.id, type, title, message)
  }
}
