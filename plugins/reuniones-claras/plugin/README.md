# Reuniones Claras (paquete del plugin)

Plugin de Numen para ChatGPT y Codex que transforma notas de reuniones en un registro claro y accionable.

## Qué hace
- Identifica decisiones explícitas.
- Separa acuerdos confirmados de propuestas y posibilidades discutidas.
- Extrae compromisos, responsables y fechas cuando están expresamente indicados.
- Organiza preguntas abiertas, riesgos, dependencias y temas pendientes.
- Propone próximos pasos sin inventar acuerdos ni asignaciones.
- Responde en español o inglés, siguiendo el idioma de las notas.

## Arquitectura y datos
El paquete contiene una **Skill** y declara un **servidor MCP remoto** (`mcp.json`) con una herramienta, `validate_meeting_record`.

- La **Skill** interpreta las notas y genera un registro estructurado.
- El **servidor MCP** valida ese registro con reglas determinísticas y devuelve advertencias. No interpreta las notas, no inventa información y no usa servicios de IA.
- El usuario comparte sus notas con ChatGPT. **Al servidor solo llegan campos estructurados y citas breves**, no las notas completas.
- Numen **sí recibe, de forma temporal, ese registro estructurado** en el endpoint MCP. La aplicación lo procesa en memoria y no lo almacena ni lo registra. El tratamiento por parte de OpenAI y de los proveedores de infraestructura se rige por sus propias políticas. Ver `docs/privacy-data-flow.md`.

## Estructura
- `plugin.json`: manifiesto Agent Plugins 1.0.
- `mcp.json`: servidor MCP remoto (`https://api.numen.la/mcp`, sin autenticación).
- `skills/reuniones-claras/SKILL.md`: instrucciones de la Skill.
- `assets/reuniones-claras.png`: icono provisional.

## Estado
Versión 0.2.0. Los archivos de este directorio **no incluyen** `__MACOSX` ni `.DS_Store`; el ZIP se genera con `../scripts/build-plugin-zip.sh`. La URL `api.numen.la` es el destino previsto: **todavía no está configurada**. La validación local no equivale a aprobación de OpenAI.
