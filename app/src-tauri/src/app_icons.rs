// El logo de la app que mandó una notificación, y su color, para que en la isla se sepa de
// un vistazo de quién es. Windows lo da por el id de la app (shell:AppsFolder\<id>); la isla
// lo pinta en un lienzo y guarda el resultado mientras está abierta.

use serde::Serialize;

/// Lado del logo, en píxeles.
#[cfg(windows)]
const SIZE: i32 = 32;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AppIcon {
    pub size: u32,
    /// Píxeles RGBA sin premultiplicar, fila a fila.
    pub rgba: Vec<u8>,
    /// "#RRGGBB": el color que más pesa en el logo.
    pub color: String,
}

/// El color del logo: la media de sus píxeles visibles con más color; si es todo gris, la de todos.
pub fn dominant_color(rgba: &[u8]) -> Option<[u8; 3]> {
    let visible: Vec<[u8; 3]> = rgba.chunks_exact(4).filter(|p| p[3] > 128).map(|p| [p[0], p[1], p[2]]).collect();
    let saturation = |p: &[u8; 3]| p.iter().max().unwrap() - p.iter().min().unwrap();
    let colourful: Vec<[u8; 3]> = visible.iter().copied().filter(|p| saturation(p) > 60).collect();
    let pick = if colourful.is_empty() { &visible } else { &colourful };
    if pick.is_empty() {
        return None;
    }
    let mut sum = [0u32; 3];
    for p in pick {
        for i in 0..3 {
            sum[i] += u32::from(p[i]);
        }
    }
    let n = pick.len() as u32;
    Some([(sum[0] / n) as u8, (sum[1] / n) as u8, (sum[2] / n) as u8])
}

#[cfg(windows)]
fn read_icon(app_id: &str) -> Option<Vec<u8>> {
    use windows::core::HSTRING;
    use windows::Win32::Foundation::SIZE as WinSize;
    use windows::Win32::Graphics::Gdi::{
        DeleteObject, GetDC, GetDIBits, ReleaseDC, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE};
    use windows::Win32::UI::Shell::{IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF_ICONONLY};

    // SAFETY: llamadas COM/GDI con sus tamaños y liberando el bitmap y el DC que se piden.
    unsafe {
        // Un hilo de Tauri puede estar ya en otro apartamento: se usa el que haya.
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
        let name = HSTRING::from(format!(r"shell:AppsFolder\{app_id}"));
        let factory: IShellItemImageFactory = SHCreateItemFromParsingName(&name, None).ok()?;
        let bitmap = factory.GetImage(WinSize { cx: SIZE, cy: SIZE }, SIIGBF_ICONONLY).ok()?;
        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: SIZE,
                biHeight: -SIZE,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut bgra = vec![0u8; (SIZE * SIZE * 4) as usize];
        let dc = GetDC(None);
        let rows = GetDIBits(dc, bitmap, 0, SIZE as u32, Some(bgra.as_mut_ptr().cast()), &mut info, DIB_RGB_COLORS);
        ReleaseDC(None, dc);
        let _ = DeleteObject(bitmap.into());
        (rows == SIZE).then_some(bgra)
    }
}

/// BGRA premultiplicado (lo que da Windows) → RGBA normal (lo que pinta el lienzo).
fn to_rgba(mut bgra: Vec<u8>) -> Vec<u8> {
    for p in bgra.chunks_exact_mut(4) {
        let a = u32::from(p[3]);
        let fix = |c: u8| if a == 0 { 0 } else { (u32::from(c) * 255 / a).min(255) as u8 };
        let (b, g, r) = (fix(p[0]), fix(p[1]), fix(p[2]));
        p[0] = r;
        p[1] = g;
        p[2] = b;
    }
    bgra
}

#[cfg(windows)]
#[tauri::command]
pub fn notification_app_icon(app_id: String) -> Option<AppIcon> {
    let rgba = to_rgba(read_icon(&app_id)?);
    let [r, g, b] = dominant_color(&rgba)?;
    Some(AppIcon { size: SIZE as u32, rgba, color: format!("#{r:02X}{g:02X}{b:02X}") })
}

/// En Linux no hay de dónde sacarlo: la isla pone la inicial con un color.
#[cfg(not(windows))]
#[tauri::command]
pub fn notification_app_icon(_app_id: String) -> Option<AppIcon> {
    let _ = to_rgba;
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn px(r: u8, g: u8, b: u8, a: u8) -> [u8; 4] {
        [r, g, b, a]
    }

    #[test]
    fn the_colour_of_a_logo_is_its_coloured_part_not_its_white_or_its_transparent_edge() {
        let mut rgba = Vec::new();
        for _ in 0..10 {
            rgba.extend(px(37, 211, 102, 255));
        }
        for _ in 0..30 {
            rgba.extend(px(255, 255, 255, 255));
        }
        for _ in 0..50 {
            rgba.extend(px(200, 0, 0, 0));
        }
        assert_eq!(dominant_color(&rgba), Some([37, 211, 102]));
    }

    #[test]
    fn a_grey_logo_keeps_its_grey_and_an_empty_one_has_none() {
        let rgba: Vec<u8> = [px(90, 90, 90, 255), px(110, 110, 110, 255)].concat();
        assert_eq!(dominant_color(&rgba), Some([100, 100, 100]));
        assert_eq!(dominant_color(&[0, 0, 0, 0]), None);
    }

    #[test]
    fn windows_pixels_come_back_in_order_and_unpremultiplied() {
        assert_eq!(to_rgba(vec![10, 20, 64, 128]), vec![127, 39, 19, 128]);
        assert_eq!(to_rgba(vec![1, 2, 3, 0]), vec![0, 0, 0, 0]);
    }
}
