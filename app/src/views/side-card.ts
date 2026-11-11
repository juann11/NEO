// La tarjeta de la derecha de la isla abierta, de doble cara: delante las notificaciones
// recientes (y "Mientras no estabas" al volver), detrás los proyectos recientes como
// carpetas holograma. Se le da la vuelta con su botón.

import { h, svg, clear } from "./dom";
import { ICONS } from "./icons";
import { Bridge } from "../core/bridge";
import { State } from "../core/state";
import { ago } from "../core/home-feed";
import { addProject, projectName, removeProject } from "../core/projects";
import { SystemNotifications, type SystemToast } from "../island/system-notifications";
import { swipeOutcome } from "../core/swipe";
import { t, tl } from "../i18n/i18n";
import type { ViewHost } from "./views";

/** El color de una app sin logo: siempre el mismo para la misma app. */
const FALLBACK_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316", "#64748B"];

function fallbackColor(appId: string): string {
  let n = 0;
  for (const ch of appId) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[n % FALLBACK_COLORS.length];
}

/** Logos ya pedidos a Windows, por app, mientras la isla está abierta. */
const appIcons = new Map<string, Promise<{ canvas: HTMLCanvasElement; color: string } | null>>();

function appIcon(appId: string) {
  let icon = appIcons.get(appId);
  if (!icon) {
    icon = Bridge.notificationAppIcon(appId).then((found) => {
      const ctx = found && document.createElement("canvas").getContext("2d");
      if (!found || !ctx) return null;
      ctx.canvas.width = ctx.canvas.height = found.size;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(found.rgba), found.size, found.size), 0, 0);
      return { canvas: ctx.canvas, color: found.color };
    });
    appIcons.set(appId, icon);
  }
  return icon;
}

/** La insignia de la fila: la inicial con su color y, cuando llega, el logo y el color de la app. */
function badge(toast: SystemToast, row: HTMLElement): HTMLElement {
  const el = h("span", { class: "side-badge", text: toast.app.slice(0, 1).toUpperCase() });
  row.style.setProperty("--app", fallbackColor(toast.appId));
  void appIcon(toast.appId).then((icon) => {
    if (!icon) return;
    const img = h("img", { src: icon.canvas.toDataURL(), alt: "" });
    el.replaceChildren(img);
    el.classList.add("logo");
    row.style.setProperty("--app", icon.color);
  });
  return el;
}

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
    const toasts = SystemNotifications.history;
    front.append(toasts.length ? h("div", { class: "side-title" }, h("span", { text: t("Notifications") }), clearAll()) : title(t("Notifications")));
    if (!toasts.length) {
      front.append(h("div", { class: "side-empty", text: State.settings.systemNotifications ? t("No notifications right now.") : t("Turn on Windows notifications in NEO's window.") }));
      return;
    }
    // Caben 3; el resto, con la rueda del ratón.
    front.append(h("div", { class: "side-list" }, ...toasts.map(swipeRow)));
  }

  /** Una notificación que se arrastra: a la derecha se abre (verde), a la izquierda se elimina (rojo). */
  function swipeRow(toast: SystemToast): HTMLElement {
    const remove = () => {
      SystemNotifications.forget(toast.id);
      shownKey = "";
      State.notify();
    };
    // Abierta ya está vista: también sale de la lista.
    const open = () => {
      void Bridge.openNotificationApp(toast.appId);
      remove();
    };
    const row = h("button", { class: "side-row", title: toast.body || toast.title, "aria-keyshortcuts": "Delete" },
      h("span", { class: "side-text" }, h("b", { text: toast.title }), h("span", { text: toast.app })),
      h("span", { class: "side-ago", text: agoShort(toast.arrival) }),
    );
    row.prepend(badge(toast, row));
    const wrap = h("div", { class: "swipe" },
      h("div", { class: "swipe-bg" },
        h("span", { class: "swipe-open" }, svg(ICONS.arrowUpRight, 9), h("span", { text: t("Open") })),
        h("span", { class: "swipe-del" }, h("span", { text: t("Delete") }), svg(ICONS.trash, 10, { stroke: 2 })),
      ),
      row,
    );
    let startX: number | null = null;
    let dx = 0;
    row.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      dx = 0;
      row.setPointerCapture(e.pointerId);
      wrap.classList.add("dragging");
    });
    row.addEventListener("pointermove", (e) => {
      if (startX == null) return;
      dx = e.clientX - startX;
      row.style.transform = `translateX(${dx}px)`;
      wrap.classList.toggle("to-open", dx > 0);
      wrap.classList.toggle("to-del", dx < 0);
      wrap.classList.toggle("armed", swipeOutcome(dx, wrap.clientWidth) != null);
    });
    const release = () => {
      if (startX == null) return;
      startX = null;
      wrap.classList.remove("dragging");
      const outcome = swipeOutcome(dx, wrap.clientWidth);
      if (outcome) {
        // Sale por su lado y luego actúa.
        row.style.transform = `translateX(${dx > 0 ? "" : "-"}110%)`;
        window.setTimeout(outcome === "open" ? open : remove, 180);
      } else {
        row.style.transform = "";
        wrap.classList.remove("to-open", "to-del", "armed");
      }
    };
    row.addEventListener("pointerup", release);
    row.addEventListener("pointercancel", release);
    // Un clic sin arrastrar también abre; tras un arrastre, no.
    row.addEventListener("click", () => {
      if (Math.abs(dx) < 4) open();
    });
    row.addEventListener("keydown", (e) => {
      if (e.key === "Delete") remove();
    });
    return wrap;
  }

  /** La papelera: el primer clic pregunta, el segundo borra todas; sin segundo clic en 3 s, vuelve. */
  function clearAll(): HTMLElement {
    let timer: number | null = null;
    const bin = h("button", { class: "icon-btn side-clear", title: tl("Delete all"), "aria-label": tl("Delete all") }, svg(ICONS.trash, 10, { stroke: 2 }));
    bin.addEventListener("click", () => {
      if (timer == null) {
        bin.classList.add("confirm");
        bin.replaceChildren(h("span", { text: t("Delete all?") }));
        timer = window.setTimeout(() => {
          timer = null;
          bin.classList.remove("confirm");
          bin.replaceChildren(svg(ICONS.trash, 10, { stroke: 2 }));
        }, 3000);
        return;
      }
      window.clearTimeout(timer);
      SystemNotifications.forgetAll();
      shownKey = "";
      State.notify();
    });
    return bin;
  }

  /** Cambia la lista de proyectos, la guarda y redibuja. */
  function setProjects(next: string[]) {
    State.settings.myProjects = next;
    void Bridge.saveSettings(State.settings);
    shownKey = "";
    State.notify();
  }

  function drawBack() {
    clear(rear);
    rear.append(title(t("Projects")));
    const grid = h("div", { class: "holo-grid" });
    for (const path of State.settings.myProjects) {
      const name = projectName(path);
      grid.append(h("div", { class: "holo-item" },
        h("button", { class: "holo-open", title: path, "aria-label": t("Open {0}", { 0: name }), onclick: () => void Bridge.openProject(path) },
          hologram(), h("span", { text: name })),
        h("button", { class: "icon-btn holo-term", title: tl("Open in terminal"), "aria-label": tl("Open in terminal"), onclick: () => void Bridge.openProjectTerminal(path) },
          svg(ICONS.terminal, 10, { stroke: 2 })),
        h("button", { class: "icon-btn holo-remove", title: tl("Remove"), "aria-label": t("Remove {0}", { 0: name }), onclick: () => setProjects(removeProject(State.settings.myProjects, path)) },
          svg(ICONS.xmark, 7)),
      ));
    }
    grid.append(h("button", {
      class: "holo-add",
      title: tl("Add a project"),
      "aria-label": tl("Add a project"),
      onclick: async () => {
        const folder = await Bridge.pickFolder();
        if (folder) setProjects(addProject(State.settings.myProjects, folder));
      },
    }, svg(ICONS.plus, 14), h("span", { text: t("Add") })));
    rear.append(grid);
  }

  function sync() {
    // Un resumen al volver siempre se ve: la tarjeta gira al frente.
    if (back && State.awayReport) {
      back = false;
      el.classList.remove("flipped");
    }
    const key = back
      ? `b|${State.settings.myProjects.join("|")}`
      : `f|${JSON.stringify(State.awayReport)}|${State.settings.systemNotifications}|${SystemNotifications.history.map((x) => `${x.id}:${agoShort(x.arrival)}`).join("|")}`;
    if (key === shownKey) return;
    shownKey = key;
    if (back) drawBack();
    else drawFront();
  }

  return { el, sync };
}
