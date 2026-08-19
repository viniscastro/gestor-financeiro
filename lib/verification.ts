import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const CODE_TTL_MS = 10 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function storeVerificationCode(userId: string, code: string): Promise<void> {
  const hash = await bcrypt.hash(code, 10)
  const now = new Date()
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: null,
      verificationCode: hash,
      verificationExpires: new Date(now.getTime() + CODE_TTL_MS),
      verificationSentAt: now,
    },
  })
}

export async function storeResetCode(userId: string, code: string): Promise<void> {
  const hash = await bcrypt.hash(code, 10)
  const now = new Date()
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetCode: hash,
      resetExpires: new Date(now.getTime() + CODE_TTL_MS),
      resetSentAt: now,
    },
  })
}

export async function storeDeleteCode(userId: string, code: string): Promise<void> {
  const hash = await bcrypt.hash(code, 10)
  const now = new Date()
  await prisma.user.update({
    where: { id: userId },
    data: {
      deleteCode: hash,
      deleteCodeExpires: new Date(now.getTime() + CODE_TTL_MS),
      deleteCodeSentAt: now,
    },
  })
}
