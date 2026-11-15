# Flujo de datos y privacidad

> Este documento describe lo que el **código** hace y lo que se ha **probado**, y separa con claridad lo que **no se ha verificado** de la infraestructura. No sustituye a la política de privacidad ni a la revisión legal.

## Qué recibe el servidor, para qué y qué ocurre con ello

Con esta arquitectura, **Numen recibe temporalmente información estructurada de reuniones** a través de `https://api.numen.la/mcp`. La afirmación anterior de que Numen "no recibe ni procesa información de reuniones" deja de ser válida en cuanto el servidor esté en funcionamiento.

| Dato recibido | Para qué | Qué hace el código con él |
|---|---|---|
| Descripciones breves (máx. 500 caracteres) de decisiones, propuestas, compromisos y pendientes | Comprobar que no están vacías y detectar duplicados | Se procesa en memoria durante la solicitud y se descarta |
| Citas de evidencia (máx. 200 caracteres) | Comprobar que existe evidencia mínima para una decisión confirmada | Solo se mide su longitud; se descarta |
| Responsable, fecha límite y estado (anulables) | Comprobar que están presentes y que la fecha y el estado son reconocibles | Se clasifican; no se interpretan ni se completan |
| Idioma (`es` / `en`) | Elegir el idioma de los mensajes | Se usa para el texto de la respuesta |

Los textos pueden contener nombres de personas y datos de proyectos u organizaciones: son **datos personales potenciales**.

## Lo que el código garantiza (y las pruebas comprueban)

| Garantía | Cómo se comprueba |
|---|---|
| El contenido no se escribe en consola ni en la salida del proceso | Prueba dinámica con marcador único sobre `console.*`, `stdout` y `stderr`; prueba de extremo a extremo sobre la salida del servidor real |
| No se escribe en disco | Prueba dinámica que bloquea y registra `fs.*` durante el procesamiento; análisis estático de importaciones |
| No hay llamadas de red de salida | Prueba dinámica que bloquea `fetch`, `http`, `https`, `net` y `dns`; análisis estático |
| No hay bases de datos, cachés ni almacenamiento | Análisis estático de importaciones y dependencias |
| Las respuestas y los errores no repiten el contenido recibido | Pruebas con marcador único sobre respuestas válidas, errores de esquema, de protocolo, de tamaño y de JSON |
| Las excepciones internas no filtran datos | Prueba con una excepción que contiene el marcador: la respuesta es un 500 genérico |
| Se limita el tamaño de la solicitud | Pruebas con y sin `Content-Length` |
| Las pruebas detectan regresiones | Se introdujeron seis fallos deliberados (sin validar `Origin`, errores que repiten claves, registro del cuerpo, llamada de red, regla omitida, sin límite de tamaño) y todos fueron detectados |

Excepción conocida y documentada: para una herramienta inexistente, el SDK repite en su error el nombre enviado por el cliente. No es contenido de reunión.

## Lo que NO se ha verificado

No se debe afirmar que el sistema es "privado", "seguro" o "sin retención" hasta comprobar estos puntos:

1. **Registros de la plataforma de alojamiento.** La documentación de Vercel indica que cada línea escrita en la salida estándar de una función queda como una entrada de registro. El código no escribe nada, pero **no se ha confirmado** qué metadatos de solicitud (ruta, método, estado, IP, agente de usuario) conserva Vercel ni si conserva cuerpos de solicitud, ni durante cuánto tiempo para el plan elegido.
2. **Cloudflare.** Si `api.numen.la` se publica con proxy de Cloudflare, el tráfico (incluido el cuerpo) pasa por Cloudflare. Si se configura solo DNS, Cloudflare queda fuera de la ruta de datos. Es una decisión de configuración pendiente. Cloudflare Web Analytics inyecta su script en respuestas HTML y no afecta a respuestas JSON.
3. **OpenAI.** El contenido pasa por ChatGPT antes de llegar al servidor y el resultado vuelve por el mismo camino; su tratamiento se rige por las políticas de OpenAI. OpenAI además analiza el servidor a diario (`tools/list`) y durante la revisión.
4. **Límite de frecuencia.** En funciones sin estado no es fiable limitarlo en memoria. Hay que configurarlo en la infraestructura (Firewall de Vercel o reglas de Cloudflare). No está hecho.
5. **Conservación en infraestructura.** No se han definido plazos propios porque Numen no almacena el contenido; los de los proveedores dependen de sus planes y configuración.

## Requisitos de OpenAI que condicionan el diseño

Según las directrices de plugins consultadas (noviembre de 2026):

- Recoger solo el mínimo de datos necesario; evitar campos "por si acaso" y no pedir transcripciones completas.
- No procesar datos restringidos: tarjetas de pago, información de salud, identificadores gubernamentales ni credenciales.
- No devolver marcas de tiempo ni identificadores internos salvo que sean imprescindibles.
- Metadatos como IP o marcas de tiempo solo pueden recogerse si se declaran, están acotados y el usuario tiene control.
- La política de privacidad debe indicar categorías de datos, finalidades, destinatarios, plazos de conservación y controles.

## Cambios necesarios en la web (pendientes de revisión y publicación)

Política de privacidad (`/plugins/reuniones-claras/privacidad`), términos, documentación y README del plugin deben:

- Dejar de afirmar que Numen no recibe ni procesa información de reuniones.
- Describir la categoría de datos recibidos, su finalidad, que se procesan en memoria sin persistirse por la aplicación y que solo se reciben campos estructurados y citas breves.
- Nombrar a los proveedores de infraestructura que intervienen (OpenAI, Vercel y, si se usa proxy, Cloudflare) y remitir a sus políticas sin inventar plazos de conservación.
- Reconocer que los registros técnicos de la infraestructura (IP, agente de usuario, ruta) pueden conservarse según cada proveedor.
- Revisar los términos: la afirmación "Numen no recibe ni almacena las notas ni los resultados en servidores propios" debe reformularse.

**No publicar estos cambios hasta que el servidor esté desplegado**, para que la política nunca sea inexacta. Requieren validación legal.
