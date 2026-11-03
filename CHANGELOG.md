# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/). NEO sigue [versionado semántico](https://semver.org/lang/es/).

## [0.1.2] - Sin publicar

### Añadido
- **Inicio:** la ventana de NEO abre en una página de tarjetas con Notificaciones, Sesiones activas, Agentes y Estado de NEO, y puedes añadir Servicios y Dictado.
- **Personalizar:** arrastra, mueve, ensancha, quita o agrega tarjetas. NEO recuerda cómo las dejaste.
- **Notificaciones:** página con todas las que guarda Windows, un buscador, filtro por app y agrupadas por día.
- **Aspecto:** elige lo que NEO lleva en la cabeza, con vista previa, y el color de su cuerpo.
- **Reacciones:** cada app puede tener su sonido, su gesto y su traje, y hay horas de silencio en las que NEO guarda las notificaciones sin abrir la isla.

### Cambiado
- En el menú de la ventana, los ajustes de la isla van primero y **Voz** (dictado y compañía) después.
- Nombres de apps legibles en las notificaciones: PowerShell, OneDrive, Snipping Tool.
- El grupo **Voz** se pliega si no usas el dictado, las bandas de cada página ocupan menos y **General** se parte en Sonido, Comportamiento, Notificaciones de Windows y App.

### Corregido
- Los avisos de Windows (Defender, reproducción automática, Configuración, iconos de la bandeja) se quedan en Windows; si NEO ya los había apagado, los devuelve.
- La tarjeta de notificación ya no corta los botones y **Abrir** sale en tu idioma.

## [0.1.1] - 2026-10-30

### Añadido
- Actualización automática desde las releases de GitHub.
- Las notificaciones de Windows salen solo en la isla: NEO apaga el aviso de Windows de esas apps.
- Historial de las últimas 10 notificaciones con flechas.
- Botón **Abrir** en la tarjeta de notificación.

### Cambiado
- Icono nuevo, legible también en tamaños pequeños.
- El engranaje de la isla abre la ventana de NEO.
- La ventana principal ya no se abre sola al arrancar.
- La tarjeta y la flecha de Claude Code abren la app de Claude.
- Instalaciones nuevas sin servicios anclados.
- La isla se aparta antes: se pliega a los 5 s y se esconde 3 s después.

## [0.1.0] - 2026-10-27

Primera versión de NEO: isla con sesiones de agentes en vivo, permisos y preguntas, chat, integraciones, dictado, Notetaker, « OK NEO », personaje, icono y sonidos propios, en 12 idiomas.

[0.1.2]: https://github.com/juann11/NEO/releases/tag/windows-v0.1.2
[0.1.1]: https://github.com/juann11/NEO/releases/tag/windows-v0.1.1
[0.1.0]: https://github.com/juann11/NEO/commits/main
