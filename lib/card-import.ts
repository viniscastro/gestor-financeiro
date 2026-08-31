import { XMLParser } from 'fast-xml-parser'

export type ParsedCardTransaction = {
  date: string
  description: string
  amountCents: number
  type: 'INCOME' | 'EXPENSE'
}

function parseAmountPlayer(str: string): number {
  const cleaned = str.trim().replace(/[R$\s]/g, '')
  const neg = cleaned.startsWith('-') || (cleaned.startsWith('(') && cleaned.endsWith(')'))
  const abs = cleaned.replace(/[-()]/g, '')
  let numStr: string
  if (abs.includes(',') && abs.includes('.')) numStr = abs.replace(/\./g, '').replace(',', '.')
  else if (abs.includes(',')) numStr = abs.replace(',', '.')
  else numStr = abs
  const num = parseFloat(numStr)
  if (isNaN(num)) return 0
  return Math.round((neg ? -num : num) * 100)
}

function parseCardDate(dateStr: string): string | null {
  const cleaned = dateStr.trim().replace(/['"]/g, '')
  const m = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    let year = parseInt(m[3], 10)
    if (year < 100) year += 2000
    return `${year}-${String(parseInt(m[2], 10)).padStart(2, '0')}-${String(parseInt(m[1], 10)).padStart(2, '0')}`
  }
  const m2 = cleaned.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  const m3 = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`
  return null
}

function splitCsv(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++ } else inQuotes = false
      } else current += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === delimiter) { result.push(current); current = '' }
      else current += ch
    }
  }
  result.push(current)
  return result
}

export function parseCardCsv(content: string): ParsedCardTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const semis = (lines[0].match(/;/g) ?? []).length
  const comm = (lines[0].match(/,/g) ?? []).length
  const delimiter = semis > comm ? ';' : ','

  const headers = splitCsv(lines[0], delimiter).map((h) => h.toLowerCase())

  const idxOf = (words: string[]) => {
    for (let i = 0; i < headers.length; i++) {
      if (words.some((w) => headers[i].includes(w))) return i
    }
    return -1
  }
  const dateIdx = idxOf(['data', 'date', 'lancamento', 'lançamento'])
  const descIdx = idxOf(['descricao', 'descrição', 'description', 'historico', 'histórico', 'memo', 'name'])
  const amountIdx = idxOf(['valor', 'amount', 'value'])

  const out: ParsedCardTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsv(lines[i], delimiter).map((c) => c.trim().replace(/['"]/g, ''))
    if (cols.length < 2) continue
    const date = dateIdx >= 0 ? parseCardDate(cols[dateIdx] ?? '') : null
    if (!date) continue
    const description = (descIdx >= 0 ? cols[descIdx] : cols[1] ?? '').trim()
    if (!description) continue
    const signedCents = amountIdx >= 0 ? parseAmountPlayer(cols[amountIdx] ?? '') : 0
    if (signedCents === 0) continue
    out.push({ date, description, amountCents: Math.abs(signedCents), type: signedCents > 0 ? 'EXPENSE' : 'INCOME' })
  }

  return out
}

export function parseCardOfx(content: string): ParsedCardTransaction[] {
  const out: ParsedCardTransaction[] = []

  if (content.includes('<?xml')) {
    const parser = new XMLParser({ ignoreAttributes: false, isArray: () => false })
    try {
      const parsed = parser.parse(content)
      const stmtTrn =
        parsed?.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN ||
        parsed?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN
      const items = Array.isArray(stmtTrn) ? stmtTrn : stmtTrn ? [stmtTrn] : []
      for (const item of items) {
        const rawAmt = parseFloat(item?.TRNAMT ?? '0')
        if (isNaN(rawAmt) || rawAmt === 0) continue
        const date = parseCardDate(String(item?.DTPOSTED ?? ''))
        if (!date) continue
        const description = (item?.NAME || item?.MEMO || '').trim() || 'Sem descricao'
        out.push({
          date,
          description,
          amountCents: Math.round(Math.abs(rawAmt) * 100),
          type: rawAmt < 0 ? 'EXPENSE' : 'INCOME',
        })
      }
      return out
    } catch {
      // fall through
    }
  }

  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const get = (tag: string) => {
      const m = match![1].match(new RegExp(`<${tag}>\\s*([^<]+)`, 'i'))
      return m ? m[1].trim() : ''
    }
    const rawAmt = parseFloat(get('TRNAMT'))
    if (isNaN(rawAmt) || rawAmt === 0) continue
    const date = parseCardDate(get('DTPOSTED'))
    if (!date) continue
    const description = (get('NAME') || get('MEMO') || '').trim() || 'Sem descricao'
    out.push({
      date,
      description,
      amountCents: Math.round(Math.abs(rawAmt) * 100),
      type: rawAmt < 0 ? 'EXPENSE' : 'INCOME',
    })
  }

  return out
}
