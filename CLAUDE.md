# NEO — guía para agentes de código

NEO es una app de escritorio (Windows y Linux) hecha con Tauri 2: un robot que vive arriba de la pantalla, muestra las sesiones de agentes de IA (Claude Code, Codex, Cursor, Gemini CLI…) y algunas integraciones, y deja aprobar, responder, chatear y soltar archivos desde la isla.

## Dónde está cada cosa
- `windows/src-tauri/` — Rust (ventanas, hooks de los agentes, pipe con `neo-hook`, integraciones). `windows/hook/` — el relay `neo-hook` que ejecutan los agentes.
- `windows/src/` — TypeScript de la isla, ajustes y ventana principal. El personaje se dibuja en código: `src/neo/engine.ts` (motor) y `src/neo/neo-look.ts` (aspecto de NEO).
- `windows/src/i18n/` — textos en 12 idiomas, indexados por su texto en inglés (`strings.json` y `extra.json`, se editan a mano).
- `windows/sounds/` — los 29 WAV, generados por `windows/scripts/gen-sounds.py`.
- `windows/dev/neo-preview.html` — vista del personaje y los sonidos sin abrir la app.

## Compilar y probar
```
cd windows && npm install && npm run tauri dev
npm test && cargo test --workspace
```

## Reglas
- Nunca bloquear a Claude Code: si la app no responde, el hook sale enseguida.
- Nunca sobrescribir `~/.claude/settings.json`: copia con fecha, mezclar, enseñar el diff y escribir solo cuando el usuario confirme.
- Nunca enviar un email ni aprobar un permiso de Claude Code o Codex sin un clic explícito.
- Los secretos van al Credential Manager / Secret Service, nunca a disco ni a git. Sin telemetría.
- 0 % de CPU con la isla escondida.
- Los IDs de las pills son contrato (llavero, ajustes, enrutado de hooks): no renombrarlos.
- `tests/neo-brand.test.mjs` vigila que el código no mencione el proyecto del que partió NEO (la única excepción es LICENSE); `tests/neo-sounds.test.mjs`, que cada sonido exista.
