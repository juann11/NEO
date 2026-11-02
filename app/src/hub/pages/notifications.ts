// Notificaciones: las que Windows guarda, con buscador, filtro por app y agrupadas por día.
// Salen de la base de Windows (system_notifications.rs): NEO no guarda copia.

import { h, clear } from "../../views/dom";
import { language, t } from "../../i18n/i18n";
import { Bridge } from "../../core/bridge";
import { dayOf, filterToasts } from "../../core/home-feed";
import type { SystemToast } from "../../island/system-notifications";
import type { HubContext } from "../shell";
import { emptyState, isWindowShown } from "../hero";
import { button } from "../ui";
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
  page.append(
    ctx.hero("notifications", t("Notifications"), t("What your apps told you, all in one place.")),
    h("div", { class: "notif-tools" }, search, chips),
    list,
  );
  clear(list);
  await refresh();
  const timer = window.setInterval(() => {
    if (isWindowShown()) void refresh();
  }, REFRESH_MS);
  ctx.onLeave = () => window.clearInterval(timer);
}
