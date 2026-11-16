# Guion del vídeo de demostración para la revisión de OpenAI

OpenAI exige, para plugins con MCP, **un vídeo que demuestre los casos de prueba y la funcionalidad**, con una URL a la que los revisores puedan acceder. Este guion cubre los 5 casos positivos y los 3 negativos de `plugin/plugin.json` (`review.test_cases`).

> **Duración orientativa: 5 minutos.** La documentación no fija una duración; es una propuesta para que sea fácil de revisar.

## Antes de grabar

**Preparación**
- Usa una cuenta y un navegador **sin datos personales visibles**: cierra las demás pestañas, oculta el correo o el nombre del perfil y desactiva las notificaciones.
- Sube el zoom del navegador (125 % o más) y usa el tema claro para que se lea bien.
- Instala el plugin y abre una conversación **nueva** para cada caso.
- Copia los prompts de `plugin/plugin.json` a un documento aparte, para pegarlos sin teclear.
- **Ensaya cada caso antes de grabar** y confirma que el resultado coincide con `expected_behavior`. Si no coincide, corrige el texto del caso o el comportamiento antes de grabar, no después.

**Qué no mostrar**: claves, tokens, correos reales, datos de clientes. Usa solo los textos ficticios de los casos.

## Escenas

| Tiempo | Escena | Qué mostrar | Narración sugerida |
|---|---|---|---|
| 0:00 a 0:20 | Introducción | Pantalla del plugin o de la conversación | "Reuniones Claras organiza notas de reuniones en decisiones, compromisos y pendientes sin inventar información. Una herramienta de validación de solo lectura revisa la coherencia del registro." |
| 0:20 a 0:50 | El plugin y su herramienta | Plugin instalado; la herramienta `validate_meeting_record` y su anotación de solo lectura | "El plugin tiene una sola herramienta. Es de solo lectura, no requiere autenticación y no guarda lo que recibe." |
| 0:50 a 1:50 | **Caso positivo 1** (notas claras en español) | Pega el prompt; muestra el resultado; **despliega la llamada a la herramienta** | "Pego unas notas. La respuesta separa la decisión, los compromisos con responsable y fecha, el pendiente y el riesgo. Aquí se ven los argumentos enviados: solo el registro estructurado, no las notas completas." |
| 1:50 a 2:20 | **Caso positivo 2** (inglés, fecha relativa) | Prompt en inglés; resultado en inglés; aviso sobre "by Friday" | "Responde en el idioma de las notas. 'By Friday' no se convierte en una fecha concreta: se conserva y se pide confirmarla." |
| 2:20 a 2:45 | **Caso positivo 3** (propuestas) | Resultado "no hay decisiones explícitas" | "Una propuesta no se presenta como decisión." |
| 2:45 a 3:15 | **Caso positivo 4** (sin responsable) | Resultado con "No especificado" y las advertencias | "Si falta el responsable, no se inventa: se avisa y se recomienda confirmarlo." |
| 3:15 a 3:40 | **Caso positivo 5** (fechas ambiguas) | Aviso de 3 de abril o 4 de marzo, y del año que falta | "Una fecha ambigua se señala; no se elige una interpretación por el usuario." |
| 3:40 a 4:20 | **Casos negativos** (3) | Un consejo general, una invitación y la petición de inventar datos | "En estos casos el plugin no actúa. Y si se le pide inventar responsables o fechas, se niega y deja los campos como 'No especificado'." |
| 4:20 a 4:50 | Privacidad y límites | Página de privacidad `https://www.numen.la/plugins/reuniones-claras/privacidad` | "El servidor recibe temporalmente un registro estructurado, lo procesa en memoria y no lo almacena. Y la validación solo revisa la coherencia: no confirma que los acuerdos hayan ocurrido." |
| 4:50 a 5:00 | Cierre | Página de soporte | "Soporte en info@numen.la. Gracias." |

## Después de grabar

- [ ] Añade **subtítulos** (ayuda a la accesibilidad y a los revisores).
- [ ] Exporta en 1080p o más y revisa que el texto se lea.
- [ ] Súbelo a un servicio de vídeo con enlace **sin listar** y comprueba que se abre en una **ventana privada, sin iniciar sesión**.
- [ ] Copia la URL en `plugin/plugin.json`, en `extensions.com.openai.review.demo_recording_url`, y regenera el ZIP (`./scripts/build-plugin-zip.sh`). También puedes introducirla en el portal, en *Review information*.
- [ ] Conserva el vídeo disponible mientras dure la revisión.

## Si algo no sale como se espera
- Si un caso positivo no coincide con su `expected_behavior`, **corrige primero el caso en `plugin.json`**. Los casos importados desde el ZIP no se pueden editar en el portal: hay que subir un ZIP nuevo.
- Si ChatGPT describe la validación con más certeza de la que tiene (por ejemplo, "evidencia correcta"), no lo ocultes en el vídeo: es una limitación que `docs/evaluation-prompts.md` ya contempla.
