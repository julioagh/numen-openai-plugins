import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('../lib/domain-challenge')
})

describe('verificación de dominio de OpenAI', () => {
  it('sin token configurado responde 404', async () => {
    vi.doMock('../lib/domain-challenge', () => ({ OPENAI_APPS_CHALLENGE: '' }))
    const { GET } = await import('../app/.well-known/openai-apps-challenge/route')
    const res = GET()
    expect(res.status).toBe(404)
  })

  it('con token devuelve solo el token, en texto plano y sin saltos de línea', async () => {
    vi.doMock('../lib/domain-challenge', () => ({ OPENAI_APPS_CHALLENGE: 'abc123_TOKEN-de-prueba' }))
    const { GET } = await import('../app/.well-known/openai-apps-challenge/route')
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('abc123_TOKEN-de-prueba')
  })
})
