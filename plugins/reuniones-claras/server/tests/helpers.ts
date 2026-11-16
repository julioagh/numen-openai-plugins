import { POST } from '../app/mcp/route'

export const MCP_URL = 'http://localhost/mcp'
export const HEADERS = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }

export interface RpcResponse {
  status: number
  headers: Headers
  raw: string
  /** Primer mensaje JSON-RPC de la respuesta (JSON directo o evento SSE). */
  json: any
}

export function parseBody(raw: string): any {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const data = trimmed.split('\n').find((line) => line.startsWith('data:'))
  return data ? JSON.parse(data.slice(5).trim()) : undefined
}

export async function post(body: BodyInit, headers: Record<string, string> = HEADERS): Promise<RpcResponse> {
  const res = await POST(new Request(MCP_URL, { method: 'POST', headers, body }))
  const raw = await res.text()
  let json: any
  try {
    json = parseBody(raw)
  } catch {
    json = undefined
  }
  return { status: res.status, headers: res.headers, raw, json }
}

export function rpc(method: string, params?: unknown, id: number | string = 1, headers = HEADERS) {
  return post(JSON.stringify({ jsonrpc: '2.0', id, method, params }), headers)
}

export function callTool(args: unknown, name = 'validate_meeting_record') {
  return rpc('tools/call', { name, arguments: args })
}

/** Registro mínimo válido para partir de él en las pruebas. */
export const baseRecord = { language: 'es' as const }
