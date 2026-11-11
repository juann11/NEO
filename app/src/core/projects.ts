// Proyectos de la isla (el reverso de la tarjeta de notificaciones): solo las carpetas que agrega
// el usuario, en su orden. Y el resumen de "Mientras no estabas".

import type { BotStateName } from "./layout";

const trimSlash = (path: string) => path.replace(/[\\/]+$/, "");
const same = (a: string, b: string) => trimSlash(a).toLowerCase() === trimSlash(b).toLowerCase();

/** Una carpeta elegida con el +: va al final, sin repetirse. */
export function addProject(list: string[], folder: string | null | undefined): string[] {
  const path = trimSlash(folder ?? "");
  if (!path || list.some((p) => same(p, path))) return list;
  return [...list, path];
}

export function removeProject(list: string[], folder: string): string[] {
  return list.filter((p) => !same(p, folder));
}

export function projectName(path: string): string {
  return trimSlash(path).split(/[\\/]/).pop() || path;
}

export interface AwaySummary {
  notifications: number;
  apps: { app: string; count: number }[];
  waiting: string[];
  finished: string[];
  failed: string[];
}

/** Lo que pasó desde `since` (segundos Unix): null si no pasó nada. */
export function awaySummary(
  toasts: { appId: string; app: string; arrival: number }[],
  tasks: { name: string; state: BotStateName; isIntegration: boolean; sessionId?: string | null }[],
  since: number,
): AwaySummary | null {
  const fresh = toasts.filter((t) => t.arrival >= since);
  const apps: { app: string; count: number }[] = [];
  for (const toast of fresh) {
    const row = apps.find((a) => a.app === toast.app);
    if (row) row.count++;
    else apps.push({ app: toast.app, count: 1 });
  }
  apps.sort((a, b) => b.count - a.count);
  const sessions = tasks.filter((t) => t.sessionId && !t.isIntegration);
  const named = (states: BotStateName[]) => sessions.filter((t) => states.includes(t.state)).map((t) => t.name);
  const summary = {
    notifications: fresh.length,
    apps,
    waiting: named(["approval", "question"]),
    finished: named(["finished"]),
    failed: named(["error"]),
  };
  const empty = !summary.notifications && !summary.waiting.length && !summary.finished.length && !summary.failed.length;
  return empty ? null : summary;
}
