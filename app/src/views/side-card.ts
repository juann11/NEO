// La tarjeta de la derecha de la isla abierta, de doble cara: delante las notificaciones
// recientes (y "Mientras no estabas" al volver), detrás los proyectos recientes como
// carpetas holograma. Se le da la vuelta con su botón.

import { h, svg, clear } from "./dom";
import { ICONS } from "./icons";
import { Bridge } from "../core/bridge";
import { State } from "../core/state";
import { ago } from "../core/home-feed";
import { projectName } from "../core/projects";
import { SystemNotifications } from "../island/system-notifications";
import { t, tl } from "../i18n/i18n";
import type { ViewHost } from "./views";

const SHOWN_TOASTS = 3;
const SHOWN_PROJECTS = 4;

function agoShort(arrival: number): string {
  const when = ago(arrival, Date.now() / 1000);
  if (!when) return "";
  const text = {
    now: () => t("Just now"),
    min: () => t("{0} min", { 0: when.n }),
    h: () => t("{0} h", { 0: when.n }),
    d: () => t("{0} d", { 0: when.n }),
  };
  return text[when.unit]();
}

function minutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? t("{0} h", { 0: Math.round(m / 60) }) : t("{0} min", { 0: m });
}

/** La carpeta holograma: un SVG con brillo y líneas de escaneo (side-card en style.css). */
function hologram(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, "svg");
  el.setAttribute("viewBox", "0 0 48 40");
  el.setAttribute("class", "holo-folder");
  el.innerHTML = `
    <defs>
      <linearGradient id="holo-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#67E8F9" stop-opacity="0.42"/>
        <stop offset="1" stop-color="#4ADE80" stop-opacity="0.08"/>
      </linearGradient>
      <linearGradient id="holo-beam" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#22D3EE" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#22D3EE" stop-opacity="0"/>
      </linearGradient>
      <pattern id="holo-scan" width="4" height="2.4" patternUnits="userSpaceOnUse">
        <rect width="4" height="0.8" fill="#E0FFFF" fill-opacity="0.3"/>
      </pattern>
    </defs>
    <path d="M17 38 L8 15 H40 L31 38 Z" fill="url(#holo-beam)"/>
    <ellipse cx="24" cy="38" rx="9" ry="1.8" fill="#A5F3FC" fill-opacity="0.9"/>
    <g class="holo-body">
      <path d="M7 6.5a2.5 2.5 0 0 1 2.5-2.5h8.5l3.5 3.5h17a2.5 2.5 0 0 1 2.5 2.5v16a2.5 2.5 0 0 1-2.5 2.5h-29A2.5 2.5 0 0 1 7 26z" fill="url(#holo-fill)" stroke="#A5F3FC" stroke-width="1.1"/>
      <path d="M7 11h34v15a2.5 2.5 0 0 1-2.5 2.5h-29A2.5 2.5 0 0 1 7 26z" fill="url(#holo-scan)"/>
      <path d="M7.6 11.2H40.4" stroke="#ECFEFF" stroke-opacity="0.9" stroke-width="0.8"/>
    </g>`;
  return el;
}

export function buildSideCard(): ViewHost {
  let back = false;
  let shownKey = "";
  const front = h("div", { class: "side-face side-front" });
  const rear = h("div", { class: "side-face side-back" });
  const flip = h("button", {
    class: "icon-btn side-flip",
    title: tl("Flip"),
    "aria-label": tl("Flip"),
    onclick: () => {
      back = !back;
      el.classList.toggle("flipped", back);
      shownKey = "";
      sync();
    },
  }, svg(ICONS.arrowClockwise, 10, { stroke: 2.2 }));
  const el = h("div", { class: "side-card" }, h("div", { class: "side-inner" }, front, rear), flip);

  const title = (text: string) => h("div", { class: "side-title", text });

  function drawFront() {
    clear(front);
    const away = State.awayReport;
    if (away) {
      const s = away.summary;
      const lines: string[] = [];
      if (s.notifications) lines.push(t("Notifications from {0}", { 0: s.apps.map((a) => (a.count > 1 ? `${a.app} ×${a.count}` : a.app)).join(", ") }));
      for (const name of s.waiting) lines.push(t("{0} is waiting for you", { 0: name }));
      for (const name of s.finished) lines.push(t("{0} finished", { 0: name }));
      for (const name of s.failed) lines.push(t("{0} hit an error", { 0: name }));
      front.append(
        h("div", { class: "side-title away" },
          h("span", { text: t("While you were away · {0}", { 0: minutes(away.seconds) }) }),
          h("button", { class: "icon-btn", title: tl("Close"), "aria-label": tl("Close"), onclick: () => {
            State.awayReport = null;
            State.notify();
          } }, svg(ICONS.xmark, 7)),
        ),
        ...lines.slice(0, 4).map((line) => h("div", { class: "away-line", text: line })),
      );
      return;
    }
    front.append(title(t("Notifications")));
    const toasts = SystemNotifications.history.slice(0, SHOWN_TOASTS);
    if (!toasts.length) {
      front.append(h("div", { class: "side-empty", text: State.settings.systemNotifications ? t("No notifications yet.") : t("Turn on Windows notifications in NEO's window.") }));
      return;
    }
    for (const toast of toasts) {
      front.append(h("button", { class: "side-row", title: toast.body || toast.title, onclick: () => void Bridge.openNotificationApp(toast.appId) },
        h("span", { class: "side-badge", text: toast.app.slice(0, 1).toUpperCase() }),
        h("span", { class: "side-text" }, h("b", { text: toast.title }), h("span", { text: toast.app })),
        h("span", { class: "side-ago", text: agoShort(toast.arrival) }),
      ));
    }
  }

  function drawBack() {
    clear(rear);
    rear.append(title(t("Recent projects")));
    const projects = State.settings.recentProjects.slice(0, SHOWN_PROJECTS);
    if (!projects.length) {
      rear.append(h("div", { class: "side-empty", text: t("Projects your agents work in show up here.") }));
      return;
    }
    const grid = h("div", { class: "holo-grid" });
    for (const path of projects) {
      const name = projectName(path);
      grid.append(h("div", { class: "holo-item" },
        h("button", { class: "holo-open", title: path, "aria-label": t("Open {0}", { 0: name }), onclick: () => void Bridge.openProject(path) },
          hologram(), h("span", { text: name })),
        h("button", { class: "icon-btn holo-term", title: tl("Open in terminal"), "aria-label": tl("Open in terminal"), onclick: () => void Bridge.openProjectTerminal(path) },
          svg(ICONS.terminal, 10, { stroke: 2 })),
      ));
    }
    rear.append(grid);
  }

  function sync() {
    // Un resumen al volver siempre se ve: la tarjeta gira al frente.
    if (back && State.awayReport) {
      back = false;
      el.classList.remove("flipped");
    }
    const key = back
      ? `b|${State.settings.recentProjects.join("|")}`
      : `f|${JSON.stringify(State.awayReport)}|${State.settings.systemNotifications}|${SystemNotifications.history.slice(0, SHOWN_TOASTS).map((x) => `${x.id}:${agoShort(x.arrival)}`).join("|")}`;
    if (key === shownKey) return;
    shownKey = key;
    if (back) drawBack();
    else drawFront();
  }

  return { el, sync };
}
