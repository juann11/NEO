# Seguridad

NEO puede aprobar permisos de agentes de IA, lee tus notificaciones y guarda claves de tus servicios, así que la seguridad importa.

## Informar de una vulnerabilidad

**No abras un issue público.** Usa [Report a vulnerability](https://github.com/juann11/NEO/security/advisories/new) en la pestaña Security del repositorio. Incluye qué versión usas, cómo reproducir el problema y qué impacto tiene.

## Versiones con soporte

Solo la última versión publicada recibe correcciones.

## Cómo protege NEO tus datos

- **Claves:** en el Administrador de credenciales de Windows o en Secret Service; nunca en archivos, nunca en git.
- **Canal con los agentes:** el pipe es por usuario y `neo-hook` comprueba que quien responde es el mismo usuario.
- **Permisos:** ninguno se aprueba sin un clic. Sin respuesta, el agente pregunta en su terminal.
- **Configuración de los agentes:** copia con fecha, diff visible y confirmación antes de escribir.
- **Notificaciones:** solo lectura y solo en tu equipo.
- **Actualizaciones:** solo con tu permiso, descargadas de las releases de este repositorio y comprobando su hash.
- **Red:** sin telemetría; solo los servicios que configuras.

## Limitaciones conocidas

- Los instaladores aún no están firmados, por lo que Windows muestra un aviso.
- NEO apaga el valor `ShowBanner` de las apps que muestra para evitar avisos duplicados. Se restaura al apagar la función.
