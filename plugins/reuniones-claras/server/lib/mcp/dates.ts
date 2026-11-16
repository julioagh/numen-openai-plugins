export type DateKind =
  | 'iso_valid'
  | 'iso_invalid'
  | 'numeric_ambiguous'
  | 'numeric_unambiguous'
  | 'numeric_invalid'
  | 'text'

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(month: number, year: number): number {
  if (month === 2) return isLeap(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isRealDate(day: number, month: number, year: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month, year)
}

/**
 * Clasifica una fecha de forma determinística, sin interpretar lenguaje natural.
 * Todo lo que no tenga forma numérica de fecha se considera texto libre.
 */
export function classifyDate(raw: string): DateKind {
  const value = raw.trim()

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    return isRealDate(day, month, year) ? 'iso_valid' : 'iso_invalid'
  }

  const yearFirst = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(value)
  if (yearFirst) {
    const [year, month, day] = [Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3])]
    return isRealDate(day, month, year) ? 'numeric_unambiguous' : 'numeric_invalid'
  }

  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(value)
  if (numeric) {
    const a = Number(numeric[1])
    const b = Number(numeric[2])
    const twoDigitYear = numeric[3].length === 2
    const year = twoDigitYear ? 2000 + Number(numeric[3]) : Number(numeric[3])
    const dayMonth = isRealDate(a, b, year)
    const monthDay = isRealDate(b, a, year)
    if (!dayMonth && !monthDay) return 'numeric_invalid'
    if (twoDigitYear) return 'numeric_ambiguous'
    if (dayMonth && monthDay && a !== b) return 'numeric_ambiguous'
    return 'numeric_unambiguous'
  }

  return 'text'
}
