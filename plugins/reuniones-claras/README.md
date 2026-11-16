# Reuniones Claras

Plugin de Numen que convierte notas de reuniones en decisiones, compromisos, responsables, pendientes y próximos pasos, sin inventar nada.

| Carpeta | Contenido |
|---|---|
| [`plugin/`](plugin/) | Paquete que se sube al portal de OpenAI: manifiesto, Skill, `mcp.json`, recursos. |
| [`server/`](server/) | Servidor MCP remoto y sin estado (Next.js) que expone `validate_meeting_record`. |
| [`docs/`](docs/) | Documentación técnica. |
| [`scripts/`](scripts/) | Generador del ZIP del plugin. |

## Documentación
- [Arquitectura](docs/architecture.md)
- [Contrato de la herramienta MCP](docs/mcp-contract.md)
- [Códigos de validación](docs/validation-codes.md)
- [Flujo de datos y privacidad](docs/privacy-data-flow.md)
- [Ejecución local y despliegue](docs/deployment.md)
- [Lista de control para la publicación en ChatGPT](docs/chatgpt-submission-checklist.md)

## Estado

| Elemento | Implementado | Probado | Pendiente |
|---|---|---|---|
| Servidor MCP y herramienta | Sí | Pruebas automatizadas y prueba de extremo a extremo con el cliente oficial | Prueba con ChatGPT real |
| Paquete del plugin | Sí | Coherencia con el servidor | Subida y revisión en el portal de OpenAI |
| Despliegue y dominio `api.numen.la` | No | No | **Configuración y autorización del propietario** |
| Privacidad, términos y documentación web | Borrador en la web | No aplica | **Revisión legal y publicación** (solo tras desplegar el servidor) |

Ejecuta `npm test` y `npm run test:e2e` en `server/` para ver el resultado real de las pruebas.
