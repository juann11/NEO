// La isla responde a Inicio: le cuenta sus sesiones y abre la que se pulse allí.

import { emitToWindow, onEvent } from "../core/bridge";
import { HOME_ASK, HOME_OPEN, HOME_SESSIONS, sessionSummaries } from "../core/home-feed";
import { State } from "../core/state";
import { openTarget } from "./targets";

const HUB_WINDOW = "settings";

export function registerHomeFeed() {
  void onEvent<null>(HOME_ASK, () => void emitToWindow(HUB_WINDOW, HOME_SESSIONS, sessionSummaries(State.tasks)));
  void onEvent<string>(HOME_OPEN, (id) => openTarget(State.tasks.find((task) => task.id === id) ?? null));
}
