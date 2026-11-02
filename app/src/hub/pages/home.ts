// Inicio: tus tarjetas, en el orden y el ancho que quieras. "Personalizar" deja
// arrastrarlas, moverlas con flechas, ensancharlas, quitarlas y agregar otras.
// Lo que cambia solo (notificaciones y sesiones) se pide mientras la página está a la vista.

import { h, clear } from "../../views/dom";
import { t } from "../../i18n/i18n";
import { Bridge, emitToWindow, onEvent } from "../../core/bridge";
import { FlowBridge } from "../../core/flow";
import { availablePills } from "../../core/pills";
import {
  DEFAULT_HOME_CARDS, addCard, cleanCards, missingCards, moveCard, removeCard, toggleWide,
  type HomeCard, type HomeCardId,
} from "../../core/home-cards";
import { HOME_ASK, HOME_OPEN, HOME_SESSIONS, ago, type HomeSession } from "../../core/home-feed";
import type { BotStateName } from "../../core/layout";
import type { HubContext, PageId } from "../shell";
import type { SystemToast } from "../../island/system-notifications";
import { dressNeo } from "./look";
import { emptyState, isWindowShown, liveNeo } from "../hero";
import { button, icon, iconButton, number, shortCount, toggle } from "../ui";

const REFRESH_MS = 3000;
const HOW_MANY_TOASTS = 6;
const ISLAND_WINDOW = "island";

/** Lo que dibuja una tarjeta: `live` se llama cada pocos segundos. */
interface CardView {
  el: HTMLElement;
  live?: () => void;
  /** Una página a la que lleva el enlace de la cabecera. */
  link?: [string, PageId];
}

interface Feed {
  /** La tarjeta de sesiones, para recibir lo que responda la isla. */
  onSessions?: (list: HomeSession[]) => void;
  /** Refresca las tarjetas ya, sin esperar al siguiente turno. */
  tick?: () => void;
}

/** Redibuja solo si cambió: la lista no parpadea y lo que tenga el foco no lo pierde. */
export function drawWhenChanged(el: HTMLElement) {
  let last = "";
  return (key: unknown, draw: () => void) => {
    const next = JSON.stringify(key);
    if (next === last) return;
    last = next;
    clear(el);
    draw();
  };
}

function agoText(arrival: number): string {
  const when = ago(arrival, Date.now() / 1000);
  if (!when) return "";
  if (when.unit === "now") return t("Just now");
  if (when.unit === "min") return t("{0} min", { 0: when.n });
  return when.unit === "h" ? t("{0} h", { 0: when.n }) : t("{0} d", { 0: when.n });
}

/** Una notificación: su app, título y texto; al pulsarla se abre la app. */
export function toastRow(toast: SystemToast): HTMLElement {
  return h("button", { class: "home-row", title: t("Open"), onclick: () => void Bridge.openNotificationApp(toast.appId) },
    h("span", { class: "home-badge", text: toast.app.slice(0, 1).toUpperCase() }),
    h("span", { class: "home-text" },
      h("span", { class: "home-title", text: toast.title }),
      h("span", { class: "home-sub", text: toast.body || toast.app }),
    ),
    h("span", { class: "home-meta" }, h("span", { text: toast.app }), h("span", { text: agoText(toast.arrival) })),
  );
}

function notificationsCard(ctx: HubContext, feed: Feed): CardView {
  const el = h("div", { class: "home-list" });
  const redraw = drawWhenChanged(el);
  const refresh = async () => {
    if (!ctx.settings().systemNotifications) {
      redraw("off", () => el.append(
        h("div", { class: "hub-note", text: t("Turn this on and your Windows notifications reach NEO.") }),
        button(t("Turn on"), () => {
          ctx.changeSettings((s) => (s.systemNotifications = true));
          feed.tick?.();
        }, "primary", true),
      ));
      return;
    }
    const toasts = (await Bridge.recentSystemNotifications(HOW_MANY_TOASTS)) ?? [];
    redraw(toasts, () => {
      if (!toasts.length) {
        el.append(emptyState(t("No notifications yet."), "sleeping"));
        return;
      }
      for (const toast of toasts) el.append(toastRow(toast));
    });
  };
  void refresh();
  return { el, live: () => void refresh(), link: [t("See all"), "notifications"] };
}

const STATE_TEXT: Partial<Record<BotStateName, () => string>> = {
  working: () => t("Working"),
  thinking: () => t("Thinking"),
  searching: () => t("Thinking"),
  approval: () => t("Waiting for you"),
  question: () => t("Waiting for you"),
  error: () => t("Error"),
};

const STATE_COLOR: Partial<Record<BotStateName, string>> = {
  working: "#3B9EFF",
  thinking: "#A78BFA",
  searching: "#A78BFA",
  approval: "#FB923C",
  question: "#FB923C",
  error: "#FF453A",
};

function sessionsCard(feed: Feed): CardView {
  const el = h("div", { class: "home-list" });
  const redraw = drawWhenChanged(el);
  feed.onSessions = (list) => redraw(list, () => {
    if (!list.length) {
      el.append(emptyState(t("No active sessions right now."), "sleeping"));
      return;
    }
    for (const session of list) {
      el.append(h("button", { class: "home-row", onclick: () => void emitToWindow(ISLAND_WINDOW, HOME_OPEN, session.id) },
        h("i", { class: "dot", style: `background:${STATE_COLOR[session.state] ?? "#4ADE80"}` }),
        h("span", { class: "home-text" },
          h("span", { class: "home-title", text: session.project ? `${session.name} · ${session.project}` : session.name }),
          h("span", { class: "home-sub", text: session.line || (STATE_TEXT[session.state]?.() ?? t("Idle")) }),
        ),
        h("span", { class: "home-meta" }, h("span", { text: STATE_TEXT[session.state]?.() ?? t("Idle") })),
      ));
    }
  });
  feed.onSessions([]);
  return { el, live: () => void emitToWindow(ISLAND_WINDOW, HOME_ASK), link: [t("Agents"), "agents"] };
}

function agentsCard(): CardView {
  const el = h("div", { class: "home-list" });
  void Promise.all([Bridge.hooksStatus(), Bridge.agentHooksList()]).then(([claude, others]) => {
    const agents = [{ name: "Claude Code", installed: claude?.installed ?? false }, ...(others ?? [])];
    const connected = agents.filter((a) => a.installed);
    el.append(
      h("div", { class: "home-big" }, h("b", { text: number(connected.length) }), h("span", { text: t("of {0} connected", { 0: agents.length }) })),
      connected.length
        ? h("div", { class: "hub-chips" }, ...connected.map((a) => h("span", { class: "hub-chip", text: a.name })))
        : h("div", { class: "hub-note", text: t("Connect one and its sessions appear here.") }),
    );
  });
  return { el, link: [t("Manage"), "agents"] };
}

function statusCard(ctx: HubContext, feed: Feed): CardView {
  const neo = h("canvas", { class: "home-neo" }) as HTMLCanvasElement;
  dressNeo(liveNeo(neo), ctx.settings());
  const flag = (text: string, on: boolean, change: (v: boolean) => void) =>
    h("label", { class: "home-flag" }, h("span", { text }), toggle(on, change));
  const s = ctx.settings();
  const notifications = flag(t("Windows notifications"), s.systemNotifications, (v) => {
    ctx.changeSettings((n) => (n.systemNotifications = v));
    feed.tick?.();
  });
  const el = h("div", { class: "home-status" },
    neo,
    h("div", { class: "home-flags" },
      flag(t("Sound"), s.soundEnabled, (v) => ctx.changeSettings((n) => (n.soundEnabled = v))),
      notifications,
      flag(t("Launch at startup"), s.autostart, (v) => ctx.changeSettings((n) => (n.autostart = v))),
      h("div", { class: "home-sub", text: `NEO ${ctx.version}` }),
    ),
  );
  const live = () => {
    const on = ctx.settings().systemNotifications;
    const button = notifications.querySelector("button");
    button?.classList.toggle("on", on);
    button?.setAttribute("aria-pressed", String(on));
  };
  return { el, live, link: [t("Settings"), "general"] };
}

function servicesCard(ctx: HubContext): CardView {
  const active = availablePills().filter((p) => ctx.settings().activeIntegrations.includes(p.id));
  const el = h("div", { class: "home-list" });
  if (active.length) {
    el.append(h("div", { class: "hub-chips" }, ...active.map((p) => h("span", { class: "hub-chip", text: p.name }))));
  } else {
    el.append(h("div", { class: "hub-note", text: t("Add the ones you use and they show up in the island.") }));
  }
  return { el, link: [t("Manage"), "integrations"] };
}

function dictationCard(ctx: HubContext): CardView {
  const el = h("div", { class: "home-list" });
  void FlowBridge.stats().then((stats) => {
    el.append(
      h("div", { class: "home-big" }, h("b", { text: shortCount(stats?.week.words ?? 0) }), h("span", { text: t("words this week") })),
      h("div", { class: "hub-note", text: ctx.status.prefs.enabled ? t("Streak: {0} days", { 0: stats?.streak ?? 0 }) : t("Dictation is off") }),
    );
  });
  return { el, link: [t("Open"), "dictation"] };
}

const CARD_INFO: Record<HomeCardId, { icon: string; title: () => string }> = {
  notifications: { icon: "bell", title: () => t("Notifications") },
  sessions: { icon: "terminal", title: () => t("Active sessions") },
  agents: { icon: "grid", title: () => t("Agents") },
  status: { icon: "gear", title: () => t("NEO status") },
  services: { icon: "puzzle", title: () => t("Services") },
  dictation: { icon: "mic", title: () => t("Dictation") },
};

export async function homePage(page: HTMLElement, ctx: HubContext) {
  let cards = cleanCards(ctx.settings().homeCards);
  let editing = false;
  const feed: Feed = {};
  const built = new Map<string, { section: HTMLElement; view: CardView }>();
  const grid = h("div", { class: "home-grid" });
  const extras = h("div", { class: "home-extras" });

  const build = (id: HomeCardId): CardView => {
    switch (id) {
      case "notifications": return notificationsCard(ctx, feed);
      case "sessions": return sessionsCard(feed);
      case "agents": return agentsCard();
      case "status": return statusCard(ctx, feed);
      case "services": return servicesCard(ctx);
      case "dictation": return dictationCard(ctx);
    }
  };

  const change = (next: HomeCard[]) => {
    cards = next;
    ctx.changeSettings((s) => (s.homeCards = next));
    draw();
  };

  const startDrag = (e: PointerEvent, id: string) => {
    const section = built.get(id)?.section;
    if (!section) return;
    e.preventDefault();
    section.classList.add("dragging");
    let order = cards;
    const onMove = (m: PointerEvent) => {
      const over = document.elementFromPoint(m.clientX, m.clientY)?.closest<HTMLElement>(".home-card");
      const to = over ? order.findIndex((c) => c.id === over.dataset.id) : -1;
      if (to < 0 || order[to].id === id) return;
      order = moveCard(order, id, to);
      grid.replaceChildren(...order.flatMap((c) => built.get(c.id)?.section ?? []));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      section.classList.remove("dragging");
      change(order);
    };
    // En la ventana: mover la tarjeta en la página suelta el puntero del asa.
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const tools = (card: HomeCard, index: number) => {
    const left = iconButton("chevron", t("Move earlier"), () => change(moveCard(cards, card.id, index - 1)));
    left.classList.add("flip");
    const handle = h("span", { class: "home-handle", title: t("Drag to move") }, icon("grip"));
    handle.addEventListener("pointerdown", (e) => startDrag(e, card.id));
    return h("div", { class: "home-tools" },
      handle,
      left,
      iconButton("chevron", t("Move later"), () => change(moveCard(cards, card.id, index + 1))),
      iconButton("window", card.wide ? t("Make narrower") : t("Make wider"), () => change(toggleWide(cards, card.id))),
      iconButton("x", t("Remove"), () => change(removeCard(cards, card.id))),
    );
  };

  function sectionOf(card: HomeCard, index: number): HTMLElement {
    const id = card.id as HomeCardId;
    let entry = built.get(id);
    if (!entry) {
      const view = build(id);
      entry = { view, section: h("section", { class: "home-card", "data-id": id }) };
      built.set(id, entry);
      entry.view.live?.();
    }
    const { section, view } = entry;
    const link = view.link;
    const head = h("header", {},
      icon(CARD_INFO[id].icon),
      h("h2", { text: CARD_INFO[id].title() }),
      editing ? tools(card, index) : link ? h("button", { class: "hub-link", text: link[0], onclick: () => ctx.navigate(link[1]) }) : null,
    );
    section.replaceChildren(head, view.el);
    section.classList.toggle("wide", card.wide);
    return section;
  }

  function draw() {
    page.classList.toggle("editing", editing);
    grid.replaceChildren(...cards.map(sectionOf));
    clear(extras);
    if (!cards.length && !editing) extras.append(emptyState(t("Nothing here yet. Use Customize to add cards.")));
    if (!editing) return;
    const missing = missingCards(cards);
    if (missing.length) extras.append(h("div", { class: "hub-label", text: t("Add a card") }));
    extras.append(h("div", { class: "home-add" },
      ...missing.map((id) => h("button", { class: "home-tile", onclick: () => change(addCard(cards, id)) },
        icon("plus"), h("span", { text: CARD_INFO[id].title() }),
      )),
    ));
    extras.append(button(t("Reset to defaults"), () => change(DEFAULT_HOME_CARDS), "", true));
  }

  const customize = button(t("Customize"), () => {
    editing = !editing;
    customize.textContent = editing ? t("Done") : t("Customize");
    draw();
  }, "", true);

  const name = ctx.status.userName;
  page.append(ctx.hero("home", name ? t("Hello {0}", { 0: name }) : t("Hello"), t("What's going on, the way you like it."), [customize]), grid, extras);

  const stop = await onEvent<HomeSession[]>(HOME_SESSIONS, (list) => feed.onSessions?.(list));
  feed.tick = () => {
    for (const { view } of built.values()) view.live?.();
  };
  draw();
  const timer = window.setInterval(() => {
    if (isWindowShown()) feed.tick?.();
  }, REFRESH_MS);
  ctx.onLeave = () => {
    window.clearInterval(timer);
    stop();
  };
}
