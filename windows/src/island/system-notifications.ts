// Notificaciones de Windows → la isla (src-tauri/src/system_notifications.rs): cada toast nuevo abre
// la isla en su tarjeta, salvo en pausa o mientras un permiso espera respuesta, que va primero.

import { onEvent } from "../core/bridge";
import { Sound } from "../core/sound";
import { State } from "../core/state";
import type { BotEmoteName, IslandViewName } from "../core/layout";

/** Un toast tal como lo manda Rust. */
export interface SystemToast {
  id: number;
  appId: string;
  app: string;
  title: string;
  body: string;
}

export interface SystemNotificationsHost {
  alert(view: IslandViewName): void;
  emote(name: BotEmoteName): void;
}

/** El último toast, el que enseña la tarjeta. */
export const SystemNotifications = { current: null as SystemToast | null };

export function registerSystemNotifications(island: SystemNotificationsHost) {
  void onEvent<SystemToast>("system-notification", (toast) => {
    if (State.paused || State.pendingApproval) return;
    SystemNotifications.current = toast;
    island.alert("notification");
    island.emote("surprised");
    Sound.play("pop");
  });
}
