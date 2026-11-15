import type { MeetingRecord } from './schema'

function luhn(digits: string): boolean {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (double) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    double = !double
  }
  return sum % 10 === 0
}

function collectStrings(record: MeetingRecord): string[] {
  const out: string[] = []
  for (const d of record.decisions ?? []) out.push(d.description, d.evidence ?? '')
  for (const p of record.proposals ?? []) out.push(p.description)
  for (const c of record.commitments ?? []) out.push(c.description, c.owner ?? '', c.due_date ?? '', c.status ?? '')
  for (const o of record.open_items ?? []) out.push(o.description)
  return out
}

/**
 * Barrera mínima y determinística: detecta secuencias que parecen un número de
 * tarjeta de pago (13 a 19 dígitos con suma de Luhn válida). Las directrices de
 * OpenAI prohíben procesar datos de tarjetas. Devuelve solo un booleano, nunca
 * el valor ni su posición. Puede dar falsos positivos con números largos.
 */
export function containsLikelyCardNumber(record: MeetingRecord): boolean {
  const candidate = /(?:\d[ -]?){13,19}/g
  for (const text of collectStrings(record)) {
    for (const match of text.matchAll(candidate)) {
      const digits = match[0].replace(/\D/g, '')
      if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) return true
    }
  }
  return false
}
