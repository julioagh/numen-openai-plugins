import { describe, expect, it } from 'vitest'
import { LIMITS } from '../lib/mcp/limits'
import { InputSchema, OutputSchema } from '../lib/mcp/schema'

const ok = { language: 'es', decisions: [{ description: 'a', classification: 'confirmed', evidence: 'cita breve aquí' }] }
const parse = (v: unknown) => InputSchema.safeParse(v)

describe('esquema de entrada: casos válidos', () => {
  it('acepta un registro completo', () => {
    expect(
      parse({
        language: 'en',
        decisions: [{ description: 'a', classification: 'confirmed', evidence: 'quoted text' }],
        proposals: [{ description: 'b', classification: 'possibility' }],
        commitments: [{ description: 'c', owner: null, due_date: null, status: null }],
        open_items: [{ description: 'd', classification: 'open' }],
      }).success,
    ).toBe(true)
  })

  it('las listas son opcionales y los campos anulables pueden omitirse', () => {
    expect(parse({ language: 'es' }).success).toBe(true)
    expect(parse({ language: 'es', commitments: [{ description: 'c' }] }).success).toBe(true)
  })

  it('acepta los límites exactos', () => {
    const items = Array.from({ length: LIMITS.MAX_ITEMS_PER_LIST }, () => ({
      description: 'x'.repeat(LIMITS.MAX_DESCRIPTION_CHARS),
      classification: 'open',
    }))
    expect(parse({ language: 'es', open_items: items }).success).toBe(true)
  })
})

describe('esquema de entrada: casos inválidos', () => {
  it.each([
    ['null', null],
    ['cadena', 'hola'],
    ['número', 42],
    ['arreglo', []],
    ['objeto vacío (sin idioma)', {}],
  ])('rechaza entrada malformada: %s', (_n, value) => {
    expect(parse(value).success).toBe(false)
  })

  it('rechaza idioma desconocido o ausente', () => {
    expect(parse({ ...ok, language: 'fr' }).success).toBe(false)
    expect(parse({ decisions: [] }).success).toBe(false)
  })

  it('rechaza tipos de dato incorrectos', () => {
    expect(parse({ ...ok, decisions: 'texto' }).success).toBe(false)
    expect(parse({ ...ok, decisions: [{ description: 123, classification: 'confirmed' }] }).success).toBe(false)
    expect(parse({ language: 'es', commitments: [{ description: 'c', owner: 5 }] }).success).toBe(false)
    expect(parse({ language: 'es', commitments: [{ description: 'c', due_date: ['2026-01-01'] }] }).success).toBe(false)
  })

  it('rechaza clasificación desconocida', () => {
    expect(parse({ ...ok, decisions: [{ description: 'a', classification: 'maybe' }] }).success).toBe(false)
  })

  it('rechaza elementos sin descripción o sin clasificación', () => {
    expect(parse({ ...ok, decisions: [{ classification: 'confirmed' }] }).success).toBe(false)
    expect(parse({ ...ok, decisions: [{ description: 'a' }] }).success).toBe(false)
  })

  it('rechaza estructura inesperada en cualquier nivel', () => {
    expect(parse({ ...ok, extra: 1 }).success).toBe(false)
    expect(parse({ ...ok, decisions: [{ description: 'a', classification: 'confirmed', extra: 1 }] }).success).toBe(false)
    expect(parse({ language: 'es', commitments: [{ description: 'c', extra: 1 }] }).success).toBe(false)
  })

  it('rechaza textos y listas que exceden los límites', () => {
    const tooLong = (n: number) => 'x'.repeat(n + 1)
    expect(parse({ language: 'es', open_items: [{ description: tooLong(LIMITS.MAX_DESCRIPTION_CHARS), classification: 'open' }] }).success).toBe(false)
    expect(parse({ language: 'es', decisions: [{ description: 'a', classification: 'confirmed', evidence: tooLong(LIMITS.MAX_EVIDENCE_CHARS) }] }).success).toBe(false)
    expect(parse({ language: 'es', commitments: [{ description: 'c', owner: tooLong(LIMITS.MAX_OWNER_CHARS) }] }).success).toBe(false)
    const many = Array.from({ length: LIMITS.MAX_ITEMS_PER_LIST + 1 }, () => ({ description: 'x', classification: 'open' }))
    expect(parse({ language: 'es', open_items: many }).success).toBe(false)
  })

  it('el mensaje por claves inesperadas no repite sus nombres', () => {
    const r = parse({ ...ok, CLAVE_SECRETA_XYZ: 1 })
    expect(r.success).toBe(false)
    // Lo que llega al cliente es el texto del mensaje (la ruta y el mensaje), no el objeto interno.
    const messages = r.error?.issues.map((i) => i.message).join(' | ') ?? ''
    expect(messages).toContain('Unexpected field')
    expect(messages).not.toContain('CLAVE_SECRETA_XYZ')
  })

  it('el mensaje por un valor inválido no repite el valor', () => {
    const r = parse({ ...ok, decisions: [{ description: 'a', classification: 'VALOR_SECRETO_XYZ' }] })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error?.issues)).not.toContain('VALOR_SECRETO_XYZ')
  })
})

describe('coherencia de límites', () => {
  it('el registro válido más grande cabe en el límite de tamaño de la solicitud', () => {
    const n = LIMITS.MAX_ITEMS_PER_LIST
    const long = 'é'.repeat(LIMITS.MAX_DESCRIPTION_CHARS)
    const record = {
      language: 'es',
      decisions: Array.from({ length: n }, () => ({ description: long, classification: 'confirmed', evidence: 'é'.repeat(LIMITS.MAX_EVIDENCE_CHARS) })),
      proposals: Array.from({ length: n }, () => ({ description: long, classification: 'proposed' })),
      commitments: Array.from({ length: n }, () => ({ description: long, owner: 'é'.repeat(LIMITS.MAX_OWNER_CHARS), due_date: 'é'.repeat(LIMITS.MAX_DUE_DATE_CHARS), status: 'é'.repeat(LIMITS.MAX_STATUS_CHARS) })),
      open_items: Array.from({ length: n }, () => ({ description: long, classification: 'open' })),
    }
    expect(parse(record).success).toBe(true)
    const bytes = new TextEncoder().encode(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'validate_meeting_record', arguments: record } })).byteLength
    expect(bytes).toBeLessThan(LIMITS.MAX_BODY_BYTES)
  })

  it('el esquema de salida acepta un resultado mínimo', () => {
    expect(OutputSchema.safeParse({ valid: true, summary: 's', issues: [], missing_fields: [] }).success).toBe(true)
  })
})
