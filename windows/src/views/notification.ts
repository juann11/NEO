// La tarjeta de una notificación de Windows: la app, el título y el texto, con NEO a la izquierda.
// ‹ › recorren las 10 últimas, "Abrir" abre la app que la mandó y OK cierra la isla
// (que también se cierra sola, como siempre, al sacar el ratón).

import { h, svg } from "./dom";
import { ICONS } from "./icons";
import { washRGBA } from "../core/layout";
import { Bridge } from "../core/bridge";
import { SystemNotifications } from "../island/system-notifications";
import type { ViewHost } from "./views";
import { t, tl } from "../i18n/i18n";

export function buildNotification(onClose: () => void): ViewHost {
  const app = h("div", { class: "sub one-line" });
  const title = h("div", { class: "title one-line" });
  const body = h("div", { class: "sub update-line" });
  const counter = h("span", { class: "sub" });
  const older = h("button", { class: "btn secondary", title: tl("Previous"), onclick: () => { SystemNotifications.older(); sync(); } }, svg(ICONS.chevronLeft, 12)) as HTMLButtonElement;
  const newer = h("button", { class: "btn secondary", title: tl("Next"), onclick: () => { SystemNotifications.newer(); sync(); } }, svg(ICONS.chevronRight, 12)) as HTMLButtonElement;
  const open = h("button", {
    class: "btn primary",
    onclick: () => {
      const toast = SystemNotifications.current;
      if (toast) void Bridge.openNotificationApp(toast.appId);
    },
  }, h("span", { text: t("Open") }));
  const ok = h("button", { class: "btn secondary", onclick: onClose }, h("span", { text: t("OK") }));
  const nav = h("span", { style: "display:inline-flex;align-items:center;gap:6px" }, older, counter, newer);
  const stack = h("div", { class: "stack" }, app, title, body, h("div", { class: "actions" }, nav, open, ok));
  stack.style.padding = "4px 16px 4px 116px";
  const card = h("div", { class: "card wash" }, stack);
  card.style.setProperty("--wash", washRGBA("cyan"));

  function sync() {
    const toast = SystemNotifications.current;
    const total = SystemNotifications.history.length;
    app.textContent = toast?.app ?? "";
    title.textContent = toast?.title ?? "";
    title.title = toast?.title ?? "";
    body.textContent = toast?.body ?? "";
    body.style.display = toast?.body ? "" : "none";
    counter.textContent = total ? `${SystemNotifications.index + 1}/${total}` : "";
    nav.style.display = total > 1 ? "inline-flex" : "none";
    older.disabled = SystemNotifications.index >= total - 1;
    newer.disabled = SystemNotifications.index === 0;
  }

  return { el: h("div", { class: "view" }, card), sync };
}
