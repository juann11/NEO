# Guía de uso

## La isla

| Qué haces | Qué pasa |
|---|---|
| Llevas el ratón arriba al centro de la pantalla | NEO se asoma |
| Clic en la isla | Se abre |
| Sacas el ratón | Se pliega a los 5 s y se esconde 3 s después |
| Clic en NEO | Se enfada. Tres veces seguidas y se marea |
| Dejas el ratón sobre NEO | Corazones |
| Clic derecho en NEO | El armario: elige un traje. **Auto** lo disfraza según la época |
| Arrastras a NEO fuera de la isla | Se va a vivir a tu escritorio |
| Arrastras un archivo a la isla | NEO se convierte en caja y te deja preguntar sobre él |
| `Esc` | Cierra la isla |

En la cabecera de la isla, el **engranaje** ⚙️ abre la ventana de NEO con todos los ajustes.

### Qué significan los ojos

| Color | Estado |
|---|---|
| 🟢 Verde | En reposo |
| 🔵 Azul | Trabajando |
| 🟣 Violeta | Pensando |
| 🟠 Naranja | Espera tu permiso |
| 🔴 Rojo | Error |

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl+Alt+Space` | Abre el chat desde cualquier app |
| `Ctrl+Alt+A` | Salta al permiso o pregunta pendiente |
| `Ctrl+Alt+T` | Trae al frente la ventana de la sesión |
| `Ctrl+Alt+→` / `Ctrl+Alt+←` | Pestaña siguiente / anterior |
| `Ctrl+Alt+S` | Silencia a NEO |
| `Ctrl+Alt+G` | Abre el armario |
| `Ctrl+Alt+D` | Manda a NEO al escritorio o lo trae de vuelta |

Con la isla abierta:

| Atajo | Acción |
|---|---|
| `Ctrl+1`–`Ctrl+9` | Cambia de pestaña |
| `Ctrl+E` | Abre o cierra el último diff |
| `Ctrl+Enter` / `Ctrl+K` | Enviar / chat nuevo |
| `Ctrl+P` | Mantener la isla abierta |

Todos se cambian en **Atajos**.

## Conectar tus agentes

En la ventana de NEO, entra en **Agentes** y elige el tuyo. NEO te enseña el cambio exacto, guarda una copia con fecha y no escribe nada hasta que confirmas. Al desinstalar, quita solo lo suyo.

| Agente | Dónde se instala | Permisos |
|---|---|---|
| Claude Code | `.claude\settings.json` | En la isla, con preguntas |
| Codex | `.codex\hooks.json` (después confía en los hooks con `/hooks`) | En la isla |
| GitHub Copilot CLI | `.copilot\hooks\neo.json` | En la isla |
| Muse Code | `.config\muse\settings.json` | En la isla |
| Gemini CLI | `.gemini\settings.json` | En Gemini CLI |
| Antigravity | `.gemini\config\hooks.json` | En Antigravity |
| Cursor | `.cursor\hooks.json` | En Cursor |
| Claude Desktop | Nada que instalar | En la app de Claude |
| OpenCode | Plugin en `.config\opencode\plugins\` | En OpenCode |
| Amp | Plugin en `.config\amp\plugins\` | En Amp |
| Hermes | Plugin en `.hermes\plugins\neo\` | En Hermes |

### Otra herramienta

Cualquier programa con hooks puede tener su propia pestaña. Añade esto a sus hooks:

```bash
neo-hook --agent mi-herramienta EventName
```

El nombre admite minúsculas, números y guiones, hasta 24 caracteres.

## Elegir qué aparece en la isla

- **Pestañas activas:** la herramienta principal (siempre visible) y hasta 4 agentes o proveedores de IA.
- **Integraciones:** los servicios. Activa los que uses y añade su clave.

## Notificaciones de Windows

En **General → Notificaciones de Windows**, enciende el interruptor. Desde entonces:

- Las notificaciones de tus apps abren la isla y Windows deja de enseñar su aviso.
- La tarjeta guarda las 10 últimas: recórrelas con **‹ ›**.
- **Abrir** lanza la app que mandó la notificación.
- En **Apps que abren la isla** puedes apagar una app para que vuelva a avisar por Windows.

La primera notificación de una app nueva puede salir también en Windows: NEO apaga su aviso justo después.

> **Si cierras NEO**, esas apps no mostrarán aviso (siguen en el centro de notificaciones). Antes de desinstalar NEO, apaga el interruptor: así devuelve el aviso a todas.

## Chat

Elige el proveedor con el nombre del modelo, encima de la caja de texto: Claude, Google AI, OpenAI, OpenRouter, Ollama, LM Studio o un servidor propio. Las claves se guardan en el llavero del sistema.

## Dictado, Notetaker y « OK NEO »

| Función | Cómo se usa |
|---|---|
| **Dictado** | Mantén la tecla elegida, habla y suelta: el texto se pega donde estés. Descarga el modelo Parakeet (unos 650 MB) para usarlo sin internet |
| **Notetaker** | Pulsa grabar llamada. NEO graba tu micrófono y lo que suena en tu PC y te da transcripción, resumen y tareas. Avisa a la gente de la llamada de que grabas |
| **« OK NEO »** | Di la frase y pregunta. Necesita tu clave de Claude. Tus palabras, nunca el audio, van a Anthropic |

## Dónde guarda NEO sus datos (Windows)

| Qué | Dónde |
|---|---|
| Programa y log (`neo.log`) | `%LOCALAPPDATA%\NEO` |
| Ajustes | `%APPDATA%\NEO\settings.json` |
| Tus propios sonidos | `%APPDATA%\NEO\sounds` |
| Claves | Administrador de credenciales de Windows |

Para cambiar un sonido, deja un archivo con su nombre (`finish.wav`, `approval.mp3`…) en la carpeta de sonidos y pulsa **Recargar sonidos**.

## Problemas frecuentes

**La isla no aparece.** En reposo es una franja casi invisible: lleva el ratón arriba del todo, al centro.

**Windows dice que no reconoce al editor.** El instalador no está firmado. Pulsa **Más información → Ejecutar de todos modos**.

**"Failed to kill NEO" al instalar.** Cierra NEO desde la bandeja del sistema y espera unos segundos: el antivirus puede estar revisando el archivo.

**Un atajo no funciona.** Otra app lo está usando. Cámbialo en **Atajos**.

**Algo va mal.** Revisa `%LOCALAPPDATA%\NEO\neo.log` y [abre un issue](https://github.com/juann11/NEO/issues).
