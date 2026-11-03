// "Mientras no estabas": Rust avisa al volver tras un rato sin usar el PC (away.rs) y la
// tarjeta de la derecha de la isla enseña lo que pasó: notificaciones y agentes.

import { onEvent } from "../core/bridge";
import { State } from "../core/state";
import { awaySummary } from "../core/projects";
import { SystemNotifications } from "./system-notifications";
import type { IslandViewName } from "../core/layout";

export function registerAway(island: { alert(view: IslandViewName): void }) {
  void onEvent<number>("user-back", (seconds) => {
    if (State.paused) return;
    const summary = awaySummary(SystemNotifications.history, State.tasks, Date.now() / 1000 - seconds);
    if (!summary) return;
    State.awayReport = { seconds, summary };
    island.alert("overview");
  });
}
