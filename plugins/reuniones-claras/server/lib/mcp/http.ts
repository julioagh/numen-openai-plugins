import { LIMITS } from './limits'

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

/** Respuesta de error JSON-RPC segura: nunca incluye contenido de la solicitud. */
export function jsonRpcError(status: number, code: number, message: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), {
    status,
    headers: { ...BASE_HEADERS, ...extra },
  })
}

/**
 * Orígenes de navegador permitidos. Las llamadas de servidor a servidor (como las
 * de ChatGPT) no envían `Origin` y se aceptan. Si un navegador envía `Origin`, debe
 * estar en esta lista (protección contra DNS rebinding, exigida por la especificación MCP).
 */
const DEFAULT_ORIGINS = [
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://www.numen.la',
  'https://numen.la',
  'https://api.numen.la',
]

export function allowedOrigins(env: Record<string, string | undefined> = process.env): Set<string> {
  const extra = (env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  return new Set([...DEFAULT_ORIGINS, ...extra])
}

export function isOriginAllowed(
  origin: string | null,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (origin === null) return true
  if (allowedOrigins(env).has(origin)) return true
  const isProduction = env.NODE_ENV === 'production'
  return !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

export function hasJsonContentType(req: Request): boolean {
  return (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')
}

/** Lee el cuerpo respetando un máximo de bytes. Devuelve null si lo supera. */
export async function readBodyWithLimit(req: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) return null
  if (!req.body) return new Uint8Array(0)

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function withSafetyHeaders(res: Response): Response {
  const headers = new Headers(res.headers)
  headers.set('cache-control', 'no-store')
  headers.set('x-content-type-options', 'nosniff')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

export function methodNotAllowed(): Response {
  return jsonRpcError(405, -32000, 'Method not allowed. Use POST.', { allow: 'POST' })
}

/**
 * Aplica, antes de llegar al protocolo MCP: método, origen, tipo de contenido y
 * límite de tamaño. Cualquier fallo interno devuelve un error genérico sin datos.
 */
export function createGuardedHandler(
  inner: (req: Request) => Promise<Response>,
  env: Record<string, string | undefined> = process.env,
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== 'POST') return methodNotAllowed()
    if (!isOriginAllowed(req.headers.get('origin'), env)) return jsonRpcError(403, -32600, 'Forbidden origin')
    if (!hasJsonContentType(req)) return jsonRpcError(415, -32600, 'Unsupported content type. Use application/json.')

    const body = await readBodyWithLimit(req, LIMITS.MAX_BODY_BYTES)
    if (body === null) return jsonRpcError(413, -32600, 'Request too large')

    try {
      const forwarded = new Request(req.url, { method: 'POST', headers: req.headers, body: body as BodyInit })
      return withSafetyHeaders(await inner(forwarded))
    } catch {
      return jsonRpcError(500, -32603, 'Internal error')
    }
  }
}
