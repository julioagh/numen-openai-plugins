// Verificación remota del servidor MCP con el cliente MCP oficial.
// Uso:   MCP_URL=https://<host>/mcp npm run smoke
// No escribe ni envía datos reales: usa registros de prueba con un marcador único.
import assert from 'node:assert/strict'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const url = process.env.MCP_URL
if (!url) {
  console.error('Falta MCP_URL. Ejemplo: MCP_URL=https://reuniones-claras-mcp.vercel.app/mcp npm run smoke')
  process.exit(2)
}
const target = new URL(url)
const MARKER = 'MARCADOR_SMOKE_7c41'
const MCP_HEADERS = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
const checks = []
const check = (name, fn) => checks.push([name, fn])

const connect = async () => {
  const client = new Client({ name: 'smoke', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(target))
  return client
}

check('HTTPS y respuesta a una solicitud MCP', async () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(target.hostname)
  assert.ok(target.protocol === 'https:' || isLocal, 'la URL pública debe ser HTTPS')
  const res = await fetch(target, { method: 'POST', headers: MCP_HEADERS, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
  assert.equal(res.status, 200, `estado ${res.status} (¿protección de despliegue activa? ¿ruta incorrecta?)`)
})

check('el cliente oficial descubre una sola herramienta de solo lectura', async () => {
  const client = await connect()
  try {
    const { tools } = await client.listTools()
    assert.equal(tools.length, 1)
    assert.equal(tools[0].name, 'validate_meeting_record')
    assert.equal(tools[0].annotations?.readOnlyHint, true)
    assert.equal(tools[0].annotations?.destructiveHint, false)
    assert.equal(tools[0].annotations?.openWorldHint, false)
    assert.ok(tools[0].outputSchema, 'falta el esquema de salida')
  } finally {
    await client.close()
  }
})

check('invoca la herramienta y cumple el contrato de salida', async () => {
  const client = await connect()
  try {
    const res = await client.callTool({
      name: 'validate_meeting_record',
      arguments: {
        language: 'es',
        decisions: [{ description: `Migrar ${MARKER}`, classification: 'confirmed', evidence: 'Se acordó migrar en abril' }],
        commitments: [{ description: 'Enviar informe', owner: null, due_date: '03/04/2026', status: null }],
      },
    })
    assert.notEqual(res.isError, true)
    const out = res.structuredContent
    assert.equal(typeof out.valid, 'boolean')
    assert.equal(typeof out.summary, 'string')
    assert.deepEqual(out.issues.map((i) => i.code), ['COMMITMENT_OWNER_MISSING', 'COMMITMENT_DUE_DATE_AMBIGUOUS', 'COMMITMENT_STATUS_MISSING'])
    assert.ok(!JSON.stringify(res).includes(MARKER), 'la respuesta repite contenido recibido')
    for (const key of Object.keys(out)) assert.ok(['valid', 'summary', 'issues', 'missing_fields'].includes(key), `campo inesperado en la salida: ${key}`)
  } finally {
    await client.close()
  }
})

check('una entrada inválida se rechaza sin repetir el contenido', async () => {
  const client = await connect()
  try {
    let result
    try {
      result = await client.callTool({ name: 'validate_meeting_record', arguments: { language: 'es', decisions: [{ description: MARKER, classification: MARKER }] } })
    } catch (error) {
      result = { isError: true, text: String(error?.message ?? error) }
    }
    assert.equal(result.isError, true)
    assert.ok(!JSON.stringify(result).includes(MARKER))
  } finally {
    await client.close()
  }
})

check('rechaza un número de tarjeta sin repetirlo', async () => {
  const client = await connect()
  try {
    const res = await client.callTool({ name: 'validate_meeting_record', arguments: { language: 'es', open_items: [{ description: 'pagar con 4111 1111 1111 1111', classification: 'open' }] } })
    assert.equal(res.isError, true)
    assert.ok(!JSON.stringify(res).includes('4111'))
  } finally {
    await client.close()
  }
})

check('GET se rechaza con 405 y Allow: POST', async () => {
  const res = await fetch(target)
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'POST')
})

check('un Origin de navegador ajeno se rechaza con 403', async () => {
  const res = await fetch(target, { method: 'POST', headers: { ...MCP_HEADERS, origin: 'https://evil.example' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
  assert.equal(res.status, 403)
})

check('un Content-Type incorrecto se rechaza con 415', async () => {
  const res = await fetch(target, { method: 'POST', headers: { accept: MCP_HEADERS.accept, 'content-type': 'text/plain' }, body: '{}' })
  assert.equal(res.status, 415)
})

check('una solicitud demasiado grande se rechaza con 413', async () => {
  const res = await fetch(target, { method: 'POST', headers: MCP_HEADERS, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad: 'x'.repeat(300 * 1024) } }) })
  assert.equal(res.status, 413)
})

check('las respuestas no se guardan en caché', async () => {
  const res = await fetch(target, { method: 'POST', headers: MCP_HEADERS, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) })
  assert.match(res.headers.get('cache-control') ?? '', /no-store/)
})

let failed = 0
console.log(`Verificando ${target.origin}${target.pathname}\n`)
for (const [name, fn] of checks) {
  try {
    await fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed++
    console.log(`FALLA ${name}\n      ${error.message}`)
  }
}
console.log(failed === 0 ? `\nSMOKE: ${checks.length}/${checks.length} comprobaciones correctas` : `\nSMOKE: ${failed} fallo(s) de ${checks.length}`)
process.exit(failed === 0 ? 0 : 1)
