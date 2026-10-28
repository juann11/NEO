// Notificaciones de Windows → la isla (src-tauri/src/system_notifications.rs): cada toast nuevo abre
// la isla en su tarjeta, salvo en pausa o mientras un permiso espera respuesta, que va primero.
// La isla guarda las 10 últimas para recorrerlas desde la tarjeta.

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

const MAX_HISTORY = 10;

/** Las últimas notificaciones, la más nueva primero, y cuál enseña la tarjeta. */
export const SystemNotifications = {
  history: [] as SystemToast[],
  index: 0,
  get current(): SystemToast | null {
    return this.history[this.index] ?? null;
  },
  push(toast: SystemToast) {
    this.history = [toast, ...this.history].slice(0, MAX_HISTORY);
    this.index = 0;
  },
  /** ‹ : una más vieja. */
  older() {
    this.index = Math.min(this.index + 1, this.history.length - 1);
  },
  /** › : una más nueva. */
  newer() {
    this.index = Math.max(this.index - 1, 0);
  },
};

export function registerSystemNotifications(island: SystemNotificationsHost) {
  void onEvent<SystemToast>("system-notification", (toast) => {
    if (State.paused || State.pendingApproval) return;
    SystemNotifications.push(toast);
    island.alert("notification");
    island.emote("surprised");
    Sound.play("pop");
  });
}
