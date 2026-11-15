import dns from 'node:dns'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { callTool, post, rpc } from './helpers'

const MARKER = 'MARCADOR_PRIVADO_9f3a7c'

/** Registro con datos que no deben aparecer en ningún registro, salida ni red. */
const sensitiveRecord = {
  language: 'es',
  decisions: [{ description: `Decisión ${MARKER}`, classification: 'confirmed', evidence: `cita ${MARKER}` }],
  proposals: [{ description: `Propuesta ${MARKER}`, classification: 'proposed' }],
  commitments: [{ description: `Compromiso ${MARKER}`, owner: `Responsable ${MARKER}`, due_date: `fecha ${MARKER}`, status: `estado ${MARKER}` }],
  open_items: [{ description: `Pendiente ${MARKER}`, classification: 'open' }],
}

/** Ejecuta un conjunto de solicitudes variadas: éxito, errores de esquema, de protocolo y de tamaño. */
async function exerciseServer() {
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } })
  await rpc('tools/list')
  await callTool(sensitiveRecord)
  await callTool({ ...sensitiveRecord, [`CLAVE_${MARKER}`]: 1 })
  await callTool({ language: 'es', decisions: [{ description: MARKER, classification: MARKER }] })
  await callTool({ language: 'es', decisions: MARKER })
  await callTool({ language: 'es', open_items: [{ description: `${MARKER} 4111 1111 1111 1111`, classification: 'open' }] })
  await post(`{"jsonrpc":"2.0","${MARKER}":`)
  await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: `${MARKER}/no-existe` }))
  await post(JSON.stringify({ pad: MARKER + 'x'.repeat(400 * 1024) }))
}

afterEach(() => vi.restoreAllMocks())

describe('no se registran cuerpos de solicitudes ni datos de reuniones', () => {
  it('ninguna salida de consola ni de proceso contiene el contenido recibido', async () => {
    const captured: string[] = []
    const grab = (...args: unknown[]) => captured.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
      vi.spyOn(console, method).mockImplementation(grab)
    }
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown) => (grab(String(chunk)), true)) as any)
    vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => (grab(String(chunk)), true)) as any)

    await exerciseServer()

    expect(captured.join('\n')).not.toContain(MARKER)
  })
})

describe('no se persisten solicitudes ni resultados', () => {
  it('no se escribe en disco durante el procesamiento', async () => {
    const calls: string[] = []
    const record = (name: string) => (...args: unknown[]) => {
      calls.push(`${name}(${args.map((a) => String(a).slice(0, 200)).join(', ')})`)
      throw new Error('escritura bloqueada por la prueba')
    }
    for (const name of ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync', 'createWriteStream', 'mkdir', 'mkdirSync', 'rename', 'renameSync'] as const) {
      vi.spyOn(fs, name as any).mockImplementation(record(name) as any)
    }
    for (const name of ['writeFile', 'appendFile', 'mkdir'] as const) {
      vi.spyOn(fs.promises, name as any).mockImplementation(record(`promises.${name}`) as any)
    }

    await exerciseServer()

    expect(calls).toEqual([])
  })

  it('el código de la aplicación no importa módulos de almacenamiento, disco ni base de datos', () => {
    const forbidden =
      /from ['"](node:)?(fs|fs\/promises|child_process|worker_threads|cluster)['"]|require\(|@vercel\/(kv|blob|postgres|edge-config)|redis|mongo|sqlite|prisma|drizzle|firebase|supabase|localStorage|indexedDB/i
    for (const file of sourceFiles()) {
      expect(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file)).not.toMatch(forbidden)
    }
  })
})

describe('no se envía información a servicios externos', () => {
  it('no hay llamadas de red de salida durante el procesamiento', async () => {
    const outbound: string[] = []
    const block = (name: string) => () => {
      outbound.push(name)
      throw new Error('red bloqueada por la prueba')
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(block('fetch') as any)
    vi.spyOn(http, 'request').mockImplementation(block('http.request') as any)
    vi.spyOn(https, 'request').mockImplementation(block('https.request') as any)
    vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(block('net.Socket.connect') as any)
    vi.spyOn(dns, 'lookup').mockImplementation(block('dns.lookup') as any)

    await exerciseServer()

    expect(outbound).toEqual([])
  })

  it('el código de la aplicación no contiene clientes de red ni SDK de IA o analítica', () => {
    // Se buscan llamadas e importaciones reales; la palabra "openai" aparece legítimamente en la lista de orígenes.
    const forbidden =
      /\bfetch\(|XMLHttpRequest|from ['"](axios|node-fetch|got|undici)['"]|from ['"](node:)?(http|https|net|dns|tls|dgram)['"]|from ['"](openai|@anthropic-ai\/[^'"]+|@google[^'"]*|@sentry\/[^'"]+|@vercel\/(analytics|speed-insights)|posthog[^'"]*|mixpanel[^'"]*|@segment\/[^'"]+|dd-trace|datadog[^'"]*)['"]|gtag\(|googletagmanager/i
    for (const file of sourceFiles()) {
      expect(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file)).not.toMatch(forbidden)
    }
  })
})

describe('los errores no exponen datos recibidos', () => {
  // Limitación conocida y documentada: para una herramienta inexistente el SDK repite el nombre que
  // envió el cliente ("Tool X not found"). Un nombre de herramienta no es contenido de reunión.

  it('ninguna respuesta de error repite el contenido enviado', async () => {
    const bodies = [
      await callTool({ ...sensitiveRecord, [`CLAVE_${MARKER}`]: 1 }),
      await callTool({ language: 'es', decisions: [{ description: MARKER, classification: MARKER }] }),
      await callTool({ language: 'es', decisions: MARKER }),
      await callTool({ language: 'es', open_items: [{ description: `${MARKER} 4111 1111 1111 1111`, classification: 'open' }] }),
      await post(`{"jsonrpc":"2.0","${MARKER}":`),
      await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: `${MARKER}/no-existe` })),
      await post(JSON.stringify({ pad: MARKER + 'x'.repeat(400 * 1024) })),
    ]
    for (const r of bodies) expect(r.raw).not.toContain(MARKER)
  })

  it('las respuestas válidas nunca repiten el contenido enviado', async () => {
    const r = await callTool(sensitiveRecord)
    expect(r.json.result.structuredContent).toBeDefined()
    expect(r.raw).not.toContain(MARKER)
  })
})

describe('variables de entorno', () => {
  it('el código solo lee NODE_ENV y MCP_ALLOWED_ORIGINS', () => {
    const allowed = new Set(['NODE_ENV', 'MCP_ALLOWED_ORIGINS'])
    for (const file of sourceFiles()) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/\benv\.([A-Z][A-Z0-9_]*)/g)) {
        expect(allowed.has(match[1]), `${path.relative(process.cwd(), file)}: ${match[1]}`).toBe(true)
      }
    }
  })

  it('no hay secretos en el código fuente', () => {
    const secretLike = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|api[_-]?key\s*[:=]\s*['"][^'"]{8,})/i
    for (const file of sourceFiles()) {
      expect(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file)).not.toMatch(secretLike)
    }
  })
})

function sourceFiles(): string[] {
  const roots = ['lib', 'app']
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(full)
    }
  }
  roots.forEach((r) => walk(path.join(process.cwd(), r)))
  expect(out.length).toBeGreaterThan(8)
  return out
}
