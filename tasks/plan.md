# Plan de mejoras: NEO

## Resumen
Mejorar NEO en tres frentes, en este orden: **distribución** (que NEO se actualice solo y deje de instalarse a mano), **diseño y accesibilidad** (lo que encontró la auditoría con ui-ux-pro-max) y **funciones nuevas** acordadas (no molestar al jugar, Docker, Supabase, resumen diario, aprobar desde el móvil). Cada tarea es una porción vertical: lógica + interfaz + test, y deja NEO funcionando.

## Punto de partida
- Arreglo de la flecha ↗ de Claude Code: hecho en la rama `flecha-claude` (pendiente de instalar y unir a `main`).
- Auditoría de diseño (ui-ux-pro-max, estilo "Dark Mode OLED", paleta slate + verde `#22C55E`, que coincide con la de NEO):
  - No hay ninguna regla `:focus-visible` y hay `outline: none` en 3 sitios (`style.css:1360`, `style.css:2950`, `hub/hub.css:355`): el foco de teclado no se ve.
  - No se respeta "reducir movimiento" de Windows (`prefers-reduced-motion`), y NEO respira y mueve los ojos todo el rato.
  - 74 textos de 9–11 px en `style.css`.
  - Botones de icono de 30×22 px en la cabecera de la isla.
  - La recomendación de tipografía (JetBrains Mono) **no** se aplica: un monoespaciado en toda la interfaz se lee peor y habría que empaquetar la fuente (NEO no carga nada de internet).

## Decisiones de arquitectura
- **Releases con el workflow que ya existe** (`.github/workflows/windows.yml`, etiquetas `windows-v*`). El actualizador (`src-tauri/src/update.rs`) ya apunta a `juann11/NEO`. Cada versión sube el número en `tauri.conf.json`, `package.json` y `Cargo.toml`, y su entrada de "What's new".
- **Accesibilidad con CSS, sin tocar el aspecto.** Un anillo de foco verde (`:focus-visible`) y una regla `@media (prefers-reduced-motion: reduce)`. Las animaciones de NEO leen esa preferencia en `src/neo/engine.ts`.
- **Detectar pantalla completa con la API de Windows** `SHQueryUserNotificationState` (dice si hay un juego o una presentación a pantalla completa), sin polling extra: se consulta solo cuando llega algo que abriría la isla.
- **Docker y Supabase como pestañas de integración** siguiendo el patrón de las que ya existen (`src-tauri/src/integrations.rs`, `src/core/pills.ts`): solo consultan mientras la pestaña está activa (regla de 0 % de CPU con la isla escondida).
- **Aprobar desde el móvil:** reutilizar la pasarela de WhatsApp que NEO ya tiene en vez de añadir Telegram (ver preguntas abiertas).

## Lista de tareas

### Fase 1: Distribución (primero: es lo de más riesgo y quita el instalar a mano)
- [ ] Tarea 1: Publicar la primera release automática (`windows-v0.1.1`)
- [ ] Tarea 2: Comprobar la actualización automática de punta a punta (0.1.1 → 0.1.2)

### Punto de control: Distribución
- [ ] La release aparece en GitHub con su instalador
- [ ] NEO instalado avisa de la versión nueva y se actualiza solo
- [ ] Revisión contigo antes de seguir

### Fase 2: Diseño y accesibilidad
- [ ] Tarea 3: Foco de teclado visible en la isla y en la ventana
- [ ] Tarea 4: Respetar "reducir movimiento" de Windows
- [ ] Tarea 5: Letra mínima legible (isla ≥ 11 px, ventana ≥ 12 px)
- [ ] Tarea 6: Botones de icono más fáciles de pulsar y con nombre accesible

### Punto de control: Diseño
- [ ] Todos los tests pasan y compila
- [ ] Revisión visual en `dev/neo-preview.html` y en la isla real
- [ ] Revisión contigo antes de seguir

### Fase 3: Funciones del día a día
- [ ] Tarea 7: Modo "no molestar al jugar"
- [ ] Tarea 8: Pestaña de Docker
- [ ] Tarea 9: Pestaña de Supabase

### Punto de control: Funciones
- [ ] Cada pestaña nueva se activa y desactiva en Integraciones
- [ ] Sin consultas con la isla escondida y la pestaña apagada
- [ ] Revisión contigo antes de seguir

### Fase 4: Proyectos grandes
- [ ] Tarea 10: Resumen diario en la isla
- [ ] Tarea 11: Avisar de permisos pendientes por WhatsApp
- [ ] Tarea 12: Aprobar o denegar permisos desde WhatsApp

### Punto de control: Completo
- [ ] Todos los criterios de aceptación cumplidos
- [ ] Release publicada con todo lo anterior

## Riesgos y mitigaciones
| Riesgo | Impacto | Mitigación |
|---|---|---|
| El instalador no está firmado: SmartScreen avisa en cada actualización | Medio | Avisarlo en las notas de la release; firmar el código queda fuera (cuesta dinero) |
| Una release rota se instala sola | Alto | Tarea 2 prueba la actualización antes de depender de ella; el workflow solo publica con etiqueta |
| Aprobar permisos de Claude desde el móvil abre una puerta remota | Alto | Solo el número vinculado con un código; los comandos largos solo en el PC (como hacía la app de Android); apagado por defecto |
| `SHQueryUserNotificationState` no detecta algunos juegos en ventana sin bordes | Bajo | Además comparar el tamaño de la ventana activa con la pantalla |
| El formato de la base de notificaciones de Windows cambia | Medio | Ya cubierto: NEO deja de avisar y lo apunta en el log |

## Preguntas abiertas
- ¿Aprobar permisos por **WhatsApp** (NEO ya tiene la pasarela) o prefieres **Telegram**?
- ¿Qué quieres ver de **Supabase**: estado del proyecto, uso de la base de datos, usuarios nuevos o errores?
- ¿Numeración de versiones: `0.1.1`, `0.1.2`… en cada cambio, o agrupar cambios por semana?
