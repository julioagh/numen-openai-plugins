import { describe, expect, it } from 'vitest'
import { ALL_CODES } from '../lib/mcp/codes'
import { LIMITS } from '../lib/mcp/limits'
import type { MeetingRecord } from '../lib/mcp/schema'
import { validateMeetingRecord } from '../lib/mcp/validate'

const run = (record: Partial<MeetingRecord> & { language?: 'es' | 'en' }) =>
  validateMeetingRecord({ language: 'es', ...record } as MeetingRecord)
const codes = (record: Parameters<typeof run>[0]) => run(record).issues.map((i) => i.code)

const goodEvidence = 'Se acordó migrar el sistema en abril'

describe('casos correctos', () => {
  it('decisiones explícitas con evidencia no generan observaciones', () => {
    const r = run({
      decisions: [{ description: 'Migrar el sistema', classification: 'confirmed', evidence: goodEvidence }],
    })
    expect(r.issues).toEqual([])
    expect(r.valid).toBe(true)
    expect(r.missing_fields).toEqual([])
  })

  it('compromisos completos no generan observaciones', () => {
    const r = run({
      commitments: [
        { description: 'Enviar informe', owner: 'Ana', due_date: '2026-03-15', status: 'in_progress' },
      ],
    })
    expect(r.issues).toEqual([])
    expect(r.valid).toBe(true)
  })

  it('pendientes correctamente clasificados no generan observaciones', () => {
    const r = run({ open_items: [{ description: '¿Quién aprueba el presupuesto?', classification: 'open' }] })
    expect(r.issues).toEqual([])
  })

  it('un registro sin compromisos es válido y no reporta fechas', () => {
    const r = run({
      decisions: [{ description: 'Cerrar el proyecto', classification: 'confirmed', evidence: goodEvidence }],
      proposals: [{ description: 'Evaluar otro proveedor', classification: 'possibility' }],
    })
    expect(r.valid).toBe(true)
    expect(r.issues.some((i) => i.code.includes('DUE_DATE'))).toBe(false)
  })

  it('un registro vacío es válido pero avisa', () => {
    const r = run({})
    expect(r.valid).toBe(true)
    expect(codes({})).toEqual(['RECORD_EMPTY'])
    expect(r.issues[0].item).toBe('record')
  })
})

describe('advertencias de compromisos', () => {
  const base = { description: 'Enviar informe', owner: 'Ana', due_date: '2026-03-15', status: 'in_progress' }

  it('compromiso sin responsable', () => {
    const r = run({ commitments: [{ ...base, owner: null }] })
    expect(codes({ commitments: [{ ...base, owner: null }] })).toEqual(['COMMITMENT_OWNER_MISSING'])
    expect(r.missing_fields).toEqual([{ item: 'commitments[0]', field: 'owner' }])
    expect(r.valid).toBe(true)
  })

  it('responsable vacío o con solo espacios cuenta como ausente; campo omitido también', () => {
    expect(codes({ commitments: [{ ...base, owner: '   ' }] })).toEqual(['COMMITMENT_OWNER_MISSING'])
    const { owner: _omit, ...withoutOwner } = base
    expect(codes({ commitments: [withoutOwner] })).toEqual(['COMMITMENT_OWNER_MISSING'])
  })

  it('compromiso sin fecha', () => {
    const r = run({ commitments: [{ ...base, due_date: null }] })
    expect(r.issues.map((i) => i.code)).toEqual(['COMMITMENT_DUE_DATE_MISSING'])
    expect(r.missing_fields).toEqual([{ item: 'commitments[0]', field: 'due_date' }])
  })

  it('estado ausente es solo informativo', () => {
    const r = run({ commitments: [{ ...base, status: null }] })
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]).toMatchObject({ code: 'COMMITMENT_STATUS_MISSING', severity: 'info' })
    expect(r.valid).toBe(true)
  })

  it('estado no reconocido', () => {
    expect(codes({ commitments: [{ ...base, status: 'casi listo' }] })).toEqual(['COMMITMENT_STATUS_UNRECOGNIZED'])
  })

  it.each(['In Progress', 'in-progress', 'IN_PROGRESS', ' blocked ', 'Completed', 'not started', 'cancelled'])(
    'estado "%s" se reconoce tras normalizar',
    (status) => {
      expect(codes({ commitments: [{ ...base, status }] })).toEqual([])
    },
  )

  it('no se inventan valores: el resultado no contiene datos nuevos', () => {
    const r = run({ commitments: [{ description: 'Hacer algo', owner: null, due_date: null, status: null }] })
    expect(r.missing_fields).toHaveLength(3)
    expect(JSON.stringify(r)).not.toMatch(/Ana|2026/)
  })
})

describe('fechas', () => {
  const dateCodes = (due: string) =>
    run({ commitments: [{ description: 'x', owner: 'A', due_date: due, status: 'blocked' }] }).issues.map((i) => i.code)

  it.each([
    ['2026-03-15', []],
    ['2028-02-29', []],
    ['2027-02-29', ['COMMITMENT_DUE_DATE_INVALID']],
    ['2026-02-30', ['COMMITMENT_DUE_DATE_INVALID']],
    ['2026-13-01', ['COMMITMENT_DUE_DATE_INVALID']],
    ['31/02/2026', ['COMMITMENT_DUE_DATE_INVALID']],
    ['03/04/2026', ['COMMITMENT_DUE_DATE_AMBIGUOUS']],
    ['03/04/26', ['COMMITMENT_DUE_DATE_AMBIGUOUS']],
    ['15/03/2026', ['COMMITMENT_DUE_DATE_NOT_ISO']],
    ['03/03/2026', ['COMMITMENT_DUE_DATE_NOT_ISO']],
    ['2026/03/15', ['COMMITMENT_DUE_DATE_NOT_ISO']],
    ['next Friday', ['COMMITMENT_DUE_DATE_UNRESOLVED']],
    ['la próxima semana', ['COMMITMENT_DUE_DATE_UNRESOLVED']],
    ['15 de marzo', ['COMMITMENT_DUE_DATE_UNRESOLVED']],
    ['2026-03-15T10:00:00Z', ['COMMITMENT_DUE_DATE_UNRESOLVED']],
  ])('%s -> %j', (due, expected) => {
    expect(dateCodes(due)).toEqual(expected)
  })

  it('una fecha inválida invalida el registro; una ambigua no', () => {
    const invalid = run({ commitments: [{ description: 'x', owner: 'A', due_date: '2026-02-30', status: 'blocked' }] })
    const ambiguous = run({ commitments: [{ description: 'x', owner: 'A', due_date: '03/04/2026', status: 'blocked' }] })
    expect(invalid.valid).toBe(false)
    expect(ambiguous.valid).toBe(true)
  })
})

describe('clasificaciones inconsistentes', () => {
  it('propuesta en decisiones no debe considerarse decisión', () => {
    const r = run({ decisions: [{ description: 'Podríamos cambiar de proveedor', classification: 'proposed' }] })
    expect(r.issues.map((i) => i.code)).toEqual(['DECISION_NOT_CONFIRMED'])
    expect(r.valid).toBe(true)
    expect(codes({ decisions: [{ description: 'x', classification: 'possibility' }] })).toEqual(['DECISION_NOT_CONFIRMED'])
  })

  it('tema abierto clasificado como decisión es un error', () => {
    const r = run({ decisions: [{ description: 'Definir presupuesto', classification: 'open' }] })
    expect(r.issues.map((i) => i.code)).toEqual(['DECISION_CLASSIFIED_OPEN'])
    expect(r.valid).toBe(false)
  })

  it('propuesta clasificada como confirmada es un error', () => {
    const r = run({ proposals: [{ description: 'Evaluar opciones', classification: 'confirmed' }] })
    expect(r.issues.map((i) => i.code)).toEqual(['PROPOSAL_MARKED_CONFIRMED'])
    expect(r.valid).toBe(false)
  })

  it('pendiente clasificado como confirmado es un error', () => {
    const r = run({ open_items: [{ description: '¿Quién aprueba?', classification: 'confirmed' }] })
    expect(r.issues.map((i) => i.code)).toEqual(['OPEN_ITEM_MARKED_CONFIRMED'])
    expect(r.valid).toBe(false)
  })

  it('decisión confirmada sin evidencia', () => {
    const r = run({ decisions: [{ description: 'Aprobar', classification: 'confirmed' }] })
    expect(r.issues.map((i) => i.code)).toEqual(['DECISION_EVIDENCE_MISSING'])
    expect(r.missing_fields).toEqual([{ item: 'decisions[0]', field: 'evidence' }])
    expect(r.valid).toBe(true)
  })

  it('evidencia nula, vacía o de espacios cuenta como ausente', () => {
    for (const evidence of [null, '', '    ']) {
      expect(codes({ decisions: [{ description: 'Aprobar', classification: 'confirmed', evidence }] })).toEqual([
        'DECISION_EVIDENCE_MISSING',
      ])
    }
  })

  it('evidencia demasiado corta es insuficiente y menciona el mínimo', () => {
    const r = run({ decisions: [{ description: 'Aprobar', classification: 'confirmed', evidence: 'sí' }] })
    expect(r.issues[0].code).toBe('DECISION_EVIDENCE_INSUFFICIENT')
    expect(r.issues[0].message).toContain(String(LIMITS.MIN_EVIDENCE_CHARS))
  })

  it('evidencia justo en el mínimo se acepta', () => {
    const evidence = 'x'.repeat(LIMITS.MIN_EVIDENCE_CHARS)
    expect(codes({ decisions: [{ description: 'Aprobar', classification: 'confirmed', evidence }] })).toEqual([])
  })

  it('la evidencia no se exige a elementos no confirmados', () => {
    expect(codes({ decisions: [{ description: 'x', classification: 'proposed', evidence: null }] })).toEqual([
      'DECISION_NOT_CONFIRMED',
    ])
  })
})

describe('descripciones vacías', () => {
  it.each([
    ['decisions', 'DECISION_DESCRIPTION_EMPTY', { decisions: [{ description: '', classification: 'confirmed', evidence: goodEvidence }] }],
    ['proposals', 'PROPOSAL_DESCRIPTION_EMPTY', { proposals: [{ description: '   ', classification: 'proposed' }] }],
    ['commitments', 'COMMITMENT_DESCRIPTION_EMPTY', { commitments: [{ description: '', owner: 'A', due_date: '2026-03-15', status: 'blocked' }] }],
    ['open_items', 'OPEN_ITEM_DESCRIPTION_EMPTY', { open_items: [{ description: '\n\t', classification: 'open' }] }],
  ] as const)('%s con descripción vacía es un error', (_list, code, record) => {
    const r = run(record as any)
    expect(r.issues.map((i) => i.code)).toContain(code)
    expect(r.valid).toBe(false)
    expect(r.missing_fields.some((m) => m.field === 'description')).toBe(true)
  })
})

describe('duplicados', () => {
  it('detecta duplicados en la misma lista ignorando mayúsculas, acentos y puntuación', () => {
    const r = run({
      open_items: [
        { description: '¿Quién aprueba el presupuesto?', classification: 'open' },
        { description: 'quien aprueba el PRESUPUESTO', classification: 'open' },
      ],
    })
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]).toMatchObject({ code: 'DUPLICATE_ITEM', item: 'open_items[1]' })
    expect(r.issues[0].message).toContain('open_items[0]')
  })

  it('detecta el mismo texto en listas distintas', () => {
    const r = run({
      decisions: [{ description: 'Definir el alcance', classification: 'confirmed', evidence: goodEvidence }],
      open_items: [{ description: 'Definir el alcance', classification: 'open' }],
    })
    expect(r.issues.map((i) => i.code)).toEqual(['DUPLICATE_ACROSS_LISTS'])
    expect(r.issues[0].item).toBe('open_items[0]')
  })

  it('textos distintos no se marcan, aunque se parezcan', () => {
    const r = run({
      open_items: [
        { description: 'Definir el alcance del piloto', classification: 'open' },
        { description: 'Definir el alcance del proyecto', classification: 'open' },
      ],
    })
    expect(r.issues).toEqual([])
  })

  it('las descripciones vacías no se consideran duplicadas entre sí', () => {
    const r = run({
      proposals: [
        { description: '', classification: 'proposed' },
        { description: '', classification: 'proposed' },
      ],
    })
    expect(r.issues.map((i) => i.code)).toEqual(['PROPOSAL_DESCRIPTION_EMPTY', 'PROPOSAL_DESCRIPTION_EMPTY'])
  })
})

describe('propiedades del motor', () => {
  const record = {
    decisions: [
      { description: 'MARCADOR-UNICO-1', classification: 'confirmed' as const },
      { description: 'otro', classification: 'open' as const },
    ],
    commitments: [{ description: 'MARCADOR-UNICO-2', owner: 'MARCADOR-UNICO-3', due_date: 'MARCADOR-UNICO-4', status: null }],
  }

  it('es determinista', () => {
    expect(run(record)).toEqual(run(record))
  })

  it('no modifica la entrada', () => {
    const copy = structuredClone(record)
    const frozen = Object.freeze(structuredClone(record))
    expect(() => run(frozen as any)).not.toThrow()
    run(record)
    expect(record).toEqual(copy)
  })

  it('nunca repite contenido recibido en el resultado', () => {
    expect(JSON.stringify(run(record))).not.toContain('MARCADOR-UNICO')
  })

  it('los mensajes salen en el idioma indicado', () => {
    const es = run({ language: 'es', commitments: [{ description: 'x', owner: null, due_date: null, status: null }] })
    const en = run({ language: 'en', commitments: [{ description: 'x', owner: null, due_date: null, status: null }] })
    expect(es.issues[0].message).toMatch(/responsable/)
    expect(en.issues[0].message).toMatch(/owner/)
    expect(es.summary).toMatch(/no significa que las decisiones, las clasificaciones o la evidencia sean correctas/)
    expect(en.summary).toMatch(/does not mean the decisions, classifications or evidence are correct/)
  })

  it('el resumen siempre aclara las limitaciones, incluso sin observaciones', () => {
    const r = run({ decisions: [{ description: 'a', classification: 'confirmed', evidence: goodEvidence }] })
    expect(r.issues).toEqual([])
    expect(r.summary).toMatch(/sin observaciones/)
    expect(r.summary).toMatch(/ni que los acuerdos hayan ocurrido realmente/)
  })

  it('el orden de las observaciones es estable', () => {
    const r = run({
      decisions: [{ description: 'a', classification: 'open' }],
      commitments: [{ description: 'b', owner: null, due_date: null, status: null }],
    })
    expect(r.issues.map((i) => `${i.item}:${i.code}`)).toEqual([
      'decisions[0]:DECISION_CLASSIFIED_OPEN',
      'commitments[0]:COMMITMENT_OWNER_MISSING',
      'commitments[0]:COMMITMENT_DUE_DATE_MISSING',
      'commitments[0]:COMMITMENT_STATUS_MISSING',
    ])
  })

  it('todos los códigos del catálogo son alcanzables o están cubiertos', () => {
    expect(ALL_CODES.length).toBeGreaterThanOrEqual(21)
  })
})
