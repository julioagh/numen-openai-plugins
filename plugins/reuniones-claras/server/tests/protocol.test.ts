import { describe, expect, it } from 'vitest'
import { DELETE, GET, OPTIONS } from '../app/mcp/route'
import { LIMITS } from '../lib/mcp/limits'
import { OutputSchema } from '../lib/mcp/schema'
import { SERVER_VERSION, TOOL_NAME } from '../lib/mcp/server'
import { HEADERS, MCP_URL, callTool, post, rpc } from './helpers'

const init = () =>
  rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } })

describe('protocolo MCP (Streamable HTTP, sin estado)', () => {
  it('initialize responde con la información del servidor y sin sesión', async () => {
    const r = await init()
    expect(r.status).toBe(200)
    expect(r.json.result.serverInfo).toEqual({ name: 'reuniones-claras', version: SERVER_VERSION })
    expect(r.json.result.capabilities.tools.listChanged).toBe(false)
    expect(r.headers.get('mcp-session-id')).toBeNull()
  })

  it('tools/list funciona sin initialize previo y expone una sola herramienta de solo lectura', async () => {
    const r = await rpc('tools/list')
    expect(r.status).toBe(200)
    const tools = r.json.result.tools
    expect(tools).toHaveLength(1)
    const tool = tools[0]
    expect(tool.name).toBe(TOOL_NAME)
    expect(tool.description.length).toBeGreaterThan(50)
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false })
    expect(tool.inputSchema.required).toContain('language')
    expect(tool.inputSchema.additionalProperties).toBe(false)
    expect(Object.keys(tool.inputSchema.properties).sort()).toEqual(
      ['commitments', 'decisions', 'language', 'open_items', 'proposals'],
    )
    expect(tool.outputSchema).toBeDefined()
  })

  it('el esquema anunciado no incluye campos que las directrices desaconsejan', async () => {
    const r = await rpc('tools/list')
    const text = JSON.stringify(r.json.result.tools[0])
    expect(text).not.toMatch(/checked_at|meeting_id|timestamp|transcript/i)
  })

  it('tools/call devuelve un resultado que cumple el contrato de salida', async () => {
    const r = await callTool({
      language: 'es',
      decisions: [{ description: 'Migrar', classification: 'confirmed', evidence: 'Se acordó migrar en abril' }],
      commitments: [{ description: 'Enviar informe', owner: null, due_date: '03/04/2026', status: null }],
    })
    expect(r.status).toBe(200)
    expect(r.json.result.isError).toBeUndefined()
    const parsed = OutputSchema.safeParse(r.json.result.structuredContent)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.valid).toBe(true)
    expect(parsed.data?.issues.map((i) => i.code)).toEqual([
      'COMMITMENT_OWNER_MISSING',
      'COMMITMENT_DUE_DATE_AMBIGUOUS',
      'COMMITMENT_STATUS_MISSING',
    ])
    expect(r.json.result.content[0].type).toBe('text')
  })

  it('no requiere sesión persistente: las llamadas son independientes', async () => {
    const a = await callTool({ language: 'es', commitments: [{ description: 'a' }] })
    const b = await callTool({ language: 'es' })
    const a2 = await callTool({ language: 'es', commitments: [{ description: 'a' }] })
    expect(a.headers.get('mcp-session-id')).toBeNull()
    expect(b.json.result.structuredContent.issues.map((i: any) => i.code)).toEqual(['RECORD_EMPTY'])
    expect(a2.json.result.structuredContent).toEqual(a.json.result.structuredContent)
  })

  it('método inexistente: error de protocolo -32601', async () => {
    const r = await rpc('no/existe')
    expect(r.json.error.code).toBe(-32601)
  })

  it('JSON inválido: 400 con -32700 y sin eco', async () => {
    const r = await post('{"jsonrpc":"2.0","MARCADOR_JSON":')
    expect(r.status).toBe(400)
    expect(r.json.error.code).toBe(-32700)
    expect(r.raw).not.toContain('MARCADOR_JSON')
  })

  it('herramienta inexistente: error, no 500', async () => {
    const r = await callTool({ language: 'es' }, 'no_existe')
    expect(r.status).toBe(200)
    expect(Boolean(r.json.error) || r.json.result?.isError === true).toBe(true)
  })

  it('el mensaje de la solicitud no es una notificación ni un arreglo malformado: se maneja sin 500', async () => {
    const r = await post(JSON.stringify([1, 2, 3]))
    expect(r.status).toBeLessThan(500)
  })
})

describe('entradas inválidas en la herramienta', () => {
  const text = (r: any) => r.json.result.content.map((c: any) => c.text).join(' ')

  it('clasificación desconocida: isError y sin repetir el valor', async () => {
    const r = await callTool({ language: 'es', decisions: [{ description: 'a', classification: 'VALOR_SECRETO_1' }] })
    expect(r.json.result.isError).toBe(true)
    expect(text(r)).not.toContain('VALOR_SECRETO_1')
  })

  it('clave inesperada: isError y sin repetir el nombre de la clave', async () => {
    const r = await callTool({ language: 'es', CLAVE_SECRETA_2: 'x' })
    expect(r.json.result.isError).toBe(true)
    expect(text(r)).not.toContain('CLAVE_SECRETA_2')
  })

  it('tipo incorrecto: isError y sin repetir el valor', async () => {
    const r = await callTool({ language: 'es', decisions: 'VALOR_SECRETO_3' })
    expect(r.json.result.isError).toBe(true)
    expect(text(r)).not.toContain('VALOR_SECRETO_3')
  })

  it('texto demasiado largo: isError y sin repetir el texto', async () => {
    const long = 'MARCADOR_LARGO_' + 'x'.repeat(LIMITS.MAX_DESCRIPTION_CHARS)
    const r = await callTool({ language: 'es', open_items: [{ description: long, classification: 'open' }] })
    expect(r.json.result.isError).toBe(true)
    expect(text(r)).not.toContain('MARCADOR_LARGO_')
  })

  it('argumentos ausentes: isError', async () => {
    const r = await rpc('tools/call', { name: TOOL_NAME })
    expect(Boolean(r.json.error) || r.json.result?.isError === true).toBe(true)
  })

  it('descripción vacía: es un hallazgo de validación (no un error de esquema)', async () => {
    const r = await callTool({ language: 'es', decisions: [{ description: '', classification: 'proposed' }] })
    expect(r.json.result.isError).toBeUndefined()
    expect(r.json.result.structuredContent.valid).toBe(false)
  })
})

describe('datos restringidos (números de tarjeta)', () => {
  const flagged = async (description: string) => {
    const r = await callTool({ language: 'es', open_items: [{ description, classification: 'open' }] })
    return r.json.result.isError === true
  }

  it('rechaza un número de tarjeta válido, con o sin separadores, y no lo repite', async () => {
    expect(await flagged('pagar con 4111111111111111')).toBe(true)
    expect(await flagged('pagar con 4111 1111 1111 1111')).toBe(true)
    expect(await flagged('pagar con 4111-1111-1111-1111')).toBe(true)
    const r = await callTool({ language: 'es', open_items: [{ description: 'tarjeta 4111 1111 1111 1111', classification: 'open' }] })
    expect(r.raw).not.toContain('4111')
  })

  it('rechaza también si aparece en responsable o evidencia', async () => {
    const r = await callTool({ language: 'en', commitments: [{ description: 'x', owner: '4111111111111111' }] })
    expect(r.json.result.isError).toBe(true)
    const m = await callTool({ language: 'es', decisions: [{ description: 'x', classification: 'confirmed', evidence: 'cuenta 4111111111111111 ok' }] })
    expect(m.json.result.isError).toBe(true)
  })

  it('no marca números que no pasan la suma de Luhn ni números cortos', async () => {
    expect(await flagged('código 4111111111111112')).toBe(false)
    expect(await flagged('teléfono 987654321')).toBe(false)
    expect(await flagged('reunión del 2026-03-15 a las 10:00')).toBe(false)
  })
})

describe('capa HTTP', () => {
  it.each([
    ['GET', GET],
    ['DELETE', DELETE],
    ['OPTIONS', OPTIONS],
  ])('%s responde 405 con Allow: POST', async (_m, handler) => {
    const res = await handler()
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
  })

  it('exige Content-Type application/json', async () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect((await post(body, { accept: HEADERS.accept, 'content-type': 'text/plain' })).status).toBe(415)
    expect((await post(body, { accept: HEADERS.accept })).status).toBe(415)
    expect((await post(body, { ...HEADERS, 'content-type': 'application/json; charset=utf-8' })).status).toBe(200)
  })

  it('rechaza un Origin de navegador no permitido y acepta llamadas sin Origin', async () => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    const evil = await post(body, { ...HEADERS, origin: 'https://evil.example' })
    expect(evil.status).toBe(403)
    expect(evil.raw).not.toContain('evil.example')
    expect((await post(body, { ...HEADERS, origin: 'https://chatgpt.com' })).status).toBe(200)
    expect((await post(body)).status).toBe(200)
  })

  it('rechaza solicitudes demasiado grandes (413)', async () => {
    const big = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad: 'x'.repeat(LIMITS.MAX_BODY_BYTES + 10) } })
    const r = await post(big)
    expect(r.status).toBe(413)
    expect(r.raw).not.toContain('xxxxxxxx')
  })

  it('rechaza por tamaño también sin Content-Length (cuerpo en flujo)', async () => {
    const chunk = new Uint8Array(64 * 1024).fill(120)
    let sent = 0
    const stream = new ReadableStream({
      pull(controller) {
        if (sent >= LIMITS.MAX_BODY_BYTES + 64 * 1024) return controller.close()
        controller.enqueue(chunk)
        sent += chunk.byteLength
      },
    })
    const { POST } = await import('../app/mcp/route')
    const res = await POST(new Request(MCP_URL, { method: 'POST', headers: HEADERS, body: stream, duplex: 'half' } as RequestInit))
    expect(res.status).toBe(413)
  })

  it('acepta una solicitud justo por debajo del límite', async () => {
    const pad = 'x'.repeat(LIMITS.MAX_BODY_BYTES - 200)
    const r = await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad } }))
    expect(r.status).toBe(200)
  })

  it('añade cabeceras de seguridad y evita caché', async () => {
    const r = await rpc('tools/list')
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
