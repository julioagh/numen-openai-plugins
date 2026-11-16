# Ejecución local y despliegue

## Ejecutar localmente

Requisito: Node.js 22.12 o superior (`engines.node` es `22.x`).

```bash
cd plugins/reuniones-claras/server
npm install
npm run dev          # http://localhost:3000/mcp
```

Probar con el MCP Inspector (cliente de referencia):

```bash
npx @modelcontextprotocol/inspector
# Transporte: Streamable HTTP · URL: http://localhost:3000/mcp
```

## Pruebas

```bash
npm run typecheck    # tipos
npm test             # pruebas automatizadas (Vitest)
npm run build        # build de producción
npm run test:e2e     # extremo a extremo con el cliente MCP oficial (requiere build previo)
```

## Generar el ZIP del plugin

```bash
cd plugins/reuniones-claras
./scripts/build-plugin-zip.sh
```

Genera `dist/reuniones-claras-<versión>.zip` con los archivos del plugin **en la raíz del ZIP**, sin `__MACOSX` ni `.DS_Store`. OpenAI exige una sola raíz de plugin: un ZIP con la carpeta del plugin y una carpeta `__MACOSX` hermana (lo habitual al comprimir en macOS) incumple la regla `plugin_root_has_siblings`.

## Desplegar en Vercel (pasos que requieren al propietario)

Nada de esto se ha hecho. Cada paso requiere autorización expresa.

1. **Proyecto nuevo** en Vercel importando `julioagh/numen-openai-plugins`. En *Settings → Build & Deployment → Root Directory*: `plugins/reuniones-claras/server`. Framework: Next.js.
2. **Node.js**: `package.json` declara `22.x`; comprueba que la versión del proyecto no lo contradice.
3. **Fluid Compute**: activo por defecto en proyectos creados desde el 23 de abril de 2025; confírmalo en *Settings → Functions*.
4. **Plan.** Los Términos de Vercel (§4) limitan el plan Hobby a "uso personal o no comercial", y Vercel puede deshabilitar proyectos Hobby con o sin aviso. Un plugin público necesita un endpoint estable: decide con eso en cuenta antes de publicar. No se ha cambiado ningún plan.
5. **Dominio**: añadir `api.numen.la` al proyecto y crear el registro DNS que indique Vercel. Se recomienda **solo DNS (sin proxy de Cloudflare)** para que Cloudflare quede fuera de la ruta de datos; el coste es no usar sus reglas de protección en ese host.
6. **Variables de entorno** (todas opcionales): `MCP_ALLOWED_ORIGINS`, lista separada por comas de orígenes de navegador adicionales.
7. **Verificación de dominio de OpenAI**: el portal mostrará un token que hay que servir como texto plano en la URL que indique. Se puede añadir como archivo estático bajo `server/public/` (por ejemplo `public/.well-known/…`).
8. **Límite de frecuencia**: configurar reglas en el Firewall de Vercel (o en Cloudflare si hay proxy). El servidor limita tamaño y duración (`maxDuration = 10`), pero no la frecuencia.

## Después de desplegar

- Probar con el MCP Inspector contra la URL pública.
- Confirmar que `GET https://api.numen.la/mcp` devuelve 405 y que un `Origin` ajeno devuelve 403.
- Revisar los registros de ejecución de Vercel enviando datos con un marcador de prueba y comprobando que no aparece.
- Solo entonces publicar los cambios de privacidad y términos en la web.

## Revertir

En Vercel, *Instant Rollback* al despliegue anterior. El plugin en OpenAI no cambia por un rollback del servidor, pero sí lo reflejarán sus análisis diarios.
