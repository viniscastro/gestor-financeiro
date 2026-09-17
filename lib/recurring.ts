import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { formatBRL, formatDateLong, formatMonth } from '@/lib/format'
import { notifyBillWarning, notifyBudgetAlert, notifyMonthlySummary } from '@/lib/notifications'

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function nextOccurrence(dayOfMonth: number, from: Date): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), dayOfMonth)
  if (date <= startOfDay(from)) {
    const nextMonth = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), dayOfMonth)
  }
  return date
}

export function nextOccurrenceStr(dayOfMonth: number, from: Date): string {
  const d = nextOccurrence(dayOfMonth, from)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysUntil(target: Date, from: Date): number {
  const a = startOfDay(from).getTime()
  const b = startOfDay(target).getTime()
  return Math.round((b - a) / 86_400_000)
}

// Marcador usado em installmentGroupId para identificar transações de
// recorrência de cartão materializadas (mensalmente ou ao pagar a fatura) que
// não devem ser apagadas pela limpeza de pré-geração antiga.
export const CARD_PAID_SENTINEL = 'card-recurring-paid'

// Retorna o próximo mês depois do chave fornecida, ou o próprio mês se for
// anterior. Formato "yyyy-MM".
export function nextMonthAfter(key: string, from: string): string | null {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return null
  const total = y * 12 + (m - 1) + 1
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const candidate = `${ny}-${String(nm).padStart(2, '0')}`
  return candidate > from ? candidate : from
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function monthStart(year: number, monthIndex: number, dayOfMonth: number): Date {
  return new Date(year, monthIndex, Math.min(dayOfMonth, lastDayOfMonth(year, monthIndex)))
}

// Recorrências de cartão são materializadas mensalmente no dia de cobrança
// (ver materializeRecurring). Esta função remove qualquer transação de cartão
// no mês corrente/futuro que ainda esteja como pré-geração antiga ou inválida,
// preservando as materializadas (marcador installmentGroupId). Usa `date` (não
// occurrenceMonth) para ser robusto a inconsistências e a transações criadas
// por import/caminhos manuais. Chamado no layout e antes de listar transações.
export async function cleanupCardRecurringTransactions(userId: string): Promise<void> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  await prisma.transaction.deleteMany({
    where: {
      userId,
      creditCardId: { not: null },
      recurringId: { not: null },
      // Em Prisma/Postgres, `{ not: X }` NÃO casa colunas NULL. Pré-gerações
      // antigas têm installmentGroupId = NULL, então precisamos incluir nulos
      // explicitamente via OR, preservando apenas as criadas no pagamento
      // (installmentGroupId = CARD_PAID_SENTINEL).
      OR: [
        { installmentGroupId: { not: CARD_PAID_SENTINEL } },
        { installmentGroupId: null },
      ],
      date: { gte: startOfMonth },
    },
  })
}

export async function materializeRecurring(userId: string): Promise<void> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
  })

  const now = new Date()
  const currentMonth = monthKey(now)

  // Ver comentário em cleanupCardRecurringTransactions. Roda mesmo sem regras
  // de conta ativas, por isso fica ANTES do early-return abaixo.
  await cleanupCardRecurringTransactions(userId)

  // Limpeza única: resetar lastMaterializedMonth travado no futuro e apagar
  // transações futuras pré-geradas pela versão antiga (5 anos).
  const stuckRules = rules.filter(
    (r) => r.lastMaterializedMonth && r.lastMaterializedMonth > currentMonth
  )
  if (stuckRules.length > 0) {
    await prisma.$transaction([
      prisma.recurringRule.updateMany({
        where: { id: { in: stuckRules.map((r) => r.id) } },
        data: { lastMaterializedMonth: null },
      }),
      prisma.transaction.deleteMany({
        where: {
          userId,
          creditCardId: null,
          recurringId: { not: null },
          occurrenceMonth: { gt: currentMonth },
        },
      }),
    ])
    // Atualiza em memória para o loop abaixo
    for (const rule of rules) {
      if (stuckRules.some((r) => r.id === rule.id)) {
        rule.lastMaterializedMonth = null
      }
    }
  }

  if (rules.length === 0) return

  const cardIds = [...new Set(rules.filter((r) => r.creditCardId).map((r) => r.creditCardId!))]
  const cards = cardIds.length
    ? await prisma.creditCard.findMany({
        where: { userId, id: { in: cardIds } },
        select: { id: true, closingDay: true },
      })
    : []
  const cardClosing = new Map(cards.map((c) => [c.id, c.closingDay]))

  for (const rule of rules) {
    if (rule.creditCardId) {
      if (rule.kind === 'TRANSFER') continue

      const [cy, cm] = currentMonth.split('-').map(Number)
      const closing = cardClosing.get(rule.creditCardId)

      // NOTA: não usamos lastMaterializedMonth como gate aqui. Versões antigas
      // marcavam o mês corrente antes do dia de cobrança chegar (quando só o
      // backfill do mês anterior era criado), o que fazia a materialização do
      // mês corrente ser pulada para sempre. A idempotência é garantida pela
      // existência da ocorrência (findFirst por occurrenceMonth + data/valor),
      // então rodamos sempre e deixamos o flag apenas como informação.
      // Meses a materializar. A ocorrência do mês corrente só entra no dia de
      // cobrança (dayOfMonth). Quando a cobrança cai DEPOIS do fechamento do
      // cartão, o lançamento do mês anterior pertence à fatura vigente e deve
      // ser reposto se faltar (ex.: usuário ficou um mês sem abrir o app).
      const months: Array<[number, number]> = []
      if (closing && rule.dayOfMonth >= closing) {
        const pm = cm === 1 ? 12 : cm - 1
        const py = cm === 1 ? cy - 1 : cy
        months.push([pm, py])
      }
      const effCurrent = Math.min(rule.dayOfMonth, lastDayOfMonth(cy, cm - 1))
      if (now.getDate() >= effCurrent) {
        months.push([cm, cy])
      }

      for (const [mm, yy] of months) {
        const mk = `${yy}-${String(mm).padStart(2, '0')}`
        const expectedDate = monthStart(yy, mm - 1, rule.dayOfMonth)
        const existing = await prisma.transaction.findFirst({
          where: {
            recurringId: rule.id,
            occurrenceMonth: mk,
          },
          select: { id: true, date: true, amount: true, creditCardId: true, accountId: true },
        })
        // Apenas regera se a ocorrência estiver ausente, com data/valor
        // divergentes, ou no canal errado (ex.: regra trocada de conta para
        // cartão deixou ocorrência na conta antiga — reverteria o débito).
        if (
          !existing ||
          existing.date.getTime() !== expectedDate.getTime() ||
          existing.amount !== rule.amountCents ||
          existing.creditCardId !== rule.creditCardId ||
          existing.accountId !== null
        ) {
          await prisma.transaction.deleteMany({
            where: { recurringId: rule.id, date: { gte: new Date(yy, mm - 1, 1) } },
          })
          await prisma.transaction.create({
            data: {
              transactionType: rule.type,
              description: rule.description,
              amount: rule.amountCents,
              date: expectedDate,
              userId,
              accountId: null,
              creditCardId: rule.creditCardId,
              categoryId: rule.categoryId,
              recurringId: rule.id,
              occurrenceMonth: mk,
              installmentGroupId: CARD_PAID_SENTINEL,
            },
          })
        }
      }

      // Só marca materializado quando a ocorrência do mês corrente realmente
      // entrou; se o dia de cobrança ainda não chegou, mantém no mês anterior
      // para tentar de novo na próxima abertura do app.
      const hasCurrent = months.some(([mm]) => mm === cm)
      if (hasCurrent) {
        await prisma.recurringRule.update({
          where: { id: rule.id },
          data: { lastMaterializedMonth: currentMonth },
        })
      }
      continue
    }

    if (rule.lastMaterializedMonth && rule.lastMaterializedMonth >= currentMonth) continue

    const start = rule.lastMaterializedMonth
      ? nextMonthAfter(rule.lastMaterializedMonth, currentMonth)
      : currentMonth
    if (!start || start > currentMonth) continue

    const [sy, sm] = start.split('-').map(Number)
    const [hy, hm] = currentMonth.split('-').map(Number)
    const idx0 = sy * 12 + (sm - 1)
    const idxN = hy * 12 + (hm - 1)

    // Torna idempotente: remove as ocorrências já existentes no intervalo
    // antes de regerar, evitando duplicatas.
    await prisma.transaction.deleteMany({
      where: { recurringId: rule.id, occurrenceMonth: { gte: start } },
    })

    for (let i = idx0; i <= idxN; i++) {
      const year = Math.floor(i / 12)
      const monthIndex = i % 12
      const date = monthStart(year, monthIndex, rule.dayOfMonth)
      const mk = monthKey(date)

      if (rule.kind === 'TRANSFER' && rule.toAccountId) {
        const groupId = randomUUID()
        await prisma.$transaction([
          prisma.transaction.create({
            data: {
              transactionType: 'EXPENSE',
              description: rule.description,
              amount: rule.amountCents,
              date,
              userId,
              accountId: rule.accountId,
              categoryId: null,
              recurringId: rule.id,
              occurrenceMonth: mk,
              transferGroupId: groupId,
            },
          }),
          prisma.transaction.create({
            data: {
              transactionType: 'INCOME',
              description: rule.description,
              amount: rule.amountCents,
              date,
              userId,
              accountId: rule.toAccountId,
              categoryId: null,
              recurringId: rule.id,
              occurrenceMonth: mk,
              transferGroupId: groupId,
            },
          }),
        ])
      } else {
        await prisma.transaction.create({
          data: {
            transactionType: rule.type,
            description: rule.description,
            amount: rule.amountCents,
            date,
            userId,
            accountId: rule.accountId,
            creditCardId: rule.creditCardId ?? null,
            categoryId: rule.categoryId,
            recurringId: rule.id,
            occurrenceMonth: mk,
          },
        })
      }
    }

    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { lastMaterializedMonth: currentMonth },
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
  occurrenceMonth: string
  paid: boolean
  notifyDaysBefore: number
  lastNotifiedAt: Date | null
}

export async function markBillPaid(userId: string, ruleId: string): Promise<boolean> {
  const rule = await prisma.recurringRule.findFirst({
    where: { id: ruleId, userId, active: true, kind: 'TRANSACTION', type: 'EXPENSE' },
  })
  if (!rule) return false

  const month = monthKey(nextOccurrence(rule.dayOfMonth, new Date()))
  await prisma.recurringRule.update({
    where: { id: rule.id },
    data: { lastPaidMonth: month },
  })
  return true
}

export async function getUpcomingBills(
  userId: string,
  withinDays = 30
): Promise<UpcomingBill[]> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true, kind: 'TRANSACTION', type: 'EXPENSE' },
    include: {
      account: { select: { name: true, color: true } },
      creditCard: { select: { name: true } },
      category: { select: { name: true, color: true } },
    },
  })

  const now = new Date()
  return rules
    .map((rule) => {
      const date = nextOccurrence(rule.dayOfMonth, now)
      return {
        id: rule.id,
        description: rule.description,
        amountCents: rule.amountCents,
        type: rule.type,
        categoryName: rule.category?.name ?? null,
        categoryColor: rule.category?.color ?? null,
        accountName: rule.creditCard?.name ?? rule.account?.name ?? '',
        accountColor: rule.account?.color ?? '#10b981',
        date,
        days: 0,
        occurrenceMonth: monthKey(date),
        paid: rule.lastPaidMonth === monthKey(date),
        notifyDaysBefore: rule.notifyDaysBefore,
        lastNotifiedAt: rule.lastNotifiedAt,
      }
    })
    .map((bill) => ({ ...bill, days: daysUntil(bill.date, now) }))
    .filter((bill) => !bill.paid && bill.days >= 0 && bill.days <= withinDays)
    .sort((a, b) => a.days - b.days)
}

export async function notifyUpcomingBills(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })
  if (!user?.email) return

  const bills = await getUpcomingBills(userId)
  const now = new Date()
  const toNotify = bills.filter((bill) => {
    if (bill.days > bill.notifyDaysBefore) return false
    if (bill.lastNotifiedAt && bill.lastNotifiedAt >= startOfDay(now)) return false
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
  await notifyBillWarning(userId, toNotify)
  await prisma.recurringRule.updateMany({
    where: { id: { in: toNotify.map((bill) => bill.id) } },
    data: { lastNotifiedAt: new Date() },
  })
}

export async function checkBudgetAlerts(userId: string): Promise<void> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const mk = monthKey(now)

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: { select: { name: true } } },
  })
  if (budgets.length === 0) return

  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      transactionType: 'EXPENSE',
      date: { gte: startOfMonth },
      categoryId: { in: budgets.map((b) => b.categoryId) },
    },
    select: { categoryId: true, amount: true },
  })
  const spentMap = new Map<string, number>()
  for (const t of txns) {
    if (t.categoryId) spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount)
  }

  const existing = await prisma.notification.findMany({
    where: { userId, type: 'BUDGET', read: false },
    select: { message: true },
  })
  const existingMsgs = new Set(existing.map((n) => n.message))

  for (const b of budgets) {
    const spent = spentMap.get(b.categoryId) ?? 0
    if (b.amountCents <= 0) continue
    const pct = (spent / b.amountCents) * 100
    if (pct < 80) continue
    const alertMessage = `${b.category.name} — ${Math.round(pct)}% do limite atingido (${formatBRL(spent)} de ${formatBRL(b.amountCents)})`
    if (existingMsgs.has(alertMessage)) continue
    await notifyBudgetAlert(userId, b.category.name, spent, b.amountCents)
  }
}

export async function checkMonthlySummary(userId: string): Promise<void> {
  const now = new Date()
  const day = now.getDate()
  if (day > 3) return

  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const mk = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`

  const existing = await prisma.notification.findMany({
    where: { userId, type: 'MONTHLY_SUMMARY' },
    select: { message: true },
  })
  if (existing.some((n) => n.message.includes(mk))) return

  const start = new Date(prevYear, prevMonth, 1)
  const end = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999)

  const txns = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { transactionType: true, amount: true, transferGroupId: true },
  })

  let income = 0
  let expense = 0
  for (const t of txns) {
    if (t.transferGroupId) continue
    if (t.transactionType === 'INCOME') income += t.amount
    else expense += t.amount
  }

  if (income === 0 && expense === 0) return

  const label = formatMonth(prevMonth, prevYear)
  await notifyMonthlySummary(userId, label, income, expense, income - expense)
}
