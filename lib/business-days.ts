// Dias úteis bancários no Brasil: sem expediente aos sábados, domingos,
// feriados nacionais e nos feriados bancários móveis (Carnaval, Sexta-feira
// Santa e Corpus Christi), conforme o calendário da Febraban.

// Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function key(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

const cache = new Map<number, Set<string>>()

function holidaysOf(year: number): Set<string> {
  const cached = cache.get(year)
  if (cached) return cached

  const fixed: [number, number][] = [
    [1, 1], // Confraternização Universal
    [4, 21], // Tiradentes
    [5, 1], // Dia do Trabalho
    [9, 7], // Independência
    [10, 12], // Nossa Senhora Aparecida
    [11, 2], // Finados
    [11, 15], // Proclamação da República
    [12, 25], // Natal
  ]
  // Dia Nacional de Zumbi e da Consciência Negra (Lei 14.759/2023).
  if (year >= 2024) fixed.push([11, 20])

  const set = new Set(fixed.map(([m, d]) => key(new Date(year, m - 1, d))))
  const easter = easterSunday(year)
  set.add(key(addDays(easter, -48))) // Segunda-feira de Carnaval
  set.add(key(addDays(easter, -47))) // Terça-feira de Carnaval
  set.add(key(addDays(easter, -2))) // Sexta-feira Santa
  set.add(key(addDays(easter, 60))) // Corpus Christi

  cache.set(year, set)
  return set
}

export function isHoliday(date: Date): boolean {
  return holidaysOf(date.getFullYear()).has(key(date))
}

export function isBusinessDay(date: Date): boolean {
  const dow = date.getDay()
  return dow !== 0 && dow !== 6 && !isHoliday(date)
}

// Se a data cair em fim de semana ou feriado, avança para o próximo dia útil.
// Mantém a data (à meia-noite local) quando ela já é dia útil.
export function nextBusinessDay(date: Date): Date {
  let d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  while (!isBusinessDay(d)) d = addDays(d, 1)
  return d
}
