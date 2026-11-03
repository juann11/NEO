// Notificaciones: las que Windows guarda, con buscador, filtro por app y agrupadas por día.
// Salen de la base de Windows (system_notifications.rs): NEO no guarda copia.

import { h, clear } from "../../views/dom";
import { language, t } from "../../i18n/i18n";
import { Bridge, emitToWindow } from "../../core/bridge";
import { dayOf, filterToasts } from "../../core/home-feed";
import { NOTIFICATION_TRY, REACTION_EMOTES, type NotificationReaction } from "../../core/reactions";
import { SOUND_NAMES } from "../../core/sound";
import { OUTFIT_KEYS, OUTFIT_SELECTIONS } from "../../neo/wardrobe";
import type { SystemToast } from "../../island/system-notifications";
import type { HubContext } from "../shell";
import { emptyState, isWindowShown } from "../hero";
import { button, segmented, select, toggle } from "../ui";
import { drawWhenChanged, toastRow } from "./home";

const REFRESH_MS = 3000;
const HOW_MANY = 100;

function dayTitle(day: string): string {
  if (day === "today") return t("Today");
  if (day === "yesterday") return t("Yesterday");
  if (day === "unknown") return t("Earlier");
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(language(), { weekday: "long", day: "numeric", month: "long" });
}

const EMOTE_LABELS: Record<string, () => string> = {
  surprised: () => t("Surprised"),
  love: () => t("Love"),
  happy: () => t("Happy"),
  proud: () => t("Proud"),
  wink: () => t("Wink"),
  yawn: () => t("Yawn"),
  annoyed: () => t("Annoyed"),
};

/** Horas de silencio y, por app, su sonido, su gesto y su traje, con un botón para probarlos en la isla. */
function reactionsPanel(ctx: HubContext): HTMLElement {
  const quiet = ctx.settings().quietHours;
  const time = (value: string, change: (v: string) => void) => {
    const input = h("input", { class: "hub-input react-time", type: "time", value }) as HTMLInputElement;
    input.addEventListener("change", () => input.value && change(input.value));
    return input;
  };
  const setQuiet = (change: (q: typeof quiet) => void) =>
    ctx.changeSettings((s) => {
      s.quietHours = { ...s.quietHours };
      change(s.quietHours);
    });
  const quietCard = h("div", { class: "hub-card" },
    h("div", { class: "react-head" },
      h("h2", { class: "look-title", text: t("Quiet hours") }),
      toggle(quiet.enabled, (on) => setQuiet((q) => (q.enabled = on))),
    ),
    h("div", { class: "react-times" },
      h("label", {}, h("span", { text: t("From") }), time(quiet.from, (v) => setQuiet((q) => (q.from = v)))),
      h("label", {}, h("span", { text: t("Until") }), time(quiet.to, (v) => setQuiet((q) => (q.to = v)))),
    ),
    h("div", { class: "hub-note", text: t("During these hours NEO keeps your notifications without opening the island or making a sound.") }),
  );

  const apps = h("div", { class: "react-list" });
  const set = (appId: string, part: keyof NotificationReaction, value: string) =>
    ctx.changeSettings((s) => {
      const own = s.notificationReactions[appId] ?? { sound: "", emote: "", outfit: "" };
      s.notificationReactions = { ...s.notificationReactions, [appId]: { ...own, [part]: value } };
    });
  const sounds: [string, string][] = [["", t("Default")], ["none", t("No sound")], ...SOUND_NAMES.map((n): [string, string] => [n, n])];
  const emotes: [string, string][] = [["", t("Default")], ["none", t("None")], ...REACTION_EMOTES.map((e): [string, string] => [e, EMOTE_LABELS[e]()])];
  const outfits: [string, string][] = [
    ["", t("As usual")],
    ...OUTFIT_SELECTIONS.filter((o) => o !== "auto").map((o): [string, string] => [o, t(OUTFIT_KEYS[o])]),
  ];
  void Bridge.systemNotificationApps().then((list) => {
    if (!list?.length) {
      apps.append(h("div", { class: "hub-note", text: t("No app has shown a notification yet.") }));
      return;
    }
    for (const app of list) {
      const own = ctx.settings().notificationReactions[app.id] ?? { sound: "", emote: "", outfit: "" };
      const field = (label: string, el: HTMLElement) => h("label", { class: "react-field" }, h("span", { text: label }), el);
      apps.append(h("div", { class: "react-row" },
        h("span", { class: "home-badge", text: app.name.slice(0, 1).toUpperCase() }),
        h("span", { class: "react-name home-title", text: app.name, title: app.id }),
        button(t("Try"), () => void emitToWindow("island", NOTIFICATION_TRY, {
          id: -Date.now(), appId: app.id, app: app.name, title: t("This is how NEO reacts"), body: app.name, arrival: Date.now() / 1000,
        }), "", true),
        h("div", { class: "react-fields" },
          field(t("Sound"), select(sounds, own.sound, (v) => set(app.id, "sound", v))),
          field(t("Gesture"), select(emotes, own.emote, (v) => set(app.id, "emote", v))),
          field(t("Outfit"), select(outfits, own.outfit, (v) => set(app.id, "outfit", v))),
        ),
      ));
    }
  });

  return h("div", { class: "react" },
    quietCard,
    h("div", { class: "hub-card" },
      h("h2", { class: "look-title", text: t("Reactions") }),
      h("div", { class: "hub-note", text: t("Each app can have its own sound, gesture and outfit. Try shows it in the island.") }),
      apps,
    ),
  );
}

export async function notificationsPage(page: HTMLElement, ctx: HubContext) {
  let toasts: SystemToast[] = [];
  let query = "";
  let app: string | null = null;
  const search = h("input", { class: "hub-input", type: "search", placeholder: t("Search notifications"), "aria-label": t("Search notifications") }) as HTMLInputElement;
  const chips = h("div", { class: "hub-chips" });
  const list = h("div", { class: "notif-days" });
  const redrawChips = drawWhenChanged(chips);
  const redrawList = drawWhenChanged(list);

  function draw() {
    if (!ctx.settings().systemNotifications) {
      redrawChips("off", () => {});
      redrawList("off", () => list.append(
        h("div", { class: "hub-note", text: t("Turn this on and your Windows notifications reach NEO.") }),
        button(t("Turn on"), () => {
          ctx.changeSettings((s) => (s.systemNotifications = true));
          void refresh();
        }, "primary", true),
      ));
      return;
    }
    const apps = [...new Map(toasts.map((toast) => [toast.appId, toast.app])).entries()];
    if (app && !apps.some(([id]) => id === app)) app = null;
    redrawChips([apps, app], () => {
      if (apps.length < 2) return;
      const chip = (id: string | null, name: string) => h("button", {
        class: id === app ? "hub-chip on" : "hub-chip",
        "aria-pressed": String(id === app),
        text: name,
        onclick: () => {
          app = id;
          draw();
        },
      });
      chips.append(chip(null, t("All")), ...apps.map(([id, name]) => chip(id, name)));
    });
    const shown = filterToasts(toasts, query, app);
    redrawList([shown, query, toasts.length], () => {
      if (!toasts.length) {
        list.append(emptyState(t("No notifications yet."), "sleeping"));
        return;
      }
      if (!shown.length) {
        list.append(h("div", { class: "hub-note", text: t("Nothing matches your search.") }));
        return;
      }
      const now = Date.now() / 1000;
      let day = "";
      let group: HTMLElement | null = null;
      for (const toast of shown) {
        const next = dayOf(toast.arrival, now);
        if (!group || next !== day) {
          day = next;
          group = h("div", { class: "home-list" });
          list.append(h("div", { class: "notif-day" }, h("div", { class: "hub-label", text: dayTitle(day) }), group));
        }
        group.append(toastRow(toast));
      }
    });
  }

  async function refresh() {
    if (ctx.settings().systemNotifications) toasts = (await Bridge.recentSystemNotifications(HOW_MANY)) ?? [];
    draw();
  }

  search.addEventListener("input", () => {
    query = search.value;
    draw();
  });
  const tools = h("div", { class: "notif-tools" }, search, chips);
  let reactions: HTMLElement | null = null;
  const tabs = segmented<"latest" | "reactions">([["latest", t("Latest")], ["reactions", t("Reactions")]], "latest", (tab) => {
    reactions ??= page.appendChild(reactionsPanel(ctx));
    reactions.hidden = tab !== "reactions";
    tools.hidden = list.hidden = tab === "reactions";
  });
  page.append(ctx.hero("notifications", t("Notifications"), t("What your apps told you, all in one place."), [tabs]), tools, list);
  clear(list);
  await refresh();
  const timer = window.setInterval(() => {
    if (isWindowShown()) void refresh();
  }, REFRESH_MS);
  ctx.onLeave = () => window.clearInterval(timer);
}
