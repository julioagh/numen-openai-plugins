import { CODE_DEFINITIONS, render, type CodeDefinition, type IssueCode, type Lang } from './codes'
import { classifyDate } from './dates'
import { LIMITS } from './limits'
import { isBlank, normalizeText } from './normalize'
import { STATUSES, type Issue, type MeetingRecord, type ValidationResult } from './schema'

type ListName = 'decisions' | 'proposals' | 'commitments' | 'open_items'

interface Context {
  lang: Lang
  issues: Issue[]
  missing: { item: string; field: string }[]
}

function add(ctx: Context, code: IssueCode, item: string, params: Record<string, string | number> = {}): void {
  const def: CodeDefinition = CODE_DEFINITIONS[code]
  const text = def[ctx.lang]
  ctx.issues.push({
    code,
    severity: def.severity,
    item,
    ...(def.field ? { field: def.field } : {}),
    message: render(text.message, params),
    recommendation: render(text.recommendation, params),
  })
  if (def.missing && def.field) ctx.missing.push({ item, field: def.field })
}

function normalizeStatus(value: string): string {
  return normalizeText(value).replace(/\s+/g, '_')
}

const SUMMARY = {
  es: {
    none: 'Validación estructural completada sin observaciones.',
    some: 'Validación estructural completada. Errores: {e}. Advertencias: {w}. Avisos informativos: {i}.',
    note: 'Esta validación solo revisa la consistencia del registro; no confirma que los acuerdos hayan ocurrido realmente.',
  },
  en: {
    none: 'Structural validation completed with no findings.',
    some: 'Structural validation completed. Errors: {e}. Warnings: {w}. Informational notes: {i}.',
    note: 'This validation only checks the record for consistency; it does not confirm that the agreements actually took place.',
  },
} as const

/**
 * Valida un registro estructurado de reunión con reglas determinísticas.
 * Es una función pura: no lee ni escribe nada fuera de sus argumentos, no
 * modifica el registro y no repite su contenido en los resultados.
 */
export function validateMeetingRecord(record: MeetingRecord): ValidationResult {
  const ctx: Context = { lang: record.language, issues: [], missing: [] }
  const decisions = record.decisions ?? []
  const proposals = record.proposals ?? []
  const commitments = record.commitments ?? []
  const openItems = record.open_items ?? []

  if (decisions.length + proposals.length + commitments.length + openItems.length === 0) {
    add(ctx, 'RECORD_EMPTY', 'record')
  }

  decisions.forEach((d, i) => {
    const item = `decisions[${i}]`
    if (isBlank(d.description)) add(ctx, 'DECISION_DESCRIPTION_EMPTY', item)
    if (d.classification === 'open') add(ctx, 'DECISION_CLASSIFIED_OPEN', item)
    else if (d.classification === 'proposed' || d.classification === 'possibility') add(ctx, 'DECISION_NOT_CONFIRMED', item)
    else if (isBlank(d.evidence)) add(ctx, 'DECISION_EVIDENCE_MISSING', item)
    else if ((d.evidence ?? '').trim().length < LIMITS.MIN_EVIDENCE_CHARS) {
      add(ctx, 'DECISION_EVIDENCE_INSUFFICIENT', item, { min: LIMITS.MIN_EVIDENCE_CHARS })
    }
  })

  proposals.forEach((p, i) => {
    const item = `proposals[${i}]`
    if (isBlank(p.description)) add(ctx, 'PROPOSAL_DESCRIPTION_EMPTY', item)
    if (p.classification === 'confirmed') add(ctx, 'PROPOSAL_MARKED_CONFIRMED', item)
  })

  commitments.forEach((c, i) => {
    const item = `commitments[${i}]`
    if (isBlank(c.description)) add(ctx, 'COMMITMENT_DESCRIPTION_EMPTY', item)
    if (isBlank(c.owner)) add(ctx, 'COMMITMENT_OWNER_MISSING', item)

    if (isBlank(c.due_date)) {
      add(ctx, 'COMMITMENT_DUE_DATE_MISSING', item)
    } else {
      switch (classifyDate(c.due_date as string)) {
        case 'iso_valid':
          break
        case 'iso_invalid':
        case 'numeric_invalid':
          add(ctx, 'COMMITMENT_DUE_DATE_INVALID', item)
          break
        case 'numeric_ambiguous':
          add(ctx, 'COMMITMENT_DUE_DATE_AMBIGUOUS', item)
          break
        case 'numeric_unambiguous':
          add(ctx, 'COMMITMENT_DUE_DATE_NOT_ISO', item)
          break
        case 'text':
          add(ctx, 'COMMITMENT_DUE_DATE_UNRESOLVED', item)
          break
      }
    }

    if (isBlank(c.status)) add(ctx, 'COMMITMENT_STATUS_MISSING', item)
    else if (!(STATUSES as readonly string[]).includes(normalizeStatus(c.status as string))) {
      add(ctx, 'COMMITMENT_STATUS_UNRECOGNIZED', item)
    }
  })

  openItems.forEach((o, i) => {
    const item = `open_items[${i}]`
    if (isBlank(o.description)) add(ctx, 'OPEN_ITEM_DESCRIPTION_EMPTY', item)
    if (o.classification === 'confirmed') add(ctx, 'OPEN_ITEM_MARKED_CONFIRMED', item)
  })

  // Duplicados: solo coincidencia exacta tras normalizar. No se interpreta el significado.
  const lists: [ListName, { description: string }[]][] = [
    ['decisions', decisions],
    ['proposals', proposals],
    ['commitments', commitments],
    ['open_items', openItems],
  ]
  const firstSeen = new Map<string, { list: ListName; index: number }>()
  for (const [list, items] of lists) {
    items.forEach((entry, index) => {
      const key = normalizeText(entry.description)
      if (!key) return
      const first = firstSeen.get(key)
      if (!first) {
        firstSeen.set(key, { list, index })
        return
      }
      const code: IssueCode = first.list === list ? 'DUPLICATE_ITEM' : 'DUPLICATE_ACROSS_LISTS'
      add(ctx, code, `${list}[${index}]`, { other: `${first.list}[${first.index}]` })
    })
  }

  const count = (severity: Issue['severity']) => ctx.issues.filter((x) => x.severity === severity).length
  const e = count('error')
  const w = count('warning')
  const inf = count('info')
  const texts = SUMMARY[ctx.lang]
  const headline = e + w + inf === 0 ? texts.none : render(texts.some, { e, w, i: inf })

  return {
    valid: e === 0,
    summary: `${headline} ${texts.note}`,
    issues: ctx.issues,
    missing_fields: ctx.missing,
  }
}

/** Texto plano equivalente al resultado estructurado, para clientes que solo muestran `content`. */
export function formatResultText(result: ValidationResult): string {
  const lines = [result.summary]
  for (const issue of result.issues) {
    const where = issue.field ? `${issue.item}.${issue.field}` : issue.item
    lines.push(`- [${issue.severity}] ${issue.code} (${where}): ${issue.message} ${issue.recommendation}`)
  }
  return lines.join('\n')
}
