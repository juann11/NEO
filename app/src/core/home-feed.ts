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
