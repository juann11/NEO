// Proyectos recientes (el reverso de la tarjeta de notificaciones) y el resumen de "Mientras no estabas".
// De los proyectos se guardan solo las rutas de las carpetas donde trabajaron los agentes.

import type { BotStateName } from "./layout";

const MAX_PROJECTS = 8;

const trimSlash = (path: string) => path.replace(/[\\/]+$/, "");
const same = (a: string, b: string) => trimSlash(a).toLowerCase() === trimSlash(b).toLowerCase();

/** La carpeta de una sesión, la primera de la lista; nunca la carpeta personal ni la raíz de un disco. */
export function rememberProject(list: string[], cwd: string | null | undefined, home: string): string[] {
  const path = trimSlash(cwd ?? "");
  const userRoot = /^[A-Za-z]:[\\/]Users[\\/][^\\/]+$/i.test(path) || /^\/(home\/[^/]+|root)$/.test(path);
  if (!path || /^[A-Za-z]:$/.test(path) || userRoot || (home && same(path, home))) return list;
  return [path, ...list.filter((p) => !same(p, path))].slice(0, MAX_PROJECTS);
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
