import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNT_TYPES } from '@/lib/categories'

export async function ensureDefaultData(userId: string): Promise<void> {
  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account) {
    await prisma.account.create({
      data: {
        id: `acc_${userId}`,
        userId,
        name: 'Carteira',
        type: 'CARTEIRA',
        color: '#10b981',
        initialBalance: 0,
      },
    })
  }

  const accountTypes = await prisma.accountType.findMany({
    where: { userId },
    select: { id: true },
  })
  if (accountTypes.length === 0) {
    await prisma.accountType.createMany({
      data: DEFAULT_ACCOUNT_TYPES.map((t, i) => ({
        id: `at_${userId}_${t.slug}`,
        userId,
        slug: t.slug,
        name: t.name,
        color: t.color,
        icon: t.icon,
        position: i,
      })),
    })
  }

  const existing = await prisma.category.findMany({
    where: { userId },
    select: { id: true },
  })
  if (existing.length === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({
        id: `cat_${userId}_${c.slug}`,
        userId,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
      })),
    })
  }
}
