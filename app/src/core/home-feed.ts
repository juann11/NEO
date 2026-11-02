// Inicio enseña las sesiones de la isla: la ventana pregunta y la isla responde,
// solo mientras Inicio está a la vista.

import type { BotStateName } from "./layout";
import type { AgentTask } from "./state";

export const HOME_ASK = "home-ask";
export const HOME_SESSIONS = "home-sessions";
export const HOME_OPEN = "home-open";

export interface HomeSession {
  id: string;
  name: string;
  color: string;
  state: BotStateName;
  /** La carpeta del proyecto. */
  project: string;
  line: string;
}

const waitsForYou = (state: BotStateName) => state === "approval" || state === "question";

export function sessionSummaries(tasks: AgentTask[]): HomeSession[] {
  return tasks
    .filter((task) => task.sessionId && !task.isIntegration)
    .map((task) => ({
      id: task.id,
      name: task.name,
      color: task.color,
      state: task.state,
      project: task.sessionCwd?.split(/[\\/]/).filter(Boolean).pop() ?? "",
      line: task.finalLine ?? task.steps[task.stepIndex] ?? "",
    }))
    .sort((a, b) => Number(waitsForYou(b.state)) - Number(waitsForYou(a.state)));
}

/** Cuánto hace, para "hace 5 min": null si Windows no dio la hora. */
export function ago(arrival: number, now: number): { unit: "now" | "min" | "h" | "d"; n: number } | null {
  if (arrival <= 0) return null;
  const minutes = Math.floor(Math.max(0, now - arrival) / 60);
  if (minutes < 1) return { unit: "now", n: 0 };
  if (minutes < 60) return { unit: "min", n: minutes };
  if (minutes < 1440) return { unit: "h", n: Math.floor(minutes / 60) };
  return { unit: "d", n: Math.floor(minutes / 1440) };
}

const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Las notificaciones de una app (o de todas) que tienen la búsqueda en la app, el título o el texto. */
export function filterToasts<T extends { appId: string; app: string; title: string; body: string }>(
  toasts: T[], query: string, appId: string | null,
): T[] {
  const words = plain(query).split(/\s+/).filter(Boolean);
  return toasts.filter((toast) => {
    if (appId && toast.appId !== appId) return false;
    const text = plain(`${toast.app} ${toast.title} ${toast.body}`);
    return words.every((word) => text.includes(word));
  });
}

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** El día de una notificación, para agruparlas: "today", "yesterday" o la fecha (año-mes-día, hora local). */
export function dayOf(arrival: number, now: number): string {
  if (arrival <= 0) return "unknown";
  const today = new Date(now * 1000);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const day = localDay(new Date(arrival * 1000));
  if (day === localDay(today)) return "today";
  return day === localDay(yesterday) ? "yesterday" : day;
}
