export type Severity = 'error' | 'warning' | 'info'
export type Lang = 'es' | 'en'

interface Text {
  message: string
  recommendation: string
}

export interface CodeDefinition {
  severity: Severity
  /** Campo del elemento al que suele referirse. */
  field?: string
  /** Si es true, el campo se reporta también en `missing_fields`. */
  missing?: boolean
  /** Significado del código (documentación). */
  meaning: string
  es: Text
  en: Text
}

/**
 * Catálogo de códigos de validación. Los códigos son estables: se pueden añadir,
 * pero no renombrar ni cambiar de significado. Los mensajes nunca incluyen el
 * contenido recibido, solo posiciones (lista e índice).
 */
export const CODE_DEFINITIONS = {
  RECORD_EMPTY: {
    severity: 'info',
    meaning: 'El registro no contiene ningún elemento en ninguna lista.',
    es: {
      message: 'El registro no contiene elementos para validar.',
      recommendation: 'Confirma que las notas realmente no contenían decisiones, compromisos, propuestas ni pendientes.',
    },
    en: {
      message: 'The record has no items to validate.',
      recommendation: 'Confirm that the notes really contained no decisions, commitments, proposals or open items.',
    },
  },
  DECISION_DESCRIPTION_EMPTY: {
    severity: 'error',
    field: 'description',
    missing: true,
    meaning: 'Una decisión no tiene descripción o solo contiene espacios.',
    es: { message: 'La decisión no tiene descripción.', recommendation: 'Revisa las notas y describe la decisión, o elimínala del registro.' },
    en: { message: 'The decision has no description.', recommendation: 'Review the notes and describe the decision, or remove it from the record.' },
  },
  PROPOSAL_DESCRIPTION_EMPTY: {
    severity: 'error',
    field: 'description',
    missing: true,
    meaning: 'Una propuesta o posibilidad no tiene descripción.',
    es: { message: 'La propuesta no tiene descripción.', recommendation: 'Describe la propuesta según las notas, o elimínala.' },
    en: { message: 'The proposal has no description.', recommendation: 'Describe the proposal as recorded in the notes, or remove it.' },
  },
  COMMITMENT_DESCRIPTION_EMPTY: {
    severity: 'error',
    field: 'description',
    missing: true,
    meaning: 'Un compromiso no tiene descripción.',
    es: { message: 'El compromiso no tiene descripción.', recommendation: 'Describe la acción comprometida según las notas, o elimínala.' },
    en: { message: 'The commitment has no description.', recommendation: 'Describe the committed action as recorded in the notes, or remove it.' },
  },
  OPEN_ITEM_DESCRIPTION_EMPTY: {
    severity: 'error',
    field: 'description',
    missing: true,
    meaning: 'Una pregunta abierta o tema pendiente no tiene descripción.',
    es: { message: 'El tema pendiente no tiene descripción.', recommendation: 'Describe el tema o pregunta según las notas, o elimínalo.' },
    en: { message: 'The open item has no description.', recommendation: 'Describe the topic or question as recorded in the notes, or remove it.' },
  },
  DECISION_EVIDENCE_MISSING: {
    severity: 'warning',
    field: 'evidence',
    missing: true,
    meaning: 'Una decisión clasificada como confirmada no incluye evidencia textual.',
    es: {
      message: 'La decisión está marcada como confirmada pero no incluye evidencia.',
      recommendation: 'Verifica en las notas que el acuerdo fue explícito. Si no puedes respaldarlo, no la presentes como confirmada.',
    },
    en: {
      message: 'The decision is marked as confirmed but includes no evidence.',
      recommendation: 'Check the notes to confirm the agreement was explicit. If you cannot support it, do not present it as confirmed.',
    },
  },
  DECISION_EVIDENCE_INSUFFICIENT: {
    severity: 'warning',
    field: 'evidence',
    missing: true,
    meaning: 'La evidencia de una decisión confirmada es demasiado corta para respaldarla.',
    es: {
      message: 'La evidencia de la decisión es demasiado breve para respaldar que fue confirmada (mínimo {min} caracteres).',
      recommendation: 'Revisa las notas y cita el fragmento que muestra la aceptación, o reconsidera la clasificación.',
    },
    en: {
      message: 'The decision evidence is too short to support that it was confirmed (minimum {min} characters).',
      recommendation: 'Review the notes and quote the passage that shows acceptance, or reconsider the classification.',
    },
  },
  DECISION_NOT_CONFIRMED: {
    severity: 'warning',
    field: 'classification',
    meaning: 'Un elemento de la lista de decisiones está clasificado como propuesta o posibilidad.',
    es: {
      message: 'Este elemento figura como decisión pero está clasificado como propuesta o posibilidad.',
      recommendation: 'Muévelo a propuestas, salvo que las notas registren su aceptación explícita.',
    },
    en: {
      message: 'This item is listed as a decision but classified as a proposal or possibility.',
      recommendation: 'Move it to proposals unless the notes record explicit acceptance.',
    },
  },
  DECISION_CLASSIFIED_OPEN: {
    severity: 'error',
    field: 'classification',
    meaning: 'Un elemento de la lista de decisiones está clasificado como pendiente o pregunta abierta.',
    es: {
      message: 'Un tema pendiente o pregunta abierta está registrado como decisión.',
      recommendation: 'Muévelo a la lista de temas pendientes.',
    },
    en: {
      message: 'An open item or question is recorded as a decision.',
      recommendation: 'Move it to the open items list.',
    },
  },
  PROPOSAL_MARKED_CONFIRMED: {
    severity: 'error',
    field: 'classification',
    meaning: 'Un elemento de la lista de propuestas está clasificado como confirmado.',
    es: {
      message: 'Una propuesta o posibilidad aparece clasificada como confirmada.',
      recommendation: 'Si las notas registran su aceptación, muévela a decisiones con evidencia; si no, corrige la clasificación.',
    },
    en: {
      message: 'A proposal or possibility is classified as confirmed.',
      recommendation: 'If the notes record acceptance, move it to decisions with evidence; otherwise fix the classification.',
    },
  },
  OPEN_ITEM_MARKED_CONFIRMED: {
    severity: 'error',
    field: 'classification',
    meaning: 'Un tema pendiente o pregunta abierta está clasificado como confirmado.',
    es: {
      message: 'Un tema pendiente o pregunta abierta aparece clasificado como confirmado.',
      recommendation: 'Si ya se resolvió, regístralo como decisión con evidencia; si no, corrige la clasificación.',
    },
    en: {
      message: 'An open item or question is classified as confirmed.',
      recommendation: 'If it was resolved, record it as a decision with evidence; otherwise fix the classification.',
    },
  },
  COMMITMENT_OWNER_MISSING: {
    severity: 'warning',
    field: 'owner',
    missing: true,
    meaning: 'Un compromiso no tiene responsable indicado.',
    es: {
      message: 'El compromiso no tiene responsable especificado.',
      recommendation: 'Confirma el responsable con los participantes. No lo asumas.',
    },
    en: {
      message: 'The commitment has no owner specified.',
      recommendation: 'Confirm the owner with the participants. Do not assume one.',
    },
  },
  COMMITMENT_DUE_DATE_MISSING: {
    severity: 'warning',
    field: 'due_date',
    missing: true,
    meaning: 'Un compromiso no tiene fecha límite indicada.',
    es: {
      message: 'El compromiso no tiene fecha límite especificada.',
      recommendation: 'Confirma la fecha con los participantes. No la estimes.',
    },
    en: {
      message: 'The commitment has no due date specified.',
      recommendation: 'Confirm the date with the participants. Do not estimate one.',
    },
  },
  COMMITMENT_DUE_DATE_INVALID: {
    severity: 'error',
    field: 'due_date',
    meaning: 'La fecha tiene formato de fecha pero no existe en el calendario (por ejemplo 2026-02-30).',
    es: {
      message: 'La fecha límite no es una fecha válida del calendario.',
      recommendation: 'Revisa la fecha en las notas y corrígela, o conserva el texto original si es dudoso.',
    },
    en: {
      message: 'The due date is not a valid calendar date.',
      recommendation: 'Check the date in the notes and correct it, or keep the original wording if in doubt.',
    },
  },
  COMMITMENT_DUE_DATE_AMBIGUOUS: {
    severity: 'warning',
    field: 'due_date',
    meaning: 'La fecha numérica admite más de una lectura (día/mes o mes/día) o tiene año de dos dígitos.',
    es: {
      message: 'La fecha límite es ambigua (puede leerse como día/mes o mes/día, o tiene año de dos dígitos).',
      recommendation: 'Confirma la fecha con los participantes y regístrala como YYYY-MM-DD.',
    },
    en: {
      message: 'The due date is ambiguous (it can be read as day/month or month/day, or has a two-digit year).',
      recommendation: 'Confirm the date with the participants and record it as YYYY-MM-DD.',
    },
  },
  COMMITMENT_DUE_DATE_UNRESOLVED: {
    severity: 'warning',
    field: 'due_date',
    meaning: 'La fecha es texto libre (por ejemplo, una expresión relativa o sin año) y no puede resolverse de forma determinística.',
    es: {
      message: 'La fecha límite es texto libre y no se puede resolver a una fecha concreta.',
      recommendation: 'Conserva el texto original y confirma la fecha exacta con los participantes.',
    },
    en: {
      message: 'The due date is free text and cannot be resolved to a specific date.',
      recommendation: 'Keep the original wording and confirm the exact date with the participants.',
    },
  },
  COMMITMENT_DUE_DATE_NOT_ISO: {
    severity: 'info',
    field: 'due_date',
    meaning: 'La fecha es inequívoca pero no está en formato YYYY-MM-DD.',
    es: {
      message: 'La fecha límite es inequívoca pero no está en formato YYYY-MM-DD.',
      recommendation: 'Considera registrarla como YYYY-MM-DD.',
    },
    en: {
      message: 'The due date is unambiguous but not in YYYY-MM-DD format.',
      recommendation: 'Consider recording it as YYYY-MM-DD.',
    },
  },
  COMMITMENT_STATUS_MISSING: {
    severity: 'info',
    field: 'status',
    missing: true,
    meaning: 'Un compromiso no tiene estado. Es normal: el estado solo se registra si las notas lo indican.',
    es: {
      message: 'El compromiso no tiene estado registrado.',
      recommendation: 'Es normal si las notas no lo indican. No asumas que está pendiente ni completado.',
    },
    en: {
      message: 'The commitment has no status recorded.',
      recommendation: 'This is normal if the notes do not say. Do not assume it is pending or completed.',
    },
  },
  COMMITMENT_STATUS_UNRECOGNIZED: {
    severity: 'warning',
    field: 'status',
    meaning: 'El estado no pertenece al vocabulario: not_started, in_progress, blocked, completed, cancelled.',
    es: {
      message: 'El estado del compromiso no pertenece al vocabulario reconocido.',
      recommendation: 'Usa not_started, in_progress, blocked, completed o cancelled, o déjalo en null si las notas no lo indican.',
    },
    en: {
      message: 'The commitment status is not in the recognized vocabulary.',
      recommendation: 'Use not_started, in_progress, blocked, completed or cancelled, or leave it null if the notes do not say.',
    },
  },
  DUPLICATE_ITEM: {
    severity: 'warning',
    field: 'description',
    meaning: 'Dos elementos de la misma lista tienen el mismo texto tras normalizar mayúsculas, acentos y puntuación.',
    es: {
      message: 'Este elemento repite el texto de {other} dentro de la misma lista.',
      recommendation: 'Revisa si son el mismo asunto y unifícalos, o distínguelos mejor.',
    },
    en: {
      message: 'This item repeats the text of {other} within the same list.',
      recommendation: 'Check whether they are the same matter and merge them, or tell them apart more clearly.',
    },
  },
  DUPLICATE_ACROSS_LISTS: {
    severity: 'warning',
    field: 'description',
    meaning: 'Dos elementos de listas distintas tienen el mismo texto tras normalizar, lo que puede indicar una clasificación inconsistente.',
    es: {
      message: 'Este elemento tiene el mismo texto que {other}, que está en otra lista.',
      recommendation: 'Revisa en qué lista debe estar y deja una sola entrada.',
    },
    en: {
      message: 'This item has the same text as {other}, which is in another list.',
      recommendation: 'Check which list it belongs in and keep a single entry.',
    },
  },
} as const satisfies Record<string, CodeDefinition>

export type IssueCode = keyof typeof CODE_DEFINITIONS
export const ALL_CODES = Object.keys(CODE_DEFINITIONS) as IssueCode[]

export function render(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
}
