# Tareas: plan de mejoras de NEO

Comandos de verificación (en `app/`): `npm test`, `npx tsc --noEmit`, `cargo test --workspace`, `npm run tauri build`.
Recordatorio: el instalador lo ejecutas tú desde el Explorador (Claude corre en un contenedor MSIX y lo que instala no llega a Windows).

## Fase 1: Distribución

## Tarea 1: Publicar la primera release automática (`windows-v0.1.1`)
**Descripción:** Subir la versión a 0.1.1 (con su entrada en "What's new") y publicar la etiqueta `windows-v0.1.1` para que el workflow de GitHub compile y suba el instalador como release.
**Criterios de aceptación:**
- [ ] `tauri.conf.json`, `package.json`, `Cargo.toml` y `whats-new.json` dicen 0.1.1 (lo comprueba `tests/whats-new.test.mjs`)
- [ ] La release `windows-v0.1.1` existe en github.com/juann11/NEO con `NEO-Windows-0.1.1-setup.exe` y el `.msi`
- [ ] El workflow termina en verde
**Verificación:**
- [ ] `npm test` y `cargo test --workspace` pasan
- [ ] Revisar la ejecución del workflow en GitHub Actions
**Dependencias:** Ninguna
**Archivos:** `app/src-tauri/tauri.conf.json`, `app/package.json`, `app/Cargo.toml`, `app/src/whats-new/whats-new.json`
**Tamaño:** S

## Tarea 2: Comprobar la actualización automática de punta a punta
**Descripción:** Con 0.1.1 instalada, publicar 0.1.2 y comprobar que NEO avisa (NEO se pone azul), descarga e instala la versión nueva.
**Criterios de aceptación:**
- [ ] NEO 0.1.1 detecta 0.1.2 tras aceptar buscar actualizaciones
- [ ] "Actualizar" descarga el instalador de la release, comprueba su hash y lo instala
- [ ] Tras actualizar, NEO arranca en 0.1.2 y conserva los ajustes
**Verificación:**
- [ ] Log de NEO (`%LOCALAPPDATA%\NEO\neo.log`) muestra la descarga y la instalación
- [ ] Prueba manual tuya: la isla enseña "What's new" de 0.1.2
**Dependencias:** Tarea 1
**Archivos:** los de la Tarea 1 (versión 0.1.2); si falla, `app/src-tauri/src/update.rs`
**Tamaño:** S

### Punto de control: Distribución
- [ ] Release publicada y actualización automática comprobada
- [ ] Revisión contigo

## Fase 2: Diseño y accesibilidad

## Tarea 3: Foco de teclado visible en la isla y en la ventana
**Descripción:** Añadir un anillo de foco verde con `:focus-visible` para botones, enlaces, interruptores y campos, y sustituir los tres `outline: none` por ese anillo.
**Criterios de aceptación:**
- [ ] Navegando con Tab, cada control enfocado muestra un anillo visible
- [ ] No queda ningún `outline: none` sin un `:focus-visible` que lo sustituya
- [ ] El clic con ratón no muestra el anillo (solo el teclado)
**Verificación:**
- [ ] Test nuevo que lee `style.css` y `hub/hub.css` y comprueba las reglas `:focus-visible`
- [ ] Manual: Tab por la ventana de ajustes
**Dependencias:** Ninguna
**Archivos:** `app/src/style.css`, `app/src/hub/hub.css`, `app/tests/a11y-css.test.mjs`
**Tamaño:** S

## Tarea 4: Respetar "reducir movimiento" de Windows
**Descripción:** Con "Efectos de animación" desactivados en Windows, NEO deja de respirar y de hacer animaciones de adorno (mantiene los cambios de estado), y las transiciones de la isla son instantáneas.
**Criterios de aceptación:**
- [ ] `engine.ts` no anima la respiración ni las partículas cuando `prefers-reduced-motion: reduce`
- [ ] Hay una regla `@media (prefers-reduced-motion: reduce)` que anula transiciones y animaciones de CSS
- [ ] Los estados (trabajando, esperando permiso, error) siguen viéndose por el color de los ojos
**Verificación:**
- [ ] Test del motor con la preferencia simulada
- [ ] Manual: Configuración de Windows → Accesibilidad → Efectos visuales → Efectos de animación apagado
**Dependencias:** Ninguna
**Archivos:** `app/src/neo/engine.ts`, `app/src/style.css`, `app/tests/neo-motion.test.mjs`
**Tamaño:** M

## Tarea 5: Letra mínima legible
**Descripción:** Subir los textos de 9–10,5 px de la isla a 11 px como mínimo, y los de la ventana principal a 12 px, sin romper el tamaño de las tarjetas (720×160).
**Criterios de aceptación:**
- [ ] Ninguna regla de la isla por debajo de 11 px; ninguna de la ventana por debajo de 12 px
- [ ] Las tarjetas siguen cabiendo (textos largos con elipsis, sin cortar botones)
**Verificación:**
- [ ] Test que lee los CSS y comprueba los mínimos
- [ ] Manual: `dev/neo-preview.html` y la isla real con notificación, permiso y GitHub
**Dependencias:** Ninguna
**Archivos:** `app/src/style.css`, `app/src/hub/hub.css`, `app/tests/a11y-css.test.mjs`
**Tamaño:** M

## Tarea 6: Botones de icono más fáciles de pulsar y con nombre accesible
**Descripción:** Llevar las zonas de clic de los botones de icono a 28×28 px como mínimo (en la isla no caben 44) y darles `aria-label` con el mismo texto que el `title`.
**Criterios de aceptación:**
- [ ] Cabecera de la isla: engranaje, sonido y pestañas con zona de clic ≥ 28×28
- [ ] Todo botón solo-icono tiene `aria-label` (lo pone `h()` cuando hay `title` y no hay texto)
**Verificación:**
- [ ] Test de `buildHeader`: cada botón tiene `aria-label`
- [ ] Manual: la cabecera no se descoloca
**Dependencias:** Tarea 3
**Archivos:** `app/src/views/dom.ts`, `app/src/style.css`, `app/tests/island-header.test.mjs`
**Tamaño:** S

### Punto de control: Diseño
- [ ] Tests y compilación en verde
- [ ] Revisión visual contigo; release 0.1.x con estos cambios

## Fase 3: Funciones del día a día

## Tarea 7: Modo "no molestar al jugar"
**Descripción:** Si hay un juego o una app a pantalla completa, las notificaciones y avisos no abren la isla: se guardan en el historial y NEO se asoma cuando sales de la pantalla completa.
**Criterios de aceptación:**
- [ ] Con pantalla completa activa, una notificación no abre la isla pero entra en el historial
- [ ] Al salir, la isla enseña cuántas llegaron
- [ ] Un permiso de Claude pendiente sí avisa (con un aviso discreto), porque bloquea al agente
- [ ] Interruptor en Ajustes → General, encendido por defecto
**Verificación:**
- [ ] Tests de la regla de decisión (TS) y de la consulta de pantalla completa (Rust, función pura)
- [ ] Manual: con Valorant abierto, mandar una notificación de prueba
**Dependencias:** Ninguna
**Archivos:** `app/src-tauri/src/system_notifications.rs` (o `platform/windows.rs`), `app/src/island/system-notifications.ts`, `app/src/settings/main.ts`, `app/src/i18n/extra.json`, tests
**Tamaño:** M

## Tarea 8: Pestaña de Docker
**Descripción:** Una pestaña que enseña los contenedores en marcha y avisa si uno se cae o queda "unhealthy", usando la CLI `docker` que ya tienes.
**Criterios de aceptación:**
- [ ] Se activa en Integraciones; apagada no consulta nada
- [ ] Lista contenedores con su estado; el ↗ abre Docker Desktop
- [ ] Un contenedor que pasa a "exited"/"unhealthy" pone la pestaña en rojo
**Verificación:**
- [ ] Tests del parser de `docker ps --format json` con salidas de ejemplo
- [ ] Manual: parar un contenedor y ver el aviso
**Dependencias:** Ninguna
**Archivos:** `app/src-tauri/src/integrations.rs` (o `docker.rs` nuevo), `app/src/core/pills.ts`, `app/src/views/integrations.ts`, `app/src/i18n/extra.json`, tests
**Tamaño:** M

## Tarea 9: Pestaña de Supabase
**Descripción:** Una pestaña con el estado de tus proyectos de Supabase usando un token personal guardado en el Credential Manager.
**Criterios de aceptación:**
- [ ] El token se guarda en el llavero de Windows, nunca en disco
- [ ] Enseña los datos que elijas (ver pregunta abierta) y avisa si un proyecto está caído o pausado
- [ ] Apagada no consulta nada
**Verificación:**
- [ ] Tests del parser con respuestas de ejemplo de la API
- [ ] Manual con tu token
**Dependencias:** Respuesta a la pregunta abierta sobre Supabase
**Archivos:** `app/src-tauri/src/integrations.rs`, `app/src/core/pills.ts`, `app/src/views/integrations.ts`, `app/src/i18n/extra.json`, tests
**Tamaño:** M

### Punto de control: Funciones
- [ ] Tests y compilación en verde; release publicada
- [ ] Revisión contigo

## Fase 4: Proyectos grandes

## Tarea 10: Resumen diario en la isla
**Descripción:** Cada mañana, la primera vez que la isla se abre, una tarjeta con lo de ayer: horas con agentes, proyectos, archivos y líneas cambiadas (sale de los datos del recap semanal que NEO ya guarda).
**Criterios de aceptación:**
- [ ] Sale una vez al día; si ayer no hubo actividad, no sale
- [ ] Interruptor en Ajustes; datos solo locales
**Verificación:**
- [ ] Tests del cálculo con el historial de ejemplo (`sampleHistory`)
**Dependencias:** Ninguna
**Archivos:** `app/src/recap/summary.ts`, vista nueva en `app/src/views/`, `app/src/i18n/extra.json`, tests
**Tamaño:** M

## Tarea 11: Avisar de permisos pendientes por WhatsApp
**Descripción:** Si Claude espera un permiso y no estás delante (sin ratón ni teclado unos minutos), NEO te manda un WhatsApp con qué pide.
**Criterios de aceptación:**
- [ ] Solo al número que vincules en Ajustes; apagado por defecto
- [ ] Un mensaje por permiso, nunca el contenido de archivos
**Verificación:**
- [ ] Tests de la regla "no estás delante" y del texto del mensaje
**Dependencias:** Respuesta a la pregunta WhatsApp/Telegram
**Archivos:** `app/src-tauri/src/whatsapp/mod.rs`, `app/src/island/hooks.ts`, ajustes, i18n, tests
**Tamaño:** M

## Tarea 12: Aprobar o denegar permisos desde WhatsApp
**Descripción:** Responder "sí" o "no" al mensaje de la Tarea 11 aprueba o deniega ese permiso exacto.
**Criterios de aceptación:**
- [ ] Solo vale la respuesta del número vinculado y para el permiso que espera
- [ ] Los comandos demasiado largos para leerlos en el móvil solo se aprueban en el PC
**Verificación:**
- [ ] Tests de seguridad: número equivocado, permiso caducado, respuesta ambigua
**Dependencias:** Tarea 11
**Archivos:** `app/src-tauri/src/whatsapp/mod.rs`, `app/src-tauri/src/pipe.rs`, tests
**Tamaño:** M

### Punto de control: Completo
- [ ] Todos los criterios cumplidos, release publicada
