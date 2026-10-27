<div align="center">

<img src="windows/src-tauri/icons/128x128.png" width="96" alt="Icono de NEO">

# NEO

**Un pequeño robot que vive arriba de tu pantalla y vigila tus sesiones de agentes de IA.**

</div>

NEO te deja aprobar permisos de Claude Code (y de Codex, Cursor, Gemini CLI y otros agentes), contestar sus preguntas, ver en vivo lo que editan, soltar archivos, chatear con tu modelo favorito y tener a mano tus servicios (GitHub, Vercel, Stripe…), sin salir de lo que estás haciendo.

Funciona en **Windows 10/11** y **Linux**. Está hecho con Tauri 2: Rust en `windows/src-tauri/` y TypeScript en `windows/src/`.

## Desarrollo

Necesitas Node 22+, Rust (stable, MSVC en Windows) y las Build Tools de C++ de Visual Studio.

```bash
cd windows
npm install
npm run tauri dev
```

Tests:

```bash
cd windows
npm test
cargo test --workspace
```

Para ver el personaje en todos sus estados y escuchar los sonidos sin abrir la app, arranca `npx vite` dentro de `windows/` y abre `http://127.0.0.1:1420/dev/neo-preview.html`.

## Dónde está cada cosa

- `windows/src/neo/neo-look.ts`: el aspecto de NEO (paleta, visor, antena). Lo usan todos los sitios que lo dibujan.
- `windows/src-tauri/icons/neo-icon.svg`: el icono. Para regenerar los tamaños: `npx tauri icon src-tauri/icons/neo-icon.svg`.
- `windows/scripts/gen-sounds.py`: genera los 29 sonidos de `windows/sounds/` (`uv run --no-project scripts/gen-sounds.py`).
- `windows/README.md`: documentación técnica completa (agentes soportados, atajos, compilación, estructura).

## Licencia

MIT (ver [LICENSE](LICENSE)).
