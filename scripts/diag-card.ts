import { config } from 'dotenv'
const envPath = process.argv[2] ?? '.env.local'
config({ path: envPath })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 5 })
const prisma = new PrismaClient({ adapter })

async function main() {
  const cards = await prisma.creditCard.findMany({
    select: { id: true, name: true, closingDay: true, dueDay: true },
  })
  for (const card of cards) {
    const rules = await prisma.recurringRule.findMany({
      where: { creditCardId: card.id },
      select: {
        id: true,
        description: true,
        amountCents: true,
        dayOfMonth: true,
        type: true,
        lastMaterializedMonth: true,
        lastPaidMonth: true,
        active: true,
      },
    })
    console.log(
      `\nCARD ${JSON.stringify(card)} regras (${rules.length}):`
    )
    for (const r of rules) {
      console.log(
        `- rid=${r.id.slice(0, 8)} "${r.description}" amt=${r.amountCents} day=${r.dayOfMonth} type=${r.type} active=${r.active} lastMat=${r.lastMaterializedMonth ?? 'null'} lastPaid=${r.lastPaidMonth ?? 'null'}`
      )
    }
    const txs = await prisma.transaction.findMany({
      where: { creditCardId: card.id, recurringId: { not: null } },
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        recurringId: true,
        installmentGroupId: true,
        occurrenceMonth: true,
      },
      orderBy: { date: 'asc' },
    })
    console.log(`\nCARD ${card.name} txs recorrentes (${txs.length}):`)
    for (const t of txs) {
      console.log(
        `- ${t.date.toISOString().slice(0, 10)} occ=${t.occurrenceMonth} gid=${t.installmentGroupId ?? 'null'} rid=${(t.recurringId ?? '').slice(0, 6)} "${t.description}" amt=${t.amount}`
      )
    }
  }
  const anyFuture = await prisma.transaction.count({
    where: { creditCardId: { not: null }, recurringId: { not: null } },
  })
  console.log('\nTOTAL transações recorrentes com cartão:', anyFuture)
}

main().finally(async () => { await prisma.$disconnect() })