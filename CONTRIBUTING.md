# Cómo contribuir

¡Gracias por tu interés en NEO! Bugs, ideas y código son bienvenidos.

## Antes de empezar

- **¿Un bug o una idea?** Abre un [issue](https://github.com/juann11/NEO/issues) con la plantilla que corresponda.
- **¿Un cambio grande?** Coméntalo primero en un issue para evitar trabajo en vano.

## Preparar el entorno

Necesitas [Node 22.18+](https://nodejs.org), [Rust](https://rustup.rs) y, en Windows, las Build Tools de C++ de Visual Studio. En Linux, mira [docs/linux.md](docs/linux.md).

```bash
cd app
npm install
npm run tauri dev
```

Antes de tocar nada, lee [la arquitectura](docs/arquitectura.md).

## Cómo trabajamos

1. **Crea una rama** desde `main`. No se trabaja directamente en `main`.
2. **Escribe primero el test**, comprueba que falla y luego implementa. Al arreglar un bug, empieza por un test que lo reproduzca.
3. **Haz cambios pequeños y enfocados**, sin reformatear ni refactorizar código vecino.
4. **Comprueba** que todo pasa:

   ```bash
   npx tsc --noEmit
   npm test
   cargo test --workspace
   ```

5. **Abre un pull request** explicando qué cambia y por qué.

## Convenciones

- Código nuevo, comentarios, commits y documentación en español. Los nombres siguen lo que ya use el archivo.
- Commits pequeños, con un título que diga qué cambia.
- Cada texto visible va con su traducción a los 12 idiomas, en `app/src/i18n/extra.json`. Un test comprueba que no falte ninguna.

## Reglas que no se rompen

- Nunca bloquear a un agente: si la app no responde, `neo-hook` sale enseguida.
- Nunca modificar la configuración de un agente sin copia de seguridad, diff y confirmación.
- Nunca aprobar un permiso ni enviar un email sin un clic explícito.
- Los secretos van al llavero del sistema, nunca a disco ni a git.
- Sin telemetría. Solo se habla con los servicios que el usuario configura.
- 0 % de CPU con la isla escondida.

## Publicar una versión

1. Sube el número en `app/src-tauri/tauri.conf.json`, `app/package.json` y `app/Cargo.toml`.
2. Añade la entrada en `app/src/whats-new/whats-new.json` (12 idiomas) y en `CHANGELOG.md`.
3. Sube a `main` y crea la etiqueta `windows-vX.Y.Z`. El workflow compila y publica la release.
