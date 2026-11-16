import { createMcpHandler } from 'mcp-handler'
import { containsLikelyCardNumber } from './restricted'
import { InputSchema, OutputSchema } from './schema'
import { formatResultText, validateMeetingRecord } from './validate'

/** Mantener igual que `version` en package.json (hay una prueba que lo comprueba). */
export const SERVER_VERSION = '0.2.0'
export const TOOL_NAME = 'validate_meeting_record'

export const TOOL_DESCRIPTION =
  'Valida la consistencia y completitud de un registro estructurado de reunión. Detecta clasificaciones inconsistentes, compromisos incompletos, responsables o fechas no especificados, estados ausentes y temas pendientes que podrían confundirse con decisiones. Es de solo lectura: no crea ni modifica registros, no almacena lo recibido y no interpreta las notas. ' +
  'Validates the consistency and completeness of a structured meeting record (Spanish or English). Read-only and deterministic: it reports findings and never fills in missing owners, dates or decisions. ' +
  'Enviar solo campos estructurados y citas breves, nunca la transcripción completa, contraseñas, números de tarjeta, datos de salud ni identificadores oficiales.'

const RESTRICTED_MESSAGE = {
  es: 'Entrada rechazada: parece contener un dato restringido (por ejemplo, un número de tarjeta de pago). No se procesó ni se guardó. Elimina ese dato y vuelve a intentarlo.',
  en: 'Input rejected: it appears to contain restricted data (for example, a payment card number). It was neither processed nor stored. Remove it and try again.',
} as const

/**
 * Manejador MCP sin estado. Ajustes de privacidad: sin registros detallados, sin
 * `onEvent`, sin telemetría y sin flujos de larga duración.
 */
export const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      TOOL_NAME,
      {
        title: 'Validar registro de reunión',
        description: TOOL_DESCRIPTION,
        inputSchema: InputSchema,
        outputSchema: OutputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (record) => {
        if (containsLikelyCardNumber(record)) {
          return { isError: true, content: [{ type: 'text' as const, text: RESTRICTED_MESSAGE[record.language] }] }
        }
        const result = validateMeetingRecord(record)
        return { content: [{ type: 'text' as const, text: formatResultText(result) }], structuredContent: result }
      },
    )
  },
  {
    serverInfo: { name: 'reuniones-claras', version: SERVER_VERSION },
    instructions:
      'Validador sin estado y de solo lectura para registros estructurados de reuniones. No almacena datos. Envía únicamente campos estructurados y citas breves.',
    capabilities: { tools: { listChanged: false } },
    verboseLogs: false,
    telemetry: false,
    maxSubscriptions: 0,
  },
)
