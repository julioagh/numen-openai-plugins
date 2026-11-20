/**
 * Token de verificación de dominio que muestra el portal de plugins de OpenAI.
 * Se sirve tal cual (solo el token, texto plano) en /.well-known/openai-apps-challenge.
 * No es un secreto: está pensado para ser público. Mientras esté vacío, la ruta responde 404.
 */
export const OPENAI_APPS_CHALLENGE: string = ''
