# Códigos de validación

Documento generado a partir del catálogo `server/lib/mcp/codes.ts`. Los códigos son **estables**: se pueden añadir, pero no renombrar ni cambiar de significado.

## Severidades

| Severidad | Significado | Efecto sobre `valid` |
|---|---|---|
| error | El registro es inconsistente o está incompleto de forma que no debería usarse sin corregirlo. | `valid` pasa a `false` |
| warning | Falta información o hay algo que conviene confirmar con los participantes. | ninguno |
| info | Observación informativa. | ninguno |

`valid` es `true` cuando **no hay ningún** hallazgo de severidad `error`. Que `valid` sea `true` **no significa** que las decisiones, las clasificaciones o la evidencia sean correctas, ni que los acuerdos hayan ocurrido realmente: la herramienta solo revisa la coherencia del registro.

## Catálogo

La columna "Va a `missing_fields`" indica si el hallazgo también se lista en `missing_fields` (campo vacío o insuficiente).

| Código | Severidad | Campo | Va a `missing_fields` | Significado |
|---|---|---|---|---|
| `RECORD_EMPTY` | info | - | no | El registro no contiene ningún elemento en ninguna lista. |
| `DECISION_DESCRIPTION_EMPTY` | error | `description` | sí | Una decisión no tiene descripción o solo contiene espacios. |
| `PROPOSAL_DESCRIPTION_EMPTY` | error | `description` | sí | Una propuesta o posibilidad no tiene descripción. |
| `COMMITMENT_DESCRIPTION_EMPTY` | error | `description` | sí | Un compromiso no tiene descripción. |
| `OPEN_ITEM_DESCRIPTION_EMPTY` | error | `description` | sí | Una pregunta abierta o tema pendiente no tiene descripción. |
| `DECISION_EVIDENCE_MISSING` | warning | `evidence` | sí | Una decisión clasificada como confirmada no incluye evidencia textual. |
| `DECISION_EVIDENCE_INSUFFICIENT` | warning | `evidence` | sí | La evidencia de una decisión confirmada es demasiado corta para respaldarla. |
| `DECISION_NOT_CONFIRMED` | warning | `classification` | no | Un elemento de la lista de decisiones está clasificado como propuesta o posibilidad. |
| `DECISION_CLASSIFIED_OPEN` | error | `classification` | no | Un elemento de la lista de decisiones está clasificado como pendiente o pregunta abierta. |
| `PROPOSAL_MARKED_CONFIRMED` | error | `classification` | no | Un elemento de la lista de propuestas está clasificado como confirmado. |
| `OPEN_ITEM_MARKED_CONFIRMED` | error | `classification` | no | Un tema pendiente o pregunta abierta está clasificado como confirmado. |
| `COMMITMENT_OWNER_MISSING` | warning | `owner` | sí | Un compromiso no tiene responsable indicado. |
| `COMMITMENT_DUE_DATE_MISSING` | warning | `due_date` | sí | Un compromiso no tiene fecha límite indicada. |
| `COMMITMENT_DUE_DATE_INVALID` | error | `due_date` | no | La fecha tiene formato de fecha pero no existe en el calendario (por ejemplo 2026-02-30). |
| `COMMITMENT_DUE_DATE_AMBIGUOUS` | warning | `due_date` | no | La fecha numérica admite más de una lectura (día/mes o mes/día) o tiene año de dos dígitos. |
| `COMMITMENT_DUE_DATE_UNRESOLVED` | warning | `due_date` | no | La fecha es texto libre (por ejemplo, una expresión relativa o sin año) y no puede resolverse de forma determinística. |
| `COMMITMENT_DUE_DATE_NOT_ISO` | info | `due_date` | no | La fecha es inequívoca pero no está en formato YYYY-MM-DD. |
| `COMMITMENT_STATUS_MISSING` | info | `status` | sí | Un compromiso no tiene estado. Es normal: el estado solo se registra si las notas lo indican. |
| `COMMITMENT_STATUS_UNRECOGNIZED` | warning | `status` | no | El estado no pertenece al vocabulario: not_started, in_progress, blocked, completed, cancelled. |
| `DUPLICATE_ITEM` | warning | `description` | no | Dos elementos de la misma lista tienen el mismo texto tras normalizar mayúsculas, acentos y puntuación. |
| `DUPLICATE_ACROSS_LISTS` | warning | `description` | no | Dos elementos de listas distintas tienen el mismo texto tras normalizar, lo que puede indicar una clasificación inconsistente. |

## Reglas de diseño

- Los mensajes y recomendaciones salen en el idioma del campo `language` (`es` o `en`).
- Los mensajes **nunca repiten el contenido recibido**: solo indican la posición (lista e índice, por ejemplo `commitments[2]`).
- Las recomendaciones piden revisar o confirmar. **Nunca completan** responsables, fechas, estados ni decisiones.
- Evidencia mínima para una decisión confirmada: 8 caracteres, sin contar espacios sobrantes.
- Duplicados: solo coincidencia exacta tras normalizar mayúsculas, acentos y puntuación. No se interpreta el significado.
- Fechas: la herramienta no interpreta lenguaje natural. Solo reconoce `YYYY-MM-DD` y formatos numéricos; cualquier otro texto se trata como fecha sin resolver.
