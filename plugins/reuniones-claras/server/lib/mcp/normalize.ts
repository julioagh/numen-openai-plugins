/** Normaliza texto para comparar sin interpretar su significado: minúsculas, sin acentos ni puntuación. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0
}
