// La tarjeta de una notificación de Windows: la app, el título y el texto, con NEO a la izquierda.
// Se cierra con OK o sola, como cualquier isla abierta, al sacar el ratón.

import { h } from "./dom";
import { washRGBA } from "../core/layout";
import { SystemNotifications } from "../island/system-notifications";
import type { ViewHost } from "./views";
import { t } from "../i18n/i18n";

export function buildNotification(onClose: () => void): ViewHost {
  const app = h("div", { class: "sub one-line" });
  const title = h("div", { class: "title one-line" });
  const body = h("div", { class: "sub update-line" });
  const ok = h("button", { class: "btn secondary", onclick: onClose }, h("span", { text: t("OK") }));
  const stack = h("div", { class: "stack" }, app, title, body, h("div", { class: "actions" }, ok));
  stack.style.padding = "4px 16px 4px 116px";
  const card = h("div", { class: "card wash" }, stack);
  card.style.setProperty("--wash", washRGBA("cyan"));

  return {
    el: h("div", { class: "view" }, card),
    sync() {
      const toast = SystemNotifications.current;
      app.textContent = toast?.app ?? "";
      title.textContent = toast?.title ?? "";
      title.title = toast?.title ?? "";
      body.textContent = toast?.body ?? "";
      body.style.display = toast?.body ? "" : "none";
    },
  };
}
