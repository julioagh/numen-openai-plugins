import { describe, expect, it } from 'vitest'
import { allowedOrigins, createGuardedHandler, isOriginAllowed } from '../lib/mcp/http'

const prod = { NODE_ENV: 'production' }
const dev = { NODE_ENV: 'development' }

describe('isOriginAllowed', () => {
  it('sin Origin se acepta (llamadas servidor a servidor)', () => {
    expect(isOriginAllowed(null, prod)).toBe(true)
  })
  it('acepta los orígenes por defecto', () => {
    for (const o of ['https://chatgpt.com', 'https://chat.openai.com', 'https://www.numen.la', 'https://api.numen.la']) {
      expect(isOriginAllowed(o, prod)).toBe(true)
    }
  })
  it('rechaza otros orígenes', () => {
    for (const o of ['https://evil.example', 'http://chatgpt.com', 'https://chatgpt.com.evil.example', 'null']) {
      expect(isOriginAllowed(o, prod)).toBe(false)
    }
  })
  it('localhost solo se acepta fuera de producción', () => {
    expect(isOriginAllowed('http://localhost:3000', dev)).toBe(true)
    expect(isOriginAllowed('http://127.0.0.1:6274', dev)).toBe(true)
    expect(isOriginAllowed('http://localhost:3000', prod)).toBe(false)
  })
  it('MCP_ALLOWED_ORIGINS amplía la lista', () => {
    const env = { NODE_ENV: 'production', MCP_ALLOWED_ORIGINS: 'https://a.example, https://b.example' }
    expect(allowedOrigins(env).has('https://b.example')).toBe(true)
    expect(isOriginAllowed('https://a.example', env)).toBe(true)
  })
})

describe('createGuardedHandler', () => {
  const req = () =>
    new Request('http://localhost/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })

  it('un fallo interno devuelve un error genérico sin datos', async () => {
    const handler = createGuardedHandler(async () => {
      throw new Error('MARCADOR_EXCEPCION con datos de reunión')
    }, prod)
    const res = await handler(req())
    const text = await res.text()
    expect(res.status).toBe(500)
    expect(text).not.toContain('MARCADOR_EXCEPCION')
    expect(JSON.parse(text).error.code).toBe(-32603)
  })

  it('el método no POST no llega al manejador interno', async () => {
    let called = false
    const handler = createGuardedHandler(async () => {
      called = true
      return new Response('ok')
    }, prod)
    const res = await handler(new Request('http://localhost/mcp', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' }))
    expect(res.status).toBe(405)
    expect(called).toBe(false)
  })

  it('las solicitudes rechazadas no llegan al manejador interno', async () => {
    let called = 0
    const handler = createGuardedHandler(async () => {
      called++
      return new Response('ok')
    }, prod)
    await handler(new Request('http://localhost/mcp', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }))
    await handler(new Request('http://localhost/mcp', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' }))
    expect(called).toBe(0)
    expect((await handler(req())).status).toBe(200)
    expect(called).toBe(1)
  })
})
