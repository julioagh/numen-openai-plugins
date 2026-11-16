# Contrato de la herramienta MCP

Endpoint objetivo: `https://api.numen.la/mcp` (**pendiente de configurar**: el subdominio no existe todavía). En local: `http://localhost:3000/mcp`.

Transporte: Streamable HTTP, **sin estado** (sin `Mcp-Session-Id`). Cada solicitud es independiente y `tools/list` / `tools/call` funcionan sin `initialize` previo.

## Herramienta `validate_meeting_record`

Valida la consistencia y completitud de un registro estructurado de reunión. Es de solo lectura y determinística: **no interpreta las notas, no decide qué se acordó, no modifica ni completa datos y no almacena lo recibido**.

Anotaciones (valores explícitos, como exigen las directrices de OpenAI):

| Anotación | Valor |
|---|---|
| `readOnlyHint` | `true` |
| `destructiveHint` | `false` |
| `idempotentHint` | `true` |
| `openWorldHint` | `false` |

## Entrada

Objeto estricto: **cualquier campo no listado se rechaza**. Las listas son opcionales.

| Campo | Tipo | Límites | Notas |
|---|---|---|---|
| `language` | `"es"` \| `"en"` | obligatorio | Idioma de las notas y de los mensajes devueltos. |
| `decisions` | lista | máx. 50 | Solo deberían contener acuerdos explícitos. |
| `decisions[].description` | texto | máx. 500 caracteres | Resumen breve; no transcripciones. |
| `decisions[].classification` | `confirmed` \| `proposed` \| `possibility` \| `open` | obligatorio | Clasificación explícita asignada por la Skill. |
| `decisions[].evidence` | texto o `null` | máx. 200 caracteres | Cita textual breve que respalda la clasificación. |
| `proposals` | lista | máx. 50 | Propuestas y posibilidades no aprobadas. |
| `proposals[].description` / `.classification` | como arriba | | |
| `commitments` | lista | máx. 50 | |
| `commitments[].description` | texto | máx. 500 caracteres | |
| `commitments[].owner` | texto o `null` | máx. 100 caracteres | Solo si las notas lo indican expresamente. |
| `commitments[].due_date` | texto o `null` | máx. 60 caracteres | `YYYY-MM-DD` si es inequívoca; si no, el texto original. |
| `commitments[].status` | texto o `null` | máx. 30 caracteres | Vocabulario: `not_started`, `in_progress`, `blocked`, `completed`, `cancelled`. |
| `open_items` | lista | máx. 50 | Preguntas abiertas y temas pendientes. |
| `open_items[].description` / `.classification` | como arriba | | |

Una descripción vacía **no** se rechaza en el esquema: se informa como hallazgo (`*_DESCRIPTION_EMPTY`). En cambio, un tipo incorrecto, una clasificación desconocida, un campo no listado o un texto que supera el límite se rechazan con `isError: true`.

Tamaño máximo de la solicitud HTTP: **256 KB** (la plataforma permite hasta 4.5 MB). Una prueba comprueba que el registro válido más grande cabe en ese límite.

### Datos restringidos

La herramienta rechaza (`isError: true`, sin repetir el valor) cualquier texto que contenga una secuencia de 13 a 19 dígitos con suma de Luhn válida, es decir, un posible **número de tarjeta de pago**. Puede dar falsos positivos con números largos. No detecta otros datos restringidos (salud, identificadores oficiales, credenciales): la Skill debe evitar enviarlos.

## Salida

| Campo | Tipo | Descripción |
|---|---|---|
| `valid` | booleano | `false` si hay al menos un hallazgo `error`. **No** certifica que los acuerdos ocurrieron. |
| `summary` | texto | Resumen y aviso de limitaciones, en el idioma indicado. |
| `issues` | lista | Hallazgos ordenados de forma estable (ver abajo). |
| `missing_fields` | lista de `{ item, field }` | Campos vacíos o insuficientes. |

Cada hallazgo (`issues[]`):

| Campo | Descripción |
|---|---|
| `code` | Código estable. Ver [validation-codes.md](validation-codes.md). |
| `severity` | `error`, `warning` o `info`. |
| `item` | Elemento afectado, por ejemplo `commitments[2]`; `record` si afecta a todo el registro. |
| `field` | Campo afectado, cuando corresponde. |
| `message` | Mensaje comprensible. **Nunca repite el contenido recibido.** |
| `recommendation` | Sugerencia de revisión. **Nunca completa información.** |

La respuesta incluye también `content[0].text` con el mismo resultado en texto plano.

### Ejemplo

```json
// tools/call → arguments
{
  "language": "es",
  "decisions": [{ "description": "Migrar el sistema", "classification": "confirmed", "evidence": "Se acordó migrar en abril" }],
  "commitments": [{ "description": "Enviar informe", "owner": null, "due_date": "03/04/2026", "status": null }]
}

// structuredContent
{
  "valid": true,
  "summary": "Validación estructural completada. Errores: 0. Advertencias: 2. Avisos informativos: 1. Esta validación solo revisa la consistencia del registro; no confirma que los acuerdos hayan ocurrido realmente.",
  "issues": [
    { "code": "COMMITMENT_OWNER_MISSING", "severity": "warning", "item": "commitments[0]", "field": "owner", "message": "...", "recommendation": "..." },
    { "code": "COMMITMENT_DUE_DATE_AMBIGUOUS", "severity": "warning", "item": "commitments[0]", "field": "due_date", "message": "...", "recommendation": "..." },
    { "code": "COMMITMENT_STATUS_MISSING", "severity": "info", "item": "commitments[0]", "field": "status", "message": "...", "recommendation": "..." }
  ],
  "missing_fields": [
    { "item": "commitments[0]", "field": "owner" },
    { "item": "commitments[0]", "field": "status" }
  ]
}
```

## Comportamiento HTTP

| Situación | Respuesta |
|---|---|
| `GET`, `DELETE`, `OPTIONS` | 405 con `Allow: POST` |
| `Content-Type` distinto de `application/json` | 415 |
| `Origin` presente y no permitido | 403 |
| Cuerpo mayor al límite (con o sin `Content-Length`) | 413 |
| JSON inválido | 400, código JSON-RPC `-32700` |
| Método MCP inexistente | `-32601` |
| Fallo interno | 500 genérico, sin datos |

Llamadas sin `Origin` (servidor a servidor, como ChatGPT) se aceptan. Si un navegador envía `Origin`, debe estar en la lista permitida (la especificación MCP exige validarlo contra DNS rebinding): `chatgpt.com`, `chat.openai.com`, `www.numen.la`, `numen.la`, `api.numen.la`; se pueden añadir más con la variable `MCP_ALLOWED_ORIGINS` (separadas por comas). Fuera de producción también se aceptan `localhost` y `127.0.0.1`.

No hay CORS: los clientes previstos llaman de servidor a servidor.

Versiones de protocolo negociadas en `initialize`: 2024-11-05, 2025-03-26, 2025-06-18 y 2025-11-25 (verificado en pruebas). El SDK v2 implementa además la especificación 2026-07-28 y el cliente oficial la usa en la prueba de extremo a extremo.

## Decisiones respecto al encargo original

| Elemento pedido | Decisión | Motivo |
|---|---|---|
| `checked_at` | **Eliminado** | Las directrices de OpenAI piden no devolver marcas de tiempo si no son estrictamente necesarias. |
| Identificador de reunión opcional | **Eliminado** | Es un campo "por si acaso"; las directrices piden minimizar la entrada. |
| `warnings` separada de `issues` | **Unificadas** en `issues` | Cada hallazgo ya lleva `severity`; mantener dos listas duplicaba información. |
| Evidencia textual | **Cita de hasta 200 caracteres** | Necesaria para la regla de decisiones confirmadas sin respaldo; el límite acota los datos enviados. |
| Estados de compromiso | **Vocabulario fijo** de 5 valores | La Skill original no tenía uno y la regla de "estado no reconocido" lo requiere. |

## Limitaciones conocidas

- Para una herramienta inexistente, el SDK repite en su error el nombre de herramienta que envió el cliente (`Tool X not found`). Un nombre de herramienta no es contenido de reunión.
- Los textos libres de fecha ("la próxima semana", "15 de marzo") no se interpretan: se informan como fecha sin resolver.
- La detección de duplicados es solo por coincidencia exacta tras normalizar; no detecta textos parecidos.
- La herramienta no verifica que una decisión se haya acordado de verdad: solo revisa la coherencia de lo que recibe.
