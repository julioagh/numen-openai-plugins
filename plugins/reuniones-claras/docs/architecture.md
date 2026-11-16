# Arquitectura de Reuniones Claras

## Reparto de responsabilidades

| Componente | Responsabilidad | No hace |
|---|---|---|
| **Skill** (`plugin/skills/reuniones-claras/SKILL.md`) | Interpreta las notas; identifica decisiones, compromisos, responsables y fechas; distingue decisiones de propuestas; genera el registro estructurado; invoca la herramienta; integra las advertencias en la respuesta. | No delega la interpretación. |
| **Servidor MCP** (`server/`) | Recibe solo datos estructurados; aplica reglas determinísticas; devuelve hallazgos y campos incompletos. | No interpreta de nuevo la reunión, no modifica datos, no almacena nada, no llama a servicios externos. |
| **Usuario** | Comparte las notas con ChatGPT y recibe el resultado de la Skill, complementado por la validación. | |

La Skill se conserva con su metodología completa. Los cambios en `SKILL.md` son **aditivos**: un paso nuevo en el flujo, una sección sobre cómo usar la herramienta y dos líneas en el control de calidad final.

## Flujo

```
Usuario ──notas──▶ ChatGPT + Skill ──registro estructurado──▶ Servidor MCP (/mcp)
                         ▲                                          │
                         └───────── hallazgos y campos incompletos ◀┘
Usuario ◀── resultado de la Skill + advertencias ── ChatGPT
```

Las notas completas **no** se envían al servidor: solo el registro estructurado con descripciones breves y citas de hasta 200 caracteres.

## Estructura del código (`server/`)

| Archivo | Contenido |
|---|---|
| `app/mcp/route.ts` | Ruta `POST /mcp` (`nodejs`, dinámica, `maxDuration = 10`). `GET`, `DELETE` y `OPTIONS` devuelven 405. |
| `lib/mcp/http.ts` | Capa HTTP: método, `Origin`, `Content-Type`, límite de tamaño y errores genéricos. |
| `lib/mcp/server.ts` | Registro de la herramienta y opciones del manejador MCP (sin logs detallados, sin telemetría, sin flujos largos). |
| `lib/mcp/schema.ts` | Esquema de entrada y salida (Zod 4). |
| `lib/mcp/validate.ts` | Motor de reglas: función pura. |
| `lib/mcp/codes.ts` | Catálogo de códigos, severidades y mensajes en español e inglés. |
| `lib/mcp/dates.ts`, `normalize.ts`, `restricted.ts` | Clasificación de fechas, normalización de texto y barrera de números de tarjeta. |
| `lib/mcp/limits.ts` | Límites de entrada. |
| `tests/` | 120+ pruebas automatizadas (Vitest). |
| `scripts/e2e.mjs` | Prueba de extremo a extremo con el cliente MCP oficial. |

## Decisiones técnicas

- **Next.js 16.4.6 (App Router).** La última 15.x (15.5.29) arrastra una versión de `postcss` con avisos de seguridad en `npm audit`; la 16.4.6 deja el árbol de producción con 0 vulnerabilidades. Se elige por ese motivo y no por ser la más reciente.
- **`mcp-handler` 2.4.0 + `@modelcontextprotocol/server` 2.4.0 + Zod 4.6.7.** Es la combinación que documenta Vercel para desplegar MCP en Next.js App Router (la guía pinea `mcp-handler@2.1.1`; se usa la 2.4.0, que declara el mismo par). `mcp-handler` 1.x exige una versión exacta del SDK antiguo.
- **Vitest 5.1.0.** Las series 3.x y 4.x traen `tinypool` con avisos críticos en `npm audit`. Exige Node ≥ 22.12, por eso `engines.node` es `22.x`.
- **Ruta `/mcp` directa**, sin reescrituras de host: este proyecto está pensado para servir `api.numen.la`.
- **Sin estado.** No hay sesiones, ni suscripciones (`maxSubscriptions: 0`), ni almacenamiento. Cada solicitud crea y descarta su propio contexto.
- **Sin registros de aplicación.** El código no usa `console.*`; `verboseLogs` está desactivado; no se usa `onEvent` y `telemetry: false`. Una prueba estática y otras dinámicas lo vigilan.
- **Sin dependencias de red ni de IA.** No se importa ningún cliente HTTP ni SDK de IA o analítica.

## Estado

| Elemento | Estado |
|---|---|
| Servidor MCP y herramienta | Implementado |
| Pruebas automatizadas y de extremo a extremo | Implementadas y ejecutadas (ver [README](../README.md)) |
| Paquete del plugin (manifiesto, `mcp.json`, Skill) | Implementado |
| Despliegue, dominio `api.numen.la`, DNS, límites de frecuencia | **Pendiente de configuración y autorización** |
| Verificación de organización y dominio en OpenAI, envío del plugin | **Pendiente de publicación** |
| Política de privacidad y términos actualizados en la web | **Pendiente de revisión y publicación** |
