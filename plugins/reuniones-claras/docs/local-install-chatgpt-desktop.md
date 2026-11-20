# Instalar el plugin completo (Skill + herramienta) en la app de escritorio de ChatGPT

El borrador del portal de plugins no se puede probar antes de la revisión, y el plugin que se crea con *Add custom MCP server* en ChatGPT web solo expone la herramienta. Para ver **la Skill y la herramienta juntas** (por ejemplo, para grabar el vídeo de revisión), la documentación de OpenAI describe una instalación manual en la **app de escritorio de ChatGPT** mediante un *marketplace personal*.

> Es una instalación **local**: no publica nada ni cambia el borrador del portal. Basada en la sección *Install a local plugin manually* de la guía de plugins de OpenAI. No he podido probarla en una app de escritorio real: ejecútala y, si algo no coincide con tu app, ajusta o deshaz los pasos (abajo).

## Requisitos
- La app de escritorio de ChatGPT instalada y con sesión iniciada. La disponibilidad de plugins locales puede depender de tu plan y de la versión de la app.
- El ZIP `reuniones-claras-0.2.0.zip` generado desde `main` (`./scripts/build-plugin-zip.sh`) o el que subiste al portal. Su `plugin.json` debe tener `name` igual al que pongas en el marketplace (aquí, `reuniones-claras-app2`).

## Pasos (macOS o Linux)

1. Descomprime el ZIP en la carpeta de plugins personales:

```bash
mkdir -p ~/.codex/plugins/reuniones-claras-app2
unzip -o /ruta/a/reuniones-claras-0.2.0.zip -d ~/.codex/plugins/reuniones-claras-app2
```

   Debe quedar `~/.codex/plugins/reuniones-claras-app2/plugin.json` directamente (sin una carpeta intermedia).

2. Crea el marketplace personal `~/.agents/plugins/marketplace.json`. **Si ya existe, no lo sobrescribas**: añade solo el elemento de `plugins`.

```json
{
  "name": "local-personal",
  "plugins": [
    {
      "name": "reuniones-claras-app2",
      "source": {
        "source": "local",
        "path": "./.codex/plugins/reuniones-claras-app2"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

   La documentación dice que `source.path` se resuelve **desde la raíz del marketplace** y debe empezar por `./`. Para el marketplace personal, esa raíz es tu carpeta de usuario, por eso la ruta es `./.codex/plugins/...`. Si el plugin no aparece, prueba con la ruta absoluta de la carpeta.

3. **Reinicia la app de escritorio de ChatGPT** y comprueba que *Reuniones Claras* aparece entre los plugins disponibles. Instálalo desde ahí.

4. Abre una conversación nueva y pega uno de los casos. Comprueba que se usan la Skill y la llamada a `validate_meeting_record`.

## Deshacer

```bash
rm -rf ~/.codex/plugins/reuniones-claras-app2
```

Y quita el elemento correspondiente de `~/.agents/plugins/marketplace.json`; reinicia la app.

## Limitaciones
- Es el modo de la app de escritorio, no ChatGPT en el navegador. El aspecto y el modo de invocar el plugin pueden diferir. Si grabas el vídeo así, dilo en la narración.
- No sustituye a la revisión: OpenAI revisa el paquete que enviaste desde el portal.
