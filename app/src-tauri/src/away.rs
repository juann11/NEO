// "Mientras no estabas": cuánto lleva el PC sin teclado ni ratón. Cuando vuelves tras
// más de `absence_interval` segundos (Ajustes), la isla recibe `user-back` con lo que duró.
// También abre los proyectos recientes de la isla, en el Explorador o en la terminal.

use std::path::Path;
#[cfg(windows)]
use tauri::{AppHandle, Emitter, Manager};

/// La isla escucha este evento con los segundos que estuviste fuera.
#[cfg(windows)]
const EVENT: &str = "user-back";
/// Cada cuánto se mira: una consulta al sistema, sin despertar a la isla.
#[cfg(windows)]
const EVERY: std::time::Duration = std::time::Duration::from_secs(5);

/// Sigue el tiempo sin uso; devuelve lo que duró la ausencia en el momento de volver.
#[derive(Default)]
pub struct Away {
    longest: u64,
}

impl Away {
    pub fn step(&mut self, idle_secs: u64, threshold: u64) -> Option<u64> {
        if idle_secs >= threshold {
            self.longest = self.longest.max(idle_secs);
            return None;
        }
        // Volvió: el PC se ha usado hace menos que una vuelta del bucle.
        if self.longest > 0 && idle_secs < 5 {
            return Some(std::mem::take(&mut self.longest));
        }
        None
    }
}

#[cfg(windows)]
fn idle_secs() -> Option<u64> {
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    // SAFETY: `info` es un LASTINPUTINFO válido con su tamaño puesto, como pide la API.
    let ok = unsafe { GetLastInputInfo(&mut info) }.as_bool();
    ok.then(|| u64::from(unsafe { GetTickCount() }.wrapping_sub(info.dwTime)) / 1000)
}

#[cfg(windows)]
pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        let mut away = Away::default();
        loop {
            std::thread::sleep(EVERY);
            let threshold = app
                .try_state::<crate::Shared>()
                .map(|s| s.settings.lock().unwrap().absence_interval.max(60.0) as u64)
                .unwrap_or(180);
            let Some(idle) = idle_secs() else { continue };
            if let Some(seconds) = away.step(idle, threshold) {
                let _ = app.emit_to(crate::island::WINDOW_LABEL, EVENT, seconds);
            }
        }
    });
}

#[cfg(not(windows))]
pub fn start(_app: tauri::AppHandle) {}

/// Un proyecto de la tarjeta: solo carpetas que existen.
fn folder(path: &str) -> Result<&Path, String> {
    let p = Path::new(path);
    if p.is_dir() { Ok(p) } else { Err(format!("not a folder: {path}")) }
}

#[tauri::command]
pub fn open_project(path: String) -> Result<(), String> {
    crate::platform::reveal_folder(&folder(&path)?.to_string_lossy());
    Ok(())
}

/// Windows Terminal si está; si no, cmd. En Linux, la terminal del escritorio.
#[tauri::command]
pub fn open_project_terminal(path: String) -> Result<(), String> {
    let dir = folder(&path)?;
    #[cfg(windows)]
    let spawned = match crate::platform::find_on_path("wt") {
        Some(wt) => std::process::Command::new(wt).arg("-d").arg(dir).spawn(),
        None => std::process::Command::new("cmd").args(["/C", "start", "cmd", "/K"]).current_dir(dir).spawn(),
    };
    #[cfg(not(windows))]
    let spawned = std::process::Command::new("x-terminal-emulator").current_dir(dir).spawn();
    spawned.map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn coming_back_after_the_threshold_reports_how_long_it_lasted() {
        let mut away = Away::default();
        for idle in [10, 100, 200, 400] {
            assert_eq!(away.step(idle, 180), None);
        }
        assert_eq!(away.step(1, 180), Some(400));
        assert_eq!(away.step(2, 180), None, "una sola vez");
    }

    #[test]
    fn a_short_pause_is_not_an_absence() {
        let mut away = Away::default();
        for idle in [10, 120, 170, 1] {
            assert_eq!(away.step(idle, 180), None);
        }
    }

    #[test]
    fn only_folders_can_be_opened() {
        assert!(folder(&std::env::temp_dir().to_string_lossy()).is_ok());
        assert!(folder("no/existe/esta/carpeta").is_err());
        assert!(folder(file!()).is_err());
    }
}
