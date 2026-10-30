import { prisma } from '@/lib/prisma'

const TABLES: Array<[string, () => Promise<unknown[]>]> = [
  ['users', () => prisma.user.findMany()],
  ['accountTypes', () => prisma.accountType.findMany()],
  ['accounts', () => prisma.account.findMany()],
  ['categories', () => prisma.category.findMany()],
  ['budgets', () => prisma.budget.findMany()],
  ['savingsGoals', () => prisma.savingsGoal.findMany()],
  ['creditCards', () => prisma.creditCard.findMany()],
  ['creditCardStatements', () => prisma.creditCardStatement.findMany()],
  ['recurringRules', () => prisma.recurringRule.findMany()],
  ['transactions', () => prisma.transaction.findMany()],
  ['notifications', () => prisma.notification.findMany()],
  ['pushSubscriptions', () => prisma.pushSubscription.findMany()],
]

// Gera o JSON em partes, tabela a tabela, para não esbarrar no limite de tamanho
// de resposta das funções da Vercel. Uma falha interrompe o download em vez de
// entregar um arquivo incompleto com aparência de válido.
export function exportDatabase(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`{"exportedAt":${JSON.stringify(new Date())},"tables":{`))
        for (const [index, [name, load]] of TABLES.entries()) {
          const rows = await load()
          controller.enqueue(encoder.encode(`${index ? ',' : ''}${JSON.stringify(name)}:${JSON.stringify(rows)}`))
        }
        controller.enqueue(encoder.encode('}}'))
        controller.close()
      } catch (err) {
        console.error('[backup]', err)
        controller.error(err)
      }
    },
  })
}
