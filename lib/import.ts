import { XMLParser } from 'fast-xml-parser'

export type ParsedTransaction = {
  date: string
  description: string
  amountCents: number
  rawType: 'INCOME' | 'EXPENSE'
}

function parseBrazilianDate(dateStr: string): string | null {
  const cleaned = dateStr.trim().replace(/['"]/g, '')
  const m = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (!m) return null
  let year = parseInt(m[3], 10)
  if (year < 100) year += 2000
  const month = parseInt(m[2], 10)
  const day = parseInt(m[1], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseIsoDate(dateStr: string): string | null {
  const cleaned = dateStr.trim()
  const m = cleaned.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const m2 = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  return null
}

function parseAmount(str: string): number | null {
  const cleaned = str.trim().replace(/[R$\s]/g, '')
  if (!cleaned) return null
  const neg = cleaned.startsWith('-') || cleaned.startsWith('(') && cleaned.endsWith(')')
  const abs = cleaned.replace(/[-()]/g, '')
  let numStr: string
  if (abs.includes(',') && abs.includes('.')) {
    numStr = abs.replace(/\./g, '').replace(',', '.')
  } else if (abs.includes(',')) {
    numStr = abs.replace(',', '.')
  } else {
    numStr = abs
  }
  const num = parseFloat(numStr)
  if (isNaN(num)) return null
  return Math.round((neg ? -num : num) * 100)
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

function detectDateColumn(headers: string[]): number {
  const dateKeywords = ['data', 'date', 'dt', 'movement', 'lancamento', 'lancamento']
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim().replace(/['"]/g, '')
    if (dateKeywords.some((k) => h.includes(k))) return i
  }
  return 0
}

function detectDescriptionColumn(headers: string[]): number {
  const keywords = ['descricao', 'descrição', 'description', 'historico', 'histórico', 'memo', 'name', 'documento', 'doc']
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim().replace(/['"]/g, '')
    if (keywords.some((k) => h.includes(k))) return i
  }
  return 1
}

function detectAmountColumn(headers: string[]): number {
  const keywords = ['valor', 'amount', 'value', 'montante']
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim().replace(/['"]/g, '')
    if (keywords.some((k) => h.includes(k))) return i
  }
  return -1
}

function detectDebitCreditColumns(headers: string[]): { debit: number; credit: number } {
  let debit = -1
  let credit = -1
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim().replace(/['"]/g, '')
    if (h.includes('debito') || h.includes('débito') || h.includes('debit')) debit = i
    if (h.includes('credito') || h.includes('crédito') || h.includes('credit') || h.includes('receita')) credit = i
  }
  return { debit, credit }
}

export function parseCsv(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const delimiter = detectDelimiter(lines[0])
  const rawHeaders = splitCsvLine(lines[0], delimiter)
  const headers = rawHeaders.map((h) => h.trim().replace(/['"]/g, ''))

  const dateIdx = detectDateColumn(headers)
  const descIdx = detectDescriptionColumn(headers)
  const amountIdx = detectAmountColumn(headers)
  const { debit, credit } = detectDebitCreditColumns(headers)

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter).map((c) => c.trim().replace(/['"]/g, ''))
    if (cols.length < 2) continue

    const dateStr = cols[dateIdx] ?? ''
    const date = parseBrazilianDate(dateStr) ?? parseIsoDate(dateStr)
    if (!date) continue

    const description = (cols[descIdx] ?? '').trim()
    if (!description) continue

    let amountCents = 0
    let rawType: 'INCOME' | 'EXPENSE' = 'EXPENSE'

    if (amountIdx >= 0 && cols[amountIdx]) {
      const parsed = parseAmount(cols[amountIdx])
      if (parsed === null) continue
      amountCents = Math.abs(parsed)
      rawType = parsed >= 0 ? 'EXPENSE' : 'INCOME'
    } else if (debit >= 0 && credit >= 0) {
      const debitVal = cols[debit] ? parseAmount(cols[debit]) : null
      const creditVal = cols[credit] ? parseAmount(cols[credit]) : null
      if (creditVal && creditVal > 0) {
        amountCents = creditVal
        rawType = 'INCOME'
      } else if (debitVal && debitVal > 0) {
        amountCents = Math.abs(debitVal)
        rawType = 'EXPENSE'
      } else {
        continue
      }
    } else {
      continue
    }

    if (amountCents === 0) continue

    transactions.push({ date, description, amountCents, rawType })
  }

  return transactions
}

export function parseOfx(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  let cleaned = content

  if (cleaned.includes('<?xml')) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      isArray: () => false,
    })
    try {
      const parsed = parser.parse(cleaned)
      const stmtTrn = parsed?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN
      const items = Array.isArray(stmtTrn) ? stmtTrn : stmtTrn ? [stmtTrn] : []
      for (const item of items) {
        const rawAmt = parseFloat(item?.TRNAMT ?? '0')
        if (isNaN(rawAmt) || rawAmt === 0) continue
        const dateRaw = String(item?.DTPOSTED ?? '')
        const date = parseIsoDate(dateRaw)
        if (!date) continue
        const description = (item?.NAME || item?.MEMO || '').trim() || 'Sem descricao'
        transactions.push({
          date,
          description,
          amountCents: Math.round(Math.abs(rawAmt) * 100),
          rawType: rawAmt > 0 ? 'INCOME' : 'EXPENSE',
        })
      }
      return transactions
    } catch {
      // fall through to SGML parser
    }
  }

  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null
  while ((match = trnRegex.exec(cleaned)) !== null) {
    const block = match[1]
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>\\s*([^<]+)`, 'i'))
      return m ? m[1].trim() : ''
    }
    const rawAmt = parseFloat(get('TRNAMT'))
    if (isNaN(rawAmt) || rawAmt === 0) continue
    const dateRaw = get('DTPOSTED')
    const date = parseIsoDate(dateRaw)
    if (!date) continue
    const description = (get('NAME') || get('MEMO') || '').trim() || 'Sem descricao'
    transactions.push({
      date,
      description,
      amountCents: Math.round(Math.abs(rawAmt) * 100),
      rawType: rawAmt > 0 ? 'INCOME' : 'EXPENSE',
    })
  }

  return transactions
}
