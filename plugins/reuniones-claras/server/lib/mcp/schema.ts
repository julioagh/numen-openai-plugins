import { z } from 'zod'
import { LIMITS } from './limits'

/**
 * Objeto estricto: rechaza campos desconocidos sin repetir sus nombres en el error
 * (los nombres de campo podrían contener datos arbitrarios).
 */
const strict = <T extends z.ZodRawShape>(shape: T) =>
  z.strictObject(shape, {
    error: (issue) => (issue.code === 'unrecognized_keys' ? 'Unexpected field(s) are not allowed' : undefined),
  })

export const LANGUAGES = ['es', 'en'] as const
/** Clasificación explícita que la Skill asigna a cada elemento. */
export const CLASSIFICATIONS = ['confirmed', 'proposed', 'possibility', 'open'] as const
/** Vocabulario de estados de un compromiso. Solo se usa si las notas lo indican. */
export const STATUSES = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled'] as const

const description = z
  .string()
  .max(LIMITS.MAX_DESCRIPTION_CHARS)
  .describe(
    `Texto breve del elemento, tal como lo resumió la Skill (máx. ${LIMITS.MAX_DESCRIPTION_CHARS} caracteres). No enviar transcripciones.`,
  )

const classification = z
  .enum(CLASSIFICATIONS)
  .describe(
    'Clasificación explícita: confirmed (acuerdo explícito), proposed (propuesta no aprobada), possibility (posibilidad u opción), open (tema pendiente o pregunta abierta).',
  )

const DecisionItem = strict({
  description,
  classification,
  evidence: z
    .string()
    .max(LIMITS.MAX_EVIDENCE_CHARS)
    .nullish()
    .describe(
      `Cita textual breve de las notas que respalda la clasificación (máx. ${LIMITS.MAX_EVIDENCE_CHARS} caracteres). Omitir o null si no hay.`,
    ),
})

const ProposalItem = strict({ description, classification })

const CommitmentItem = strict({
  description,
  owner: z
    .string()
    .max(LIMITS.MAX_OWNER_CHARS)
    .nullish()
    .describe('Responsable indicado expresamente en las notas. null si no se especificó. No inferir.'),
  due_date: z
    .string()
    .max(LIMITS.MAX_DUE_DATE_CHARS)
    .nullish()
    .describe(
      'Fecha límite indicada en las notas. Usar YYYY-MM-DD solo si la fecha completa es inequívoca; si no, el texto original. null si no se especificó. No inferir.',
    ),
  status: z
    .string()
    .max(LIMITS.MAX_STATUS_CHARS)
    .nullish()
    .describe(
      'Estado solo si las notas lo indican: not_started, in_progress, blocked, completed o cancelled. null si no se especificó.',
    ),
})

const OpenItem = strict({ description, classification })

const list = <T extends z.ZodType>(item: T) => z.array(item).max(LIMITS.MAX_ITEMS_PER_LIST).optional()

export const InputSchema = strict({
  language: z.enum(LANGUAGES).describe('Idioma de las notas y de los mensajes de validación: es o en.'),
  decisions: list(DecisionItem).describe('Decisiones. Solo deberían contener acuerdos explícitos (confirmed).'),
  proposals: list(ProposalItem).describe('Propuestas y posibilidades discutidas pero no aprobadas.'),
  commitments: list(CommitmentItem).describe('Compromisos y acciones, con responsable, fecha y estado anulables.'),
  open_items: list(OpenItem).describe('Preguntas abiertas y temas pendientes.'),
})

export type MeetingRecord = z.infer<typeof InputSchema>

export const IssueSchema = z.object({
  code: z.string().describe('Código estable de la observación.'),
  severity: z.enum(['error', 'warning', 'info']),
  item: z.string().describe('Elemento afectado, por ejemplo commitments[2]. "record" si afecta a todo el registro.'),
  field: z.string().optional().describe('Campo afectado, cuando corresponda.'),
  message: z.string(),
  recommendation: z.string().describe('Sugerencia de revisión. Nunca completa información faltante.'),
})

export const OutputSchema = z.object({
  valid: z.boolean().describe('false si hay al menos una observación de severidad error.'),
  summary: z.string(),
  issues: z.array(IssueSchema),
  missing_fields: z.array(z.object({ item: z.string(), field: z.string() })),
})

export type Issue = z.infer<typeof IssueSchema>
export type ValidationResult = z.infer<typeof OutputSchema>
