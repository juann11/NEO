// Notificaciones de Windows → la isla (src-tauri/src/system_notifications.rs): cada toast nuevo abre
// la isla en su tarjeta, salvo en pausa o mientras un permiso espera respuesta, que va primero.
// Cada app tiene su reacción (core/reactions.ts); en las horas de silencio solo se guarda.
// La isla guarda las 10 últimas para recorrerlas desde la tarjeta.

import { Bridge, onEvent } from "../core/bridge";
import { Sound } from "../core/sound";
import { State } from "../core/state";
import { NOTIFICATION_TRY, isQuiet, reactionFor } from "../core/reactions";
import { dismissToast } from "../core/swipe";
import type { BotEmoteName, IslandViewName } from "../core/layout";
import type { Outfit } from "../neo/wardrobe";

/** Un toast tal como lo manda Rust. */
export interface SystemToast {
  id: number;
  appId: string;
  app: string;
  title: string;
  body: string;
  /** Segundos Unix; 0 si Windows no lo dice. */
  arrival: number;
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
  /** Abierta o eliminada: sale de la lista, sube la siguiente y no vuelve al reiniciar NEO. */
  forget(id: number) {
    this.history = this.history.filter((t) => t.id !== id);
    this.index = Math.min(this.index, Math.max(0, this.history.length - 1));
    State.settings.dismissedNotifications = dismissToast(State.settings.dismissedNotifications, id);
    void Bridge.saveSettings(State.settings);
  },
  /** La papelera de la tarjeta: todas fuera de una vez, y ninguna vuelve. */
  forgetAll() {
    let dismissed = State.settings.dismissedNotifications;
    for (const toast of this.history) dismissed = dismissToast(dismissed, toast.id);
    State.settings.dismissedNotifications = dismissed;
    this.history = [];
    this.index = 0;
    void Bridge.saveSettings(State.settings);
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
  /** `trying`: el botón Probar de la ventana, que reacciona aunque sea hora de silencio. */
  const react = (toast: SystemToast, trying = false) => {
    if (!trying && (State.paused || State.pendingApproval)) return;
    SystemNotifications.push(toast);
    if (!trying && isQuiet(new Date(), State.settings.quietHours)) return;
    const reaction = reactionFor(toast.appId, State.settings.notificationReactions);
    island.alert("notification");
    if (reaction.emote !== "none") island.emote(reaction.emote as BotEmoteName);
    if (reaction.sound !== "none") Sound.play(reaction.sound);
  };
  void onEvent<SystemToast>("system-notification", (toast) => react(toast));
  void Bridge.recentSystemNotifications(MAX_HISTORY).then((list) => {
    if (list?.length && !SystemNotifications.history.length) SystemNotifications.history = list;
  });
  void onEvent<SystemToast>(NOTIFICATION_TRY, (toast) => react(toast, true));
}

/** El traje de la app de la tarjeta que se ve: null si su reacción no cambia el traje. */
export function notificationOutfit(): Outfit | null {
  const toast = SystemNotifications.current;
  const outfit = toast ? reactionFor(toast.appId, State.settings.notificationReactions).outfit : "";
  return outfit ? (outfit as Outfit) : null;
}
