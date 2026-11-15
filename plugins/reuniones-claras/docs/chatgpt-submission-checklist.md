# Lista de control para conectar el servidor a la publicación de ChatGPT

Leyenda: **Implementado** · **Probado** · **Pendiente de configuración** · **Pendiente de autorización** · **Pendiente de publicación**.

Fuente: documentación de OpenAI (Plugins), consultada en noviembre de 2026.

## Antes de empezar

| Paso | Estado |
|---|---|
| El plugin con MCP debe crearse como **plugin nuevo**: no se puede añadir un MCP a un plugin "skills-only" ya creado | Informado |
| Verificación de identidad de la organización en OpenAI (probablemente **verificación de empresa** para la E.I.R.L.) | Pendiente de configuración (propietario) |
| Permiso de envío de plugins (`api.apps.write`) o ser propietario de la organización | Pendiente de configuración (propietario) |
| El proyecto de OpenAI **no** debe tener residencia de datos en la UE (esos proyectos no pueden enviar plugins con MCP) | Pendiente de comprobar (propietario) |

## Servidor

| Paso | Estado |
|---|---|
| Servidor MCP remoto, Streamable HTTP, sin estado | Implementado · Probado |
| Herramienta con descripción, esquemas de entrada y salida y anotaciones explícitas (`readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`) | Implementado · Probado |
| Sin autenticación (`auth.type: none`): permitido para servidores de solo lectura y anónimos | Implementado |
| Minimización de datos: sin `checked_at`, sin identificador de reunión, sin transcripciones, rechazo de números de tarjeta | Implementado · Probado |
| Pruebas con el cliente MCP oficial | Implementado · Probado (local) |
| Pruebas con ChatGPT real (modo desarrollador) | Pendiente de configuración (propietario) |
| Dominio público estable `api.numen.la`, HTTPS | Pendiente de configuración y autorización |
| Despliegue en Vercel y decisión sobre el plan | Pendiente de autorización |
| Límite de frecuencia en la infraestructura | Pendiente de configuración |
| Verificación de dominio (token que muestra el portal) | Pendiente de configuración |

## Paquete

| Paso | Estado |
|---|---|
| `plugin.json` con URLs públicas sin barra final | Implementado · Probado |
| `mcp.json` con el servidor remoto | Implementado · Probado |
| `SKILL.md` actualizado (paso de validación) | Implementado · Probado (coherencia con el servidor) |
| ZIP con una sola raíz de plugin, sin `__MACOSX` ni `.DS_Store` | Implementado |
| Incluir el MCP en el **ZIP inicial** del plugin nuevo | Implementado (el ZIP lo contiene) |
| Versión nueva respecto a la ya subida (`0.2.0`) | Implementado |

## Información pública

| Paso | Estado |
|---|---|
| Política de privacidad que declare categorías de datos, finalidades, destinatarios, plazos y controles, y refleje que Numen **sí** recibe datos estructurados | Pendiente de revisión y publicación |
| Términos de servicio reformulados | Pendiente de revisión y publicación |
| Documentación y página de producto actualizadas | Pendiente de revisión y publicación |
| URL de soporte y de privacidad accesibles y del mismo editor | Implementado (revisar tras los cambios) |

## En el portal de OpenAI

| Paso | Estado |
|---|---|
| Subir el ZIP y elegir la identidad verificada | Pendiente de publicación |
| Conectar el servidor (**With MCP**), completar la verificación de dominio y pulsar *Scan Tools* | Pendiente de publicación |
| Preparar prompts de prueba y respuestas esperadas | Pendiente (propietario) |
| Enviar a revisión | Pendiente de publicación |

## Riesgos a tener presentes

- **Utilidad percibida.** Las directrices piden funcionalidad "no soportada de forma nativa". Un validador de lo que el propio modelo acaba de producir puede considerarse marginal. El MCP desbloquea la ruta de envío, pero **no garantiza la aprobación**.
- **URL inmutable.** Cambiar la URL de un servidor ya conectado exige contactar con soporte de OpenAI.
- **Análisis diarios.** OpenAI analiza el servidor cada día: debe mantenerse disponible.
