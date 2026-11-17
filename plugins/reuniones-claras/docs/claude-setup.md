# Uso en Claude (instalación manual)

Reuniones Claras funciona en Claude con las mismas dos piezas que en ChatGPT: el servidor MCP y la Skill. No es un listado en un directorio de Claude: cada persona lo instala ella misma.

| Pieza | Origen | Dónde se instala en Claude |
|---|---|---|
| Servidor MCP | `https://api.numen.la/mcp` (sin autenticación) | Conector personalizado |
| Skill | `plugin/skills/reuniones-claras/SKILL.md` | Skills (archivo `.skill`) |

## Pasos

1. Genera el archivo de la Skill: `./scripts/build-skill.sh` → `dist/reuniones-claras.skill`.
2. En claude.ai: **Settings → Connectors → Add custom connector** (el nombre del menú puede variar). Nombre `Reuniones Claras`, URL `https://api.numen.la/mcp`. No requiere autenticación.
3. En **Settings → Capabilities → Skills**, sube `reuniones-claras.skill`.
4. En Claude Code: `claude mcp add --transport http reuniones-claras https://api.numen.la/mcp`.

## Qué verificar

- En una conversación nueva, pega notas de una reunión: la respuesta debe incluir la validación (el conector está activo).
- Sin la Skill, el conector solo expone la herramienta de validación: no organiza notas por sí solo.

## Notas

- La fuente única de la Skill es `SKILL.md`: el mismo archivo va en el ZIP de OpenAI y en el `.skill`.
- Si un cliente enviara un `Origin` de navegador no permitido, el servidor responde 403. Se resuelve con la variable `MCP_ALLOWED_ORIGINS`, sin cambiar código. Claude conecta hoy sin necesidad de ello.
- Pendiente antes de ofrecerlo públicamente: actualizar la política de privacidad y los términos, que hoy describen únicamente ChatGPT, y revisar el proceso de publicación de Anthropic.
