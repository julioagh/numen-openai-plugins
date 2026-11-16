// Prueba de extremo a extremo con el cliente MCP oficial contra el servidor de producción local.
// Requisito previo: `npm run build`. Uso: `npm run test:e2e`.
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const port = Number(process.env.E2E_PORT ?? 3101)
const base = `http://127.0.0.1:${port}`
const server = spawn('node_modules/.bin/next', ['start', '-p', String(port), '-H', '127.0.0.1'], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverOutput = ''
server.stdout.on('data', (d) => (serverOutput += d))
server.stderr.on('data', (d) => (serverOutput += d))

async function waitUntilReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(base)
      if (res.ok) return
    } catch {}
    await sleep(500)
  }
  throw new Error('El servidor no arrancó a tiempo.\n' + serverOutput)
}

const MARKER = 'MARCADOR_E2E_5d2b'
const results = []
const check = (name, fn) => results.push([name, fn])

check('el cliente oficial se conecta, descubre y ejecuta la herramienta', async () => {
  const client = new Client({ name: 'e2e', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`))
  await client.connect(transport)
  try {
    const { tools } = await client.listTools()
    assert.equal(tools.length, 1)
    assert.equal(tools[0].name, 'validate_meeting_record')
    assert.equal(tools[0].annotations?.readOnlyHint, true)
    assert.equal(tools[0].annotations?.destructiveHint, false)
    assert.equal(tools[0].annotations?.openWorldHint, false)

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
    assert.equal(out.valid, true)
    assert.deepEqual(out.issues.map((i) => i.code), [
      'COMMITMENT_OWNER_MISSING',
      'COMMITMENT_DUE_DATE_AMBIGUOUS',
      'COMMITMENT_STATUS_MISSING',
    ])
    assert.ok(!JSON.stringify(res).includes(MARKER), 'la respuesta repite contenido recibido')
  } finally {
    await client.close()
  }
})

check('una entrada inválida devuelve isError sin repetir el contenido', async () => {
  const client = new Client({ name: 'e2e', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)))
  try {
    let result
    try {
      result = await client.callTool({
        name: 'validate_meeting_record',
        arguments: { language: 'es', decisions: [{ description: MARKER, classification: MARKER }] },
      })
    } catch (error) {
      result = { isError: true, content: [{ text: String(error?.message ?? error) }] }
    }
    assert.equal(result.isError, true)
    assert.ok(!JSON.stringify(result).includes(MARKER))
  } finally {
    await client.close()
  }
})

check('varias conexiones independientes no comparten estado', async () => {
  const run = async () => {
    const c = new Client({ name: 'e2e', version: '1.0.0' })
    await c.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)))
    const r = await c.callTool({ name: 'validate_meeting_record', arguments: { language: 'en' } })
    await c.close()
    return r.structuredContent
  }
  const [a, b] = await Promise.all([run(), run()])
  assert.deepEqual(a, b)
  assert.equal(a.issues[0].code, 'RECORD_EMPTY')
})

check('GET y un Origin no permitido se rechazan', async () => {
  const get = await fetch(`${base}/mcp`)
  assert.equal(get.status, 405)
  const evil = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', origin: 'https://evil.example' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  })
  assert.equal(evil.status, 403)
})

check('el servidor no escribe el contenido recibido en su salida', async () => {
  assert.ok(!serverOutput.includes(MARKER), 'el contenido apareció en los registros del servidor')
})

let failed = 0
try {
  await waitUntilReady()
  for (const [name, fn] of results) {
    try {
      await fn()
      console.log(`  ok  ${name}`)
    } catch (error) {
      failed++
      console.log(`FALLA ${name}\n      ${error.message}`)
    }
  }
} finally {
  server.kill('SIGTERM')
}
console.log(failed === 0 ? `\nE2E: ${results.length}/${results.length} comprobaciones correctas` : `\nE2E: ${failed} fallo(s)`)
process.exit(failed === 0 ? 0 : 1)
