// Cómo reacciona NEO a la notificación de cada app (sonido, gesto y traje) y las horas de silencio.
// Se eligen en la ventana, Notificaciones → Reacciones, y se guardan en los ajustes.

import { SOUND_NAMES } from "./sound";
import { OUTFIT_SELECTIONS } from "../neo/wardrobe";

/** "" en una parte = la de siempre; "none" = nada (sin sonido, sin gesto, sin traje). */
export interface NotificationReaction {
  sound: string;
  emote: string;
  /** "" = lo que ya lleva puesto. */
  outfit: string;
}

export interface QuietHours {
  enabled: boolean;
  /** "HH:MM", hora local. */
  from: string;
  to: string;
}

/** La ventana le pide a la isla una notificación de prueba con este evento. */
export const NOTIFICATION_TRY = "notification-try";

export const REACTION_EMOTES = ["surprised", "love", "happy", "proud", "wink", "yawn", "annoyed"] as const;

export const DEFAULT_REACTION: NotificationReaction = { sound: "pop", emote: "surprised", outfit: "" };

const valid = (value: string, allowed: readonly string[]) => value === "none" || allowed.includes(value);

export function reactionFor(appId: string, reactions: Record<string, NotificationReaction>): NotificationReaction {
  const key = Object.keys(reactions).find((k) => k.toLowerCase() === appId.toLowerCase());
  const own = key ? reactions[key] : null;
  const outfits = OUTFIT_SELECTIONS.filter((o) => o !== "auto");
  return {
    sound: own?.sound && valid(own.sound, SOUND_NAMES) ? own.sound : DEFAULT_REACTION.sound,
    emote: own?.emote && valid(own.emote, REACTION_EMOTES) ? own.emote : DEFAULT_REACTION.emote,
    outfit: own?.outfit && valid(own.outfit, outfits) ? own.outfit : DEFAULT_REACTION.outfit,
  };
}

const minutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Dentro de las horas de silencio, que pueden cruzar la medianoche (22:00 → 08:00). */
export function isQuiet(now: Date, quiet: QuietHours): boolean {
  const from = minutes(quiet.from);
  const to = minutes(quiet.to);
  if (!quiet.enabled || from === null || to === null || from === to) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return from < to ? t >= from && t < to : t >= from || t < to;
}
