export type ReceiptData = {
  amount: string
  date: string
  description: string
}

function parseAmount(text: string): string {
  const patterns = [
    /(?:total|valor\s*(?:a\s*?pagar|pago|liquido|bruto)?|preço|preco|amount|due|paid)[:\s]*R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g,
    /(\d{1,3}(?:\.\d{3})*,\d{2})/g,
  ]

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0) {
      let best = ''
      let bestValue = 0
      for (const m of matches) {
        const raw = m[1]
        const num = Number(raw.replace(/\./g, '').replace(',', '.'))
        if (num > bestValue) {
          bestValue = num
          best = raw
        }
      }
      if (bestValue > 0) return best
    }
  }
  return ''
}

function parseDate(text: string): string {
  const match = text.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{2,4})/)
  if (!match) return ''
  const [, dd, mm, yy] = match
  const yyyy = yy.length === 2 ? (Number(yy) > 50 ? '19' + yy : '20' + yy) : yy
  const y = Number(yyyy)
  const m = Number(mm)
  const d = Number(dd)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return ''
  return `${yyyy}-${mm}-${dd}`
}

function parseDescription(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const skip = /^(cnpj|cpf|nota|nf|cfop|ie|im|telefone|tel|endereco|bairro|cidade|cep|e\.? ?mail|www|http|royce|ttl|subs|desconto|acres|ir|cofins|pis|pisConfins|pix|cartao|credito|debito|dinheiro|troco|operador|caixa|pdv|sat|ecf)/i
  for (const line of lines) {
    if (line.length >= 3 && line.length <= 60 && !skip.test(line)) {
      const cleaned = line.replace(/[^\w\s\u00C0-\u024F]/g, '').trim()
      if (cleaned.length >= 3) return cleaned.slice(0, 60)
    }
  }
  return ''
}

export function parseReceiptText(text: string): ReceiptData {
  return {
    amount: parseAmount(text),
    date: parseDate(text),
    description: parseDescription(text),
  }
}
