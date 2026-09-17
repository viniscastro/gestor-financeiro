import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { AccountTypeDto } from '@/lib/types'

export const accountTypeSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(40),
  color: z.string().min(1),
  icon: z.string().min(1),
})

export type AccountTypeInput = z.infer<typeof accountTypeSchema>

export function slugify(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function toAccountTypeDto(type: {
  id: string
  slug: string
  name: string
  color: string
  icon: string
  position: number
}): AccountTypeDto {
  return {
    id: type.id,
    slug: type.slug,
    name: type.name,
    color: type.color,
    icon: type.icon,
    position: type.position,
  }
}

let ensurePromise: Promise<void> | null = null

// Garante que a tabela AccountType exista, mesmo que o `prisma migrate deploy`
// ainda não tenha rodado no ambiente (ex.: deploy serverless sem etapa de
// migração). O SQL é idempotente e espelha a migration.
export function ensureAccountTypeTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AccountType" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "color" TEXT NOT NULL DEFAULT '#78716c',
          "icon" TEXT NOT NULL DEFAULT 'wallet',
          "position" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
        )
      `)
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "AccountType" ADD CONSTRAINT "AccountType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        )
      } catch {
        // constraint já existe
      }
      try {
        await prisma.$executeRawUnsafe(
          `CREATE UNIQUE INDEX "AccountType_userId_slug_key" ON "AccountType" ("userId", "slug")`
        )
      } catch {
        // índice já existe
      }
      try {
        await prisma.$executeRawUnsafe(
          `CREATE INDEX "AccountType_userId_idx" ON "AccountType" ("userId")`
        )
      } catch {
        // índice já existe
      }
    })().catch((e) => {
      ensurePromise = null
      throw e
    })
  }
  return ensurePromise
}