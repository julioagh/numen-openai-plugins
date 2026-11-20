import { OPENAI_APPS_CHALLENGE } from '../../../lib/domain-challenge'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

/** Verificación de dominio de OpenAI: devuelve únicamente el token, como texto plano. */
export function GET() {
  if (OPENAI_APPS_CHALLENGE === '') {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  return new Response(OPENAI_APPS_CHALLENGE, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}
