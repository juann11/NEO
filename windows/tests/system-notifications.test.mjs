// Notificaciones de Windows en la isla (src/island/system-notifications.ts, src/views/notification.ts):
// cada toast que Rust manda abre la isla con su tarjeta, salvo en pausa o con un permiso esperando.
// La isla guarda las 10 últimas: la tarjeta las recorre con ‹ › y "Abrir" abre la app de la que se ve.

import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { emit, sent } from "./tauri.mjs";
import { installFakeDom } from "./fakedom.mjs";

installFakeDom();

const { SystemNotifications, registerSystemNotifications } = await import("../src/island/system-notifications.ts");
const { buildNotification } = await import("../src/views/notification.ts");
const { State } = await import("../src/core/state.ts");

const host = { alerts: [], emotes: [], alert(view) { this.alerts.push(view); }, emote(name) { this.emotes.push(name); } };
registerSystemNotifications(host);

const toast = (id, title = `Mensaje ${id}`) => ({ id, appId: "5319275A.WhatsAppDesktop_x!App", app: "WhatsApp", title, body: "¿Vienes hoy?" });

beforeEach(() => {
  host.alerts = [];
  host.emotes = [];
  State.paused = false;
  State.pendingApproval = null;
  SystemNotifications.history = [];
  SystemNotifications.index = 0;
});

const all = (node) => [node, ...node.children.flatMap(all)];
const button = (view, title) => all(view.el).find((n) => n.tagName === "BUTTON" && (n.getAttribute("title") === title || n.textContent === title));

test("a Windows notification opens the island on its card", () => {
  emit("system-notification", toast(1, "Ana"));
  assert.deepEqual(host.alerts, ["notification"]);
  assert.equal(SystemNotifications.current.title, "Ana");
});

test("paused, NEO keeps quiet", () => {
  State.paused = true;
  emit("system-notification", toast(1));
  assert.deepEqual(host.alerts, []);
  assert.equal(SystemNotifications.current, null);
});

test("a permission waiting for an answer keeps the island", () => {
  State.pendingApproval = { id: "x" };
  emit("system-notification", toast(1));
  assert.deepEqual(host.alerts, []);
});

test("the island keeps the 10 newest, newest first", () => {
  for (let i = 1; i <= 12; i++) emit("system-notification", toast(i));
  assert.deepEqual(SystemNotifications.history.map((t) => t.id), [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
  assert.equal(SystemNotifications.current.id, 12);
});

test("the card shows the app, the title, the text and where you are", () => {
  emit("system-notification", toast(1, "Ana"));
  emit("system-notification", toast(2, "Luis"));
  const view = buildNotification(() => {});
  view.sync();
  for (const part of ["WhatsApp", "Luis", "¿Vienes hoy?", "1/2"]) assert.ok(view.el.textContent.includes(part), part);
});

test("the arrows walk the history and stop at both ends", () => {
  for (let i = 1; i <= 3; i++) emit("system-notification", toast(i));
  const view = buildNotification(() => {});
  view.sync();
  const older = button(view, "Previous");
  const newer = button(view, "Next");
  assert.equal(newer.disabled, true, "ya estás en la más nueva");
  older.fire("click");
  assert.equal(SystemNotifications.current.id, 2);
  assert.ok(view.el.textContent.includes("2/3"));
  older.fire("click");
  assert.equal(older.disabled, true, "ya estás en la más vieja");
  newer.fire("click");
  assert.equal(SystemNotifications.current.id, 2);
});

test("Open asks Rust to open the app of the notification you are looking at", () => {
  emit("system-notification", { ...toast(1), appId: "MSTeams_8wekyb3d8bbwe!MSTeams", app: "Teams" });
  emit("system-notification", toast(2));
  const view = buildNotification(() => {});
  view.sync();
  button(view, "Previous").fire("click");
  button(view, "Open").fire("click");
  assert.deepEqual(sent("open_notification_app").at(-1), { appId: "MSTeams_8wekyb3d8bbwe!MSTeams" });
});
