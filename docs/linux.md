# NEO en Linux

La misma app compila para Linux. Lo que cambia está en `app/src-tauri/src/platform/` y, para `neo-hook`, en `app/hook/src/unix.rs`.

## Compilar

En Debian o Ubuntu:

```bash
sudo apt install build-essential pkg-config \
  libwebkit2gtk-4.1-dev libgtk-layer-shell-dev libayatana-appindicator3-dev \
  librsvg2-dev libssl-dev libdbus-1-dev patchelf \
  gstreamer1.0-plugins-base gstreamer1.0-plugins-good

cd app
npm install
npm run tauri dev      # desarrollo
npm run pack           # AppImage, .deb y .rpm en app/release/
```

## Diferencias con Windows

- **La isla** es una capa `gtk-layer-shell` sobre el borde superior en KDE Plasma, COSMIC, Hyprland, Sway y otros compositores wlroots. GNOME no tiene layer-shell, así que ahí corre por XWayland.
- **Variables de entorno:** `NEO_X11=0` mantiene la ventana Wayland nativa, `NEO_DOCK=0` usa una ventana normal en vez de dock y `NEO_LAYER_SHELL=0` desactiva la capa.
- **Los ojos** solo siguen al ratón cuando está sobre la isla: Wayland no da la posición del cursor en otro sitio.
- **NEO en el escritorio** no puede salir de la isla en GNOME sobre Wayland.
- **Hooks:** `~/.local/share/neo/bin/neo-hook` y un socket en `$XDG_RUNTIME_DIR/neo.sock`.
- **Atajos globales:** en X11 son capturas de teclas; en Wayland, el portal GlobalShortcuts de `xdg-desktop-portal` (KDE Plasma 6, GNOME 48+, Hyprland, COSMIC). Si no hay portal, Ajustes te da comandos como `neo --shortcut openChat` para enlazarlos en tu escritorio.
- **Claves:** Secret Service (GNOME Keyring, KWallet).
- **Spotify:** por MPRIS, sin consultas periódicas.
- **Notificaciones de Windows:** no aplican.
