// Notificaciones de Windows en la isla: cuando cualquier app manda un toast, NEO lo enseña.
//
// Windows guarda los toasts en %LOCALAPPDATA%\Microsoft\Windows\Notifications\wpndatabase.db
// (SQLite en modo WAL). Su formato no está documentado: si una actualización lo cambia, la
// consulta falla y NEO simplemente deja de avisar. Solo se lee, en este equipo; nada sale de él.
//
// shortcut: lee la base de Windows en vez de UserNotificationListener, que exige empaquetar NEO
// como MSIX con firma; cambiar a la API oficial si la base deja de servir.

use rusqlite::{Connection, OpenFlags, params};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter, Manager};

/// Una notificación tal como la enseña la isla.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Toast {
    pub id: i64,
    /// El id de Windows de la app (AUMID), con el que se silencia.
    pub app_id: String,
    /// Su nombre legible, sacado del id.
    pub app: String,
    pub title: String,
    pub body: String,
}

/// Una app que ha mandado notificaciones, para la lista de Ajustes.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct App {
    pub id: String,
    pub name: String,
}

/// El id con el que NEO firma sus propios avisos: nunca se los enseña a sí mismo.
const OWN_APP_ID: &str = "dev.neo.app";

/// Los textos de un toast (`<text>…</text>`), en orden y sin entidades XML.
pub fn texts(xml: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut rest = xml;
    while let Some(start) = rest.find("<text") {
        rest = &rest[start + 5..];
        // `<textBox>` u otra etiqueta que solo empieza igual.
        if !rest.starts_with(['>', ' ', '/', '\t', '\n', '\r']) {
            continue;
        }
        let Some(tag_end) = rest.find('>') else { break };
        let self_closing = rest[..tag_end].ends_with('/');
        rest = &rest[tag_end + 1..];
        if self_closing {
            continue;
        }
        let Some(close) = rest.find("</text>") else { break };
        let text = decode(rest[..close].trim());
        if !text.is_empty() {
            out.push(text);
        }
        rest = &rest[close..];
    }
    out
}

/// Las entidades que puede traer un toast; `&amp;` al final para no decodificar dos veces.
fn decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(i) = rest.find('&') {
        out.push_str(&rest[..i]);
        rest = &rest[i..];
        let Some(end) = rest.find(';').filter(|&e| e <= 10) else {
            out.push('&');
            rest = &rest[1..];
            continue;
        };
        let entity = &rest[1..end];
        let ch = match entity {
            "amp" => Some('&'),
            "lt" => Some('<'),
            "gt" => Some('>'),
            "quot" => Some('"'),
            "apos" => Some('\''),
            _ if entity.starts_with("#x") => u32::from_str_radix(&entity[2..], 16).ok().and_then(char::from_u32),
            _ if entity.starts_with('#') => entity[1..].parse().ok().and_then(char::from_u32),
            _ => None,
        };
        match ch {
            Some(c) => {
                out.push(c);
                rest = &rest[end + 1..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// "5319275A.WhatsAppDesktop_cv1g…!App" → "WhatsApp"; "ai.opencode.desktop" → "Opencode".
pub fn app_name(app_id: &str) -> String {
    let id = app_id.split('!').next().unwrap_or(app_id);
    // Apps de la Tienda: "Editor.Nombre_hashdelpaquete".
    let id = id.rsplit_once('_').map_or(id, |(name, _)| name);
    let generic = |s: &str| matches!(s.to_ascii_lowercase().as_str(), "desktop" | "app" | "exe" | "");
    let last = id.split('.').rev().find(|s| !generic(s)).unwrap_or(id);
    let name = match last.len().checked_sub("desktop".len()) {
        Some(cut) if cut > 0 && last[cut..].eq_ignore_ascii_case("desktop") => &last[..cut],
        _ => last,
    };
    let mut chars = name.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => app_id.to_string(),
    }
}

/// El último id de toast que hay en la base (0 si no hay ninguno).
pub fn latest_id(db: &Connection) -> rusqlite::Result<i64> {
    db.query_row("SELECT COALESCE(MAX(Id), 0) FROM Notification WHERE Type = 'toast'", [], |r| r.get(0))
}

/// Los toasts con id mayor que `after`, sin los de NEO ni los de las apps silenciadas.
pub fn new_toasts(db: &Connection, after: i64, muted: &[String]) -> rusqlite::Result<Vec<Toast>> {
    let mut stmt = db.prepare(
        "SELECT n.Id, h.PrimaryId, n.Payload FROM Notification n JOIN NotificationHandler h ON h.RecordId = n.HandlerId
         WHERE n.Type = 'toast' AND n.Id > ?1 ORDER BY n.Id",
    )?;
    let rows = stmt.query_map(params![after], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, Vec<u8>>(2)?)))?;
    let mut out = Vec::new();
    for row in rows {
        let (id, app_id, payload) = row?;
        if silenced(&app_id, muted) {
            continue;
        }
        let mut lines = texts(&String::from_utf8_lossy(&payload)).into_iter();
        let Some(title) = lines.next() else { continue };
        out.push(Toast { id, app: app_name(&app_id), app_id, title, body: lines.collect::<Vec<_>>().join("\n") });
    }
    Ok(out)
}

fn silenced(app_id: &str, muted: &[String]) -> bool {
    app_id.eq_ignore_ascii_case(OWN_APP_ID) || muted.iter().any(|m| m.eq_ignore_ascii_case(app_id))
}

/// Las apps que tienen notificaciones en la base, sin repetir, por nombre.
pub fn apps(db: &Connection) -> rusqlite::Result<Vec<App>> {
    let mut stmt = db.prepare(
        "SELECT DISTINCT h.PrimaryId FROM Notification n JOIN NotificationHandler h ON h.RecordId = n.HandlerId WHERE n.Type = 'toast'",
    )?;
    let mut out: Vec<App> = stmt
        .query_map([], |r| r.get::<_, String>(0))?
        .filter_map(Result::ok)
        .filter(|id| !silenced(id, &[]))
        .map(|id| App { name: app_name(&id), id })
        .collect();
    out.sort_by_key(|a| a.name.to_lowercase());
    out.dedup_by(|a, b| a.id.eq_ignore_ascii_case(&b.id));
    Ok(out)
}

fn open_read_only(path: &Path) -> rusqlite::Result<Connection> {
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX)
}

/// La base de toasts de Windows; `None` fuera de Windows.
fn database() -> Option<PathBuf> {
    if !cfg!(windows) {
        return None;
    }
    let base = std::env::var_os("LOCALAPPDATA")?;
    Some(PathBuf::from(base).join(r"Microsoft\Windows\Notifications\wpndatabase.db"))
}

/// Lo que cambia cuando Windows escribe un toast: fecha y tamaño de la base y de su WAL.
fn stamp(db: &Path) -> Option<(SystemTime, SystemTime, u64)> {
    let wal = std::fs::metadata(db.with_extension("db-wal")).ok();
    let main = std::fs::metadata(db).ok()?;
    Some((
        main.modified().ok()?,
        wal.as_ref().and_then(|w| w.modified().ok()).unwrap_or(SystemTime::UNIX_EPOCH),
        wal.map_or(0, |w| w.len()),
    ))
}

/// Interruptor y apps silenciadas, tal como están ahora en Ajustes.
fn wanted(app: &AppHandle) -> Option<Vec<String>> {
    let shared = app.try_state::<crate::Shared>()?;
    let settings = shared.settings.lock().unwrap();
    settings.system_notifications.then(|| settings.muted_notification_apps.clone())
}

/// Vigila la base cada 2 s (solo fecha y tamaño del archivo) mientras el interruptor está encendido,
/// y manda a la isla el toast más nuevo. Al encenderse no repasa los antiguos.
pub fn start(app: AppHandle) {
    let Some(db_path) = database() else { return };
    std::thread::Builder::new()
        .name("neo-notifications".into())
        .spawn(move || {
            let mut last: Option<i64> = None;
            let mut stamp_seen = None;
            let mut warned = false;
            // Avisos de Windows: los que NEO apagó (en disco), las apps vistas y las que el usuario ya tenía apagadas.
            let mut hidden = load_hidden();
            let mut apps_seen: Vec<String> = Vec::new();
            let mut left_alone: Vec<String> = Vec::new();
            loop {
                std::thread::sleep(Duration::from_secs(2));
                let wanted_now = wanted(&app);
                let enabled = wanted_now.is_some();
                let muted = wanted_now.unwrap_or_default();
                apply_banners(enabled, &apps_seen, &muted, &mut hidden, &mut left_alone);
                if !enabled {
                    last = None;
                    apps_seen.clear();
                    continue;
                }
                let now = stamp(&db_path);
                if last.is_some() && now == stamp_seen {
                    continue;
                }
                stamp_seen = now;
                let read: rusqlite::Result<(i64, Vec<Toast>, Vec<String>)> = open_read_only(&db_path).and_then(|db| match last {
                    // Al encenderse: ni repasa los viejos ni deja que sus apps sigan saliendo en Windows.
                    None => Ok((latest_id(&db)?, Vec::new(), apps(&db)?.into_iter().map(|a| a.id).collect())),
                    Some(after) => new_toasts(&db, after, &muted).map(|t| {
                        let ids = t.iter().map(|x| x.app_id.clone()).collect();
                        (t.last().map_or(after, |x| x.id), t, ids)
                    }),
                });
                match read {
                    Ok((id, toasts, ids)) => {
                        last = Some(last.map_or(id, |l| l.max(id)));
                        warned = false;
                        if let Some(newest) = toasts.last() {
                            let _ = app.emit_to(crate::island::WINDOW_LABEL, EVENT, newest);
                        }
                        for app_id in ids {
                            if !apps_seen.iter().any(|a: &String| a.eq_ignore_ascii_case(&app_id)) {
                                apps_seen.push(app_id);
                            }
                        }
                    }
                    Err(err) if !warned => {
                        warned = true;
                        crate::log::line(format!("notifications: could not read Windows' notification database: {err}"));
                    }
                    Err(_) => {}
                }
            }
        })
        .ok();
}

/// Qué avisos emergentes de Windows apagar y cuáles devolver. Con el interruptor encendido se
/// apagan los de las apps que NEO enseña; se devuelven los que NEO apagó y ya no enseña
/// (interruptor apagado o app silenciada). `hidden` son los que NEO apagó.
pub fn banner_plan(enabled: bool, seen: &[String], muted: &[String], hidden: &[String]) -> (Vec<String>, Vec<String>) {
    let has = |list: &[String], id: &str| list.iter().any(|x| x.eq_ignore_ascii_case(id));
    let restore = hidden.iter().filter(|id| !enabled || has(muted, id)).cloned().collect();
    let mut hide: Vec<String> = Vec::new();
    if enabled {
        for id in seen {
            if !silenced(id, muted) && !has(hidden, id) && !has(&hide, id) {
                hide.push(id.clone());
            }
        }
    }
    (hide, restore)
}

/// Por app, Windows guarda aquí si enseña su aviso emergente (`ShowBanner`, 0 = no).
/// shortcut: valor no documentado por Microsoft (es el interruptor "Mostrar banners" de Configuración); revisar si Windows lo cambia.
#[cfg(windows)]
const BANNER_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Notifications\Settings";

#[cfg(windows)]
fn banner_on(app_id: &str) -> bool {
    use winreg::{RegKey, enums::HKEY_CURRENT_USER};
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(format!(r"{BANNER_KEY}\{app_id}"))
        .and_then(|k| k.get_value::<u32, _>("ShowBanner"))
        .map_or(true, |v| v != 0)
}

/// Apaga el aviso (`ShowBanner` = 0) o lo devuelve como estaba (sin el valor: lo que Windows haga por defecto).
#[cfg(windows)]
fn set_banner(app_id: &str, on: bool) -> std::io::Result<()> {
    use std::io::ErrorKind;
    use winreg::{RegKey, enums::{HKEY_CURRENT_USER, KEY_SET_VALUE}};
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = format!(r"{BANNER_KEY}\{app_id}");
    if !on {
        let (key, _) = hkcu.create_subkey(&path)?;
        return key.set_value("ShowBanner", &0u32);
    }
    match hkcu.open_subkey_with_flags(&path, KEY_SET_VALUE).and_then(|k| k.delete_value("ShowBanner")) {
        Err(e) if e.kind() != ErrorKind::NotFound => Err(e),
        _ => Ok(()),
    }
}

#[cfg(not(windows))]
fn banner_on(_app_id: &str) -> bool {
    false
}

#[cfg(not(windows))]
fn set_banner(_app_id: &str, _on: bool) -> std::io::Result<()> {
    Ok(())
}

/// Las apps a las que NEO apagó el aviso, guardadas para devolvérselo aunque NEO se reinicie.
fn hidden_file() -> PathBuf {
    crate::settings::config_dir().join("hidden-banners.json")
}

fn load_hidden() -> Vec<String> {
    std::fs::read(hidden_file()).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}

/// Aplica `banner_plan`: apaga los avisos que tocan (solo si Windows los enseñaba) y devuelve los demás.
fn apply_banners(enabled: bool, seen: &[String], muted: &[String], hidden: &mut Vec<String>, left_alone: &mut Vec<String>) {
    let (hide, restore) = banner_plan(enabled, seen, muted, hidden);
    let before = hidden.len();
    let mut changed = false;
    for id in restore {
        if set_banner(&id, true).is_ok() {
            hidden.retain(|h| !h.eq_ignore_ascii_case(&id));
            changed = true;
        }
    }
    let hide: Vec<String> = hide.into_iter().filter(|id| !left_alone.iter().any(|l| l.eq_ignore_ascii_case(id))).collect();
    for id in hide {
        // Un aviso que el usuario ya tenía apagado es suyo: NEO no lo apunta ni lo devuelve luego.
        if !banner_on(&id) {
            left_alone.push(id);
        } else if set_banner(&id, false).is_ok() {
            hidden.push(id);
        }
    }
    if changed || hidden.len() != before {
        let _ = std::fs::create_dir_all(crate::settings::config_dir());
        let _ = std::fs::write(hidden_file(), serde_json::to_vec(hidden).unwrap_or_default());
    }
}

/// La isla escucha este evento con el `Toast`.
const EVENT: &str = "system-notification";

/// Las apps que han mandado notificaciones, para elegir en Ajustes cuáles avisan.
#[tauri::command]
pub fn system_notification_apps() -> Vec<App> {
    database().and_then(|p| open_read_only(&p).ok()).and_then(|db| apps(&db).ok()).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Una base con las mismas tablas que la de Windows (solo las columnas que se leen y las obligatorias).
    fn base() -> Connection {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE [NotificationHandler] ([RecordId] INTEGER PRIMARY KEY, [PrimaryId] TEXT NOT NULL COLLATE NOCASE, [HandlerType] TEXT);
             CREATE TABLE [Notification] ([Order] INTEGER NOT NULL PRIMARY KEY, [Id] INTEGER NOT NULL, [HandlerId] INTEGER,
                [Type] TEXT NOT NULL, [Payload] BLOB, [ArrivalTime] INT64, [PayloadType] TEXT NOT NULL, UNIQUE([Id]) ON CONFLICT REPLACE);",
        )
        .unwrap();
        for (rec, app) in [(1, "5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"), (2, "Microsoft.SkyDrive.Desktop"), (3, "dev.neo.app")] {
            db.execute("INSERT INTO NotificationHandler (RecordId, PrimaryId, HandlerType) VALUES (?1, ?2, 'app:desktop')", params![rec, app]).unwrap();
        }
        let toast = |title: &str, body: &str| {
            format!(r#"<toast><visual><binding template="ToastGeneric"><text>{title}</text><text>{body}</text></binding></visual></toast>"#)
        };
        let rows: [(i64, i64, &str, String); 5] = [
            (800, 1, "toast", toast("Ana", "¿Vienes hoy?")),
            (801, 2, "toast", toast("OneDrive", "Sincronizado")),
            (802, 1, "tile", "<tile/>".into()),
            (803, 3, "toast", toast("NEO", "propio")),
            (804, 1, "toast", toast("Ana &amp; Luis", "Hola &lt;3")),
        ];
        for (order, (id, handler, kind, payload)) in rows.iter().enumerate() {
            db.execute(
                "INSERT INTO Notification ([Order], Id, HandlerId, Type, Payload, ArrivalTime, PayloadType) VALUES (?1, ?2, ?3, ?4, ?5, 0, 'Xml')",
                params![order as i64, id, handler, kind, payload.as_bytes()],
            )
            .unwrap();
        }
        db
    }

    #[test]
    fn the_texts_of_a_toast_come_out_in_order_without_entities() {
        let xml = r#"<toast><visual><binding template="ToastGeneric"><text hint-maxLines="1">Ana &amp; Luis</text><text>Hola &lt;3 &#233;</text><image src="x"/></binding></visual></toast>"#;
        assert_eq!(texts(xml), vec!["Ana & Luis".to_string(), "Hola <3 é".to_string()]);
        assert_eq!(texts("<toast><visual><binding><text/></binding></visual></toast>"), Vec::<String>::new());
    }

    #[test]
    fn apps_get_a_readable_name_from_their_id() {
        assert_eq!(app_name("5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"), "WhatsApp");
        assert_eq!(app_name("Claude_pzs8sxrjxfjjc!Claude"), "Claude");
        assert_eq!(app_name("Microsoft.SkyDrive.Desktop"), "SkyDrive");
        assert_eq!(app_name("ai.opencode.desktop"), "Opencode");
        assert_eq!(app_name("Chrome"), "Chrome");
    }

    #[test]
    fn only_new_toasts_are_read_and_neo_never_hears_itself() {
        let db = base();
        assert_eq!(latest_id(&db).unwrap(), 804);
        let all = new_toasts(&db, 0, &[]).unwrap();
        assert_eq!(all.iter().map(|t| t.id).collect::<Vec<_>>(), vec![800, 801, 804], "ni el tile ni el propio NEO");
        assert_eq!(all[0], Toast {
            id: 800,
            app_id: "5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App".into(),
            app: "WhatsApp".into(),
            title: "Ana".into(),
            body: "¿Vienes hoy?".into(),
        });
        assert_eq!(new_toasts(&db, 801, &[]).unwrap().iter().map(|t| t.id).collect::<Vec<_>>(), vec![804]);
        assert!(new_toasts(&db, 804, &[]).unwrap().is_empty());
    }

    #[test]
    fn a_muted_app_says_nothing() {
        let db = base();
        let muted = vec!["5319275a.whatsappdesktop_cv1g1gvanyjgm!app".to_string()];
        assert_eq!(new_toasts(&db, 0, &muted).unwrap().iter().map(|t| t.id).collect::<Vec<_>>(), vec![801]);
    }

    /// Contra la base real de este Windows: `cargo test -p neo --lib -- --ignored real_database`.
    #[test]
    #[ignore]
    fn reads_this_computers_real_database() {
        let db = open_read_only(&database().expect("solo en Windows")).expect("la base se abre en solo lectura");
        let last = latest_id(&db).unwrap();
        assert!(last > 0, "Windows guarda los toasts aquí");
        assert!(new_toasts(&db, last, &[]).unwrap().is_empty());
        println!("apps con toasts: {}", apps(&db).unwrap().len());
    }

    fn ids(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn banners_of_the_apps_neo_shows_go_off_once() {
        let seen = ids(&["WhatsApp!App", "Teams", "dev.neo.app", "OneDrive"]);
        let (hide, restore) = banner_plan(true, &seen, &ids(&["onedrive"]), &ids(&["teams"]));
        assert_eq!(hide, ids(&["WhatsApp!App"]), "ni la silenciada, ni NEO, ni la que ya está apagada");
        assert!(restore.is_empty());
    }

    #[test]
    fn turning_the_switch_off_gives_every_banner_back() {
        let (hide, restore) = banner_plan(false, &ids(&["WhatsApp!App"]), &[], &ids(&["WhatsApp!App", "Teams"]));
        assert!(hide.is_empty());
        assert_eq!(restore, ids(&["WhatsApp!App", "Teams"]));
    }

    #[test]
    fn muting_an_app_in_neo_gives_its_banner_back() {
        let (hide, restore) = banner_plan(true, &ids(&["WhatsApp!App", "Teams"]), &ids(&["TEAMS"]), &ids(&["WhatsApp!App", "Teams"]));
        assert!(hide.is_empty());
        assert_eq!(restore, ids(&["Teams"]));
    }

    #[test]
    fn the_settings_list_the_apps_that_sent_toasts() {
        let db = base();
        assert_eq!(apps(&db).unwrap(), vec![
            App { id: "Microsoft.SkyDrive.Desktop".into(), name: "SkyDrive".into() },
            App { id: "5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App".into(), name: "WhatsApp".into() },
        ]);
    }
}
