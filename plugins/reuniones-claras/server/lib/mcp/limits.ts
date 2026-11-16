/**
 * Límites de entrada. Son deliberadamente pequeños: el servidor solo necesita
 * datos estructurados y fragmentos breves, nunca transcripciones completas.
 */
export const LIMITS = {
  /** Tamaño máximo del cuerpo HTTP en bytes (la plataforma permite hasta 4.5 MB). */
  MAX_BODY_BYTES: 256 * 1024,
  /** Máximo de elementos por lista. */
  MAX_ITEMS_PER_LIST: 50,
  MAX_DESCRIPTION_CHARS: 500,
  MAX_EVIDENCE_CHARS: 200,
  /** Evidencia con menos caracteres (sin espacios sobrantes) se considera insuficiente. */
  MIN_EVIDENCE_CHARS: 8,
  MAX_OWNER_CHARS: 100,
  MAX_DUE_DATE_CHARS: 60,
  MAX_STATUS_CHARS: 30,
} as const
