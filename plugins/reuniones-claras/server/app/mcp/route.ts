import { createGuardedHandler, methodNotAllowed } from '../../lib/mcp/http'
import { mcpHandler } from '../../lib/mcp/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Segundos. La validación es instantánea; un límite bajo acota cualquier solicitud anómala. */
export const maxDuration = 10

const handler = createGuardedHandler(mcpHandler)

export { handler as POST }

export async function GET() {
  return methodNotAllowed()
}
export async function DELETE() {
  return methodNotAllowed()
}
export async function OPTIONS() {
  return methodNotAllowed()
}
