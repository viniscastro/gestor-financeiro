import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/src/generated/prisma/client'
import { buildPoolConfig } from '@/lib/database-config'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const adapter = new PrismaPg({
    ...buildPoolConfig(
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/gestor',
      process.env.DATABASE_CA_CERT
    ),
    max: 5,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
