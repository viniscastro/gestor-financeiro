import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const rules = await prisma.recurringRule.findMany({ orderBy: { createdAt: 'asc' } })
  for (let i = 0; i < rules.length; i++) {
    await prisma.recurringRule.update({
      where: { id: rules[i].id },
      data: { position: i },
    })
  }
  console.log(`Updated ${rules.length} rules with position`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
